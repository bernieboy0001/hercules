import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { composioConnector } from "@/connectors/composio";
import { listOrgConnections, openOrgConnection } from "@/lib/connections-engine";
import {
  composioErrorResponse,
  ComposioRequestError,
  createLinkSession,
} from "@/lib/composio-server";
import { featureLabel } from "@/lib/plans";

/**
 * `POST /api/connections/composio/link` — "connect an app" (docs/superpowers/plans/
 * 2026-09-13-composio-connections.md, step 2 of the flow).
 *
 * The user has picked a toolkit in the app picker. This route opens the org's sealed Composio key
 * row server-side — the key itself never reaches the browser (CLAUDE.md rule 1) — asks Composio for
 * an auth-link session, and returns the hosted sign-in URL for the client to open in a new tab.
 * Whoever finishes that page must be signed in to *this* org in the same browser, because the
 * callback (`app/api/connections/composio/callback`) is where the identity check actually bites.
 *
 * Node runtime, not Edge: opening the sealed key is `node:crypto`.
 */
export const runtime = "nodejs";

const linkBody = z.object({ toolkit: z.string().min(1).max(100) });

export async function POST(request: Request): Promise<Response> {
  const { isAuthenticated, orgId, has } = await auth();
  if (!isAuthenticated || !orgId) {
    return Response.json(
      { code: "unauthorized", error: "Sign in and select an organisation first." },
      { status: 401 },
    );
  }

  // Same gate the key's connector carries (CLAUDE.md rule 3). A `curl` past the UI still has to
  // get past this line.
  const requiredFeature = composioConnector.requiresFeature;
  if (requiredFeature && !has({ feature: `org:${requiredFeature}` })) {
    return Response.json(
      {
        code: "upgrade_required",
        error: `Composio needs ${featureLabel(requiredFeature)}. Upgrade your plan to connect apps.`,
        feature: requiredFeature,
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid_body", error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = linkBody.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { code: "invalid_body", error: 'Expected a JSON body with a "toolkit" slug.' },
      { status: 400 },
    );
  }

  const toolkit = parsed.data.toolkit.trim();

  try {
    const keyRow = (await listOrgConnections(orgId)).find(
      (row) => row.provider === "composio" && row.kind === "apiKey" && row.status === "active",
    );
    if (!keyRow) {
      return Response.json(
        {
          code: "not_found",
          error: "Add your Composio project API key to Settings → Connections first.",
        },
        { status: 404 },
      );
    }

    const opened = await openOrgConnection(keyRow.id, orgId);
    const apiKey = typeof opened.secret.apiKey === "string" ? opened.secret.apiKey.trim() : "";
    if (!apiKey) {
      throw new ComposioRequestError(
        400,
        "secret_unreadable",
        "This connection's stored credential could not be opened. Please add it again.",
      );
    }

    const callbackUrl = `${process.env.APP_ORIGIN ?? "http://localhost:3000"}/api/connections/composio/callback`;
    const { openUrl } = await createLinkSession({ apiKey, orgId, toolkit, callbackUrl });
    return Response.json({ openUrl }, { status: 201 });
  } catch (cause) {
    const { status, body: payload } = composioErrorResponse(cause);
    return Response.json(payload, { status });
  }
}