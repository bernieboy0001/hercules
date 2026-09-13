// Composio is the connection layer for the long tail of apps (docs/superpowers/plans/
// 2026-09-13-composio-connections.md). Users bring their own project API key, exactly like an AI
// key; the installed apps made from it are *account* rows (kind `"composio"`) that carry no
// third-party secret of their own. This file is the key connector, shared with Convex, routes and
// the `"use step"` bundle — so, like every `connectors/` file, it is plain `fetch` and Web APIs
// only, and it must stay safe for the Workflow SDK bundler (CLAUDE.md hard rule 4).
import { defineConnector, type PickerOption } from "./define";

/** Composio v3.1 base URL. Everything in this phase talks to `/api/v3.1` (docs: v3 wording). */
export const COMPOSIO_BASE_URL = "https://backend.composio.dev/api/v3.1";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "hercules/0.1";

/** A non-2xx answer from Composio: its own words when it gave any, a bare status otherwise. */
export class ComposioHttpError extends Error {
  constructor(
    readonly status: number,
    detail?: string,
  ) {
    super(detail ? `Composio returned HTTP ${status}: ${detail}` : `Composio returned HTTP ${status}`);
    this.name = "ComposioHttpError";
  }
}

/** The message out of a Composio error body, whatever shape it takes: `message`, `error.detail`. */
export function composioErrorDetail(body: string): string | null {
  const text = body.trim();
  if (!text) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text.startsWith("<") ? null : text.slice(0, 200);
  }
  if (typeof parsed === "string") return parsed.slice(0, 200);
  if (typeof parsed !== "object" || parsed === null) return null;

  const root = parsed as Record<string, unknown>;
  const candidate = root.message ?? (root.error as { detail?: unknown } | undefined)?.detail;
  if (typeof candidate !== "string" || !candidate) return null;
  return candidate.slice(0, 200);
}

/** One v3.1 request. The api key travels as `x-api-key`, never in the body. */
export async function composioRequest(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const response = await fetch(`${COMPOSIO_BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "User-Agent": USER_AGENT,
      "x-api-key": apiKey,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new ComposioHttpError(response.status, composioErrorDetail(text) ?? undefined);
  }
  // Not `response.json().catch` on the raw response: the text has been read and a body that is not
  // JSON at all (a health page behind a proxy) must not throw past a call that succeeded.
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Rows of a v3.1 list response, whether it arrives as `{ items }` or a bare array. */
function rows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((row) => typeof row === "object" && row !== null) as Record<string, unknown>[];
  }
  const items = (value as { items?: unknown } | null)?.items;
  return Array.isArray(items)
    ? (items.filter((row) => typeof row === "object" && row !== null) as Record<string, unknown>[])
    : [];
}

/**
 * The toolkits (apps) a project key can connect, as picker options — the list the app picker
 * renders and the source of `meta.toolkits`. `GET /toolkits` is also the cheapest call that proves
 * the key is valid, which is what the connector's `test()` is for (CLAUDE.md rule 11: the list is
 * captured at connect time, never hardcoded in UI).
 */
export async function fetchToolkits(apiKey: string): Promise<PickerOption[]> {
  const body = await composioRequest(apiKey, "/toolkits");
  // id is the slug the link route and the node send to Composio; the display name is the label.
  const seen = new Set<string>();
  const toolkits: PickerOption[] = [];
  for (const toolkit of rows(body)) {
    const id = typeof toolkit.slug === "string" ? toolkit.slug : "";
    const label = typeof toolkit.name === "string" ? toolkit.name : id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    toolkits.push({ id, label });
  }
  return toolkits.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

export const composioConnector = defineConnector({
  provider: "composio",
  name: "Composio",
  category: "data",
  kind: "apiKey",
  requiresFeature: "pro_connectors",
  fields: [
    {
      name: "apiKey",
      label: "API key",
      kind: "secret",
      placeholder: "comp_…",
      help: "A project API key from app.composio.dev → My apps. This opens the app picker for the 1,000+ apps Composio hosts. It is stored sealed like every credential, and it is the same key for the whole organisation.",
    },
  ],
  docsUrl: "https://app.composio.dev",
  icon: "Blocks",
  test: async (secret) => {
    const key = (secret.apiKey ?? "").trim();
    if (!key) return { ok: false, error: "Composio needs an API key" };

    const hint = key.slice(-4);
    try {
      const toolkits = await fetchToolkits(key);
      return {
        ok: true,
        label: `Composio (…${hint})`,
        hint,
        meta: { toolkits, fetchedAt: Date.now() },
      };
    } catch (error) {
      if (error instanceof ComposioHttpError) {
        return {
          ok: false,
          error:
            error.status === 401
              ? "Composio rejected the key (401: invalid key). Make sure it is a project API key, not an organisation or session key."
              : `Composio rejected the key (HTTP ${error.status})`,
        };
      }
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});