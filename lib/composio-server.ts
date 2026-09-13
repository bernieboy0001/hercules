// Server only. Like `lib/connections-server.ts` (the `server-only` package is not installed in this
// workspace, so this comment is the guard): imported only by API routes and `lib/`, never from a
// Client Component or a browser bundle — and, unlike `connectors/`, never from a node or step file,
// so it is free to grow Node-shaped helpers without worrying about the Workflow SDK bundler.
//
// This is the v3.1 REST surface the connect flow needs (REST, not `@composio/core` — hard rule 5b:
// no provider SDK inside this app). Credentials are `x-api-key` only and a composio project key
// travels in that header; nothing in here may log or return a secret (CLAUDE.md rule 1).
//
// Docs for the exact endpoint shapes: `docs/superpowers/plans/2026-09-13-composio-connections.md`
// (the "Risks / decisions" note about identity verification is closed here by `completeLink`
// passing the org id Composio binds the session to — see `app/api/connections/composio/callback`).
import { composioRequest, ComposioHttpError } from "@/connectors/composio";
import type { PickerOption } from "@/connectors/define";

/**
 * One authenticated auth config for a toolkit — what a link session is created for.
 *
 * `POST /connected_accounts/link` addresses a toolkit by `auth_config_id`, not by slug, so the link
 * route resolves the slug the user picked to the Composio-managed auth config that owns it. Null
 * when the project key has no auth config for that toolkit (a very new app, a disabled one).
 */
export type ComposioAuthConfig = { id: string; name: string };

/** A connected account as the engine addresses it. Only ids, labels and status — never a secret. */
export type ComposioConnectedAccount = {
  id: string;
  toolkit: string;
  status: string;
};

/** HTTP-shaped failure the routes can turn into a JSON response; compatible with `ConnectionRequestError`. */
export class ComposioRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly error: string,
  ) {
    super(error);
    this.name = "ComposioRequestError";
  }
}

/** Maps a thrown `ComposioHttpError` (or anything else) onto `{ status, body }` for the routes. */
export function composioErrorResponse(cause: unknown): {
  status: number;
  body: { code: string; error: string };
} {
  if (cause instanceof ComposioHttpError) {
    const message =
      cause.status === 401
        ? "Composio rejected the project API key (401). Re-test the Composio connection."
        : cause.status === 404
          ? "Composio does not know that toolkit. Pick another app and try again."
          : `Composio returned HTTP ${cause.status}. Try again in a moment.`;
    const code =
      cause.status === 401 ? "invalid_key" : cause.status === 404 ? "not_found" : "composio_error";
    return { status: cause.status >= 500 ? cause.status : 502, body: { code, error: message } };
  }

  console.error("composio: unexpected failure", cause);
  return {
    status: 500,
    body: { code: "internal_error", error: "Something went wrong. Please try again." },
  };
}

/** The rows of a list response (`{ items }`), defensively reduced to objects. */
function items(value: unknown): Record<string, unknown>[] {
  const rows = (value as { items?: unknown } | null)?.items;
  return Array.isArray(rows)
    ? (rows.filter((row) => typeof row === "object" && row !== null) as Record<string, unknown>[])
    : [];
}

/**
 * The Composio-managed auth config for one toolkit (its name is the account row's label), or null.
 *
 * `is_composio_managed=true` keeps this to the toolkits Composio signs users in for — the ones the
 * hosted Connect Link handles — rather than any custom API-key auth config the org may one day add.
 */
export async function authConfigForToolkit(
  apiKey: string,
  toolkit: string,
): Promise<ComposioAuthConfig | null> {
  const query = new URLSearchParams({ toolkit_slug: toolkit, is_composio_managed: "true" });
  const body = await composioRequest(apiKey, `/auth_configs?${query}`);

  for (const config of items(body)) {
    const id = typeof config.id === "string" ? config.id : "";
    if (!id) continue;
    const name = typeof config.name === "string" ? config.name : toolkit;
    return { id, name };
  }
  return null;
}

/**
 * Creates the auth-link session the browser is pointed at.
 *
 * Composio hosts the sign-in page; the credentials the user enters there never pass through this
 * app. On success Composio redirects the browser to `callbackUrl` with `?session_uri=…`, which is
 * where `completeLink` takes over. The returned `openUrl` is the page to open in a new tab.
 */
export async function createLinkSession(args: {
  apiKey: string;
  orgId: string;
  toolkit: string;
  callbackUrl: string;
}): Promise<{ openUrl: string }> {
  const config = await authConfigForToolkit(args.apiKey, args.toolkit);
  if (!config) {
    throw new ComposioRequestError(
      404,
      "not_found",
      `Composio has no sign-in for ${args.toolkit}. Pick another app.`,
    );
  }

  const body = await composioRequest(args.apiKey, "/connected_accounts/link", {
    method: "POST",
    body: { auth_config_id: config.id, user_id: args.orgId, callback_url: args.callbackUrl },
  });

  const openUrl = typeof (body as { redirect_url?: unknown }).redirect_url === "string"
    ? (body as { redirect_url: string }).redirect_url
    : "";
  if (!openUrl) throw new ComposioRequestError(502, "composio_error", "Composio gave no sign-in URL.");
  return { openUrl };
}

/**
 * Redeems the single-use `session_uri` a completed Connect Link handed the callback.
 *
 * Composio validates that *this* project key owns the pending connection and that `user_id` matches
 * the connection's owner, so a callback hijacker who cannot also present a signed-in session for the
 * org cannot finish somebody else's flow. Returns the now-active connected account.
 */
export async function completeLink(args: {
  apiKey: string;
  sessionUri: string;
  orgId: string;
}): Promise<ComposioConnectedAccount> {
  const body = await composioRequest(args.apiKey, "/connected_accounts/complete_auth", {
    method: "POST",
    body: { session_uri: args.sessionUri, user_id: args.orgId },
  });

  const account = body as Record<string, unknown>;
  const id = typeof account.id === "string" ? account.id : "";
  const toolkit = typeof account.toolkit === "object" && account.toolkit !== null
    ? (account.toolkit as { slug?: unknown }).slug
    : undefined;
  if (!id || typeof toolkit !== "string") {
    throw new ComposioRequestError(502, "composio_error", "Composio did not confirm the connection.");
  }
  const status = typeof account.status === "string" ? account.status : "ACTIVE";
  return { id, toolkit, status };
}

/**
 * The connected accounts one org has for one toolkit — what the callback falls back to if
 * `completeLink` agrees but does not echo the toolkit's slug.
 */
export async function listAccounts(args: {
  apiKey: string;
  orgId: string;
  toolkit: string;
}): Promise<ComposioConnectedAccount[]> {
  const query = new URLSearchParams();
  query.append("user_ids", args.orgId);
  query.append("toolkit_slugs", args.toolkit);
  const body = await composioRequest(args.apiKey, `/connected_accounts?${query}`);

  const accounts: ComposioConnectedAccount[] = [];
  for (const row of items(body)) {
    const id = typeof row.id === "string" ? row.id : "";
    const slug =
      typeof row.toolkit === "object" && row.toolkit !== null
        ? (row.toolkit as { slug?: unknown }).slug
        : undefined;
    if (!id || typeof slug !== "string") continue;
    accounts.push({ id, toolkit: slug, status: typeof row.status === "string" ? row.status : "" });
  }
  return accounts;
}

/** Revokes a connected account at the provider. Called before the row is deleted. */
export async function revokeAccount(apiKey: string, accountId: string): Promise<void> {
  await composioRequest(apiKey, `/connected_accounts/${encodeURIComponent(accountId)}/revoke`, {
    method: "POST",
  });
}

/**
 * A toolkit's tools, as picker options — what the composeio node's `tool` field offers.
 *
 * Captured at connect time and sealed away on the account row's `meta` (hard rule 11), so a later
 * workflow config never needs Composio reachable; this is the one call that fills that capture.
 */
export async function fetchTools(apiKey: string, toolkit: string): Promise<PickerOption[]> {
  const query = new URLSearchParams({ toolkit_slug: toolkit });
  const body = await composioRequest(apiKey, `/tools?${query}`);

  const seen = new Set<string>();
  const tools: PickerOption[] = [];
  for (const row of items(body)) {
    const slug = typeof row.slug === "string" ? row.slug : "";
    const name = typeof row.name === "string" ? row.name : slug;
    if (!slug || seen.has(slug) || row.is_deprecated === true) continue;
    seen.add(slug);
    tools.push({ id: slug, label: name });
  }
  // Code-unit order: tool slugs are ASCII, and the dropdown should not depend on ICU.
  return tools.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}