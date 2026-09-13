import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { listOrgConnections, openOrgConnection } from "@/lib/connections-engine";
import {
  authConfigForToolkit,
  completeLink,
  listAccounts,
  fetchTools,
} from "@/lib/composio-server";
import * as engine from "@/lib/engine-client";
import { aadFor, seal } from "@/lib/vault";

/**
 * `GET /api/connections/composio/callback` — where Composio's hosted sign-in page lands the browser
 * after a successful connection (docs/superpowers/plans/2026-09-13-composio-connections.md, the
 * security note in "Connect flow").
 *
 * The bare `session_uri` in the query proves nothing on its own, so two checks happen before any
 * row is written:
 *
 * 1. The redirect lands in the *same browser* the user is signed into, so `auth()` yields a real
 *    Clerk org session — a hijacked callback has to pass this to go any further.
 * 2. `completeLink` redeems the single-use session with Composio, which validates that this project
 *    key owns the pending connection *and* that `user_id` matches the connection's owner.
 *
 * Together they close the spoofable-callback gap named in the plan: the composio key never leaves
 * the server (rule 1), and the account row that is created here is what every `composio.action` run
 * opens later. The API key is copied sealed into the new row's own secret (`{ composioKey }`) so the
 * node stays a single open (plan's "Why the account row is self-contained").
 *
 * Node runtime, not Edge: sealing is `node:crypto`.
 */
export const runtime = "nodejs";

const ACCOUNTS = "/connections";

function redirect(message: string): NextResponse {
  return NextResponse.redirect(`${process.env.APP_ORIGIN ?? "http://localhost:3000"}${ACCOUNTS}?composio=${message}`);
}

export async function GET(request: Request): Promise<NextResponse> {
  const { isAuthenticated, orgId, userId } = await auth();
  if (!isAuthenticated || !orgId || !userId) {
    // Not signed in (or the org changed mid-flow): there is no org whose key row we may open, so
    // the flow cannot finish. The browser is already on our domain, so the connections page can
    // show the sign-in prompt.
    return redirect("error");
  }

  const params = new URL(request.url).searchParams;
  const sessionUri = params.get("session_uri") ?? "";
  const failed =
    params.get("error") !== null ||
    params.get("status")?.toUpperCase().includes("FAIL") ||
    params.get("status")?.toUpperCase().includes("ERROR");

  // Composio itself reports a refusal or the session expired before the user finished.
  if (!sessionUri || failed) {
    return redirect("error");
  }

  try {
    const keyRow = (await listOrgConnections(orgId)).find(
      (row) => row.provider === "composio" && row.kind === "apiKey" && row.status === "active",
    );
    if (!keyRow) return redirect("error");

    const opened = await openOrgConnection(keyRow.id, orgId);
    const apiKey = typeof opened.secret.apiKey === "string" ? opened.secret.apiKey.trim() : "";
    if (!apiKey) return redirect("error");

    let account = await completeLink({ apiKey, sessionUri, orgId });
    if (!account.toolkit) {
      // The account echoed but without its toolkit — find it by user + the slug-only fallback.
      const matches = (await listAccounts({ apiKey, orgId, toolkit: account.toolkit })).filter(
        (row) => row.id === account.id,
      );
      account = matches[0] ?? account;
    }
    const toolkit = account.toolkit || "";
    if (!toolkit) return redirect("error");

    const config = await authConfigForToolkit(apiKey, toolkit);
    const tools = await fetchTools(apiKey, toolkit);

    // Insert the row so its id can become half of the AAD, then seal the composio key into it. The
    // account row carries no third-party secret of its own — the sealed envelope holds the project
    // key the node will open — and everything the UI needs lives on `meta.composio` (rule 1).
    const id = await engine.createConnection({
      orgId,
      createdBy: userId,
      provider: "composio",
      kind: "composio",
      label: config?.name ?? toolkit,
      hint: "",
      // `accountId` is what a run sends to Composio; `tools` is the node's picker source and the
      // list's demo label; `keyId` is the key row this account was made with (rotation hygiene).
      meta: { composio: { toolkit, accountId: account.id, tools, keyId: keyRow.id } },
    });
    await engine.patchConnectionSecret({
      connectionId: id,
      orgId,
      sealed: seal({ composioKey: apiKey }, aadFor(orgId, id)),
    });

    return redirect("connected");
  } catch (cause) {
    // The failure is logged server-side, never shown to the caller beyond the redirect's message.
    console.error("composio: callback failed", { orgId }, cause);
    return redirect("error");
  }
}