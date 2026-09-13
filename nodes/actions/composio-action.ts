import { z } from "zod";

import { TOOLS_PICKER } from "@/connectors/define";
import { COMPOSIO_BASE_URL, composioErrorDetail } from "@/connectors/composio";
import { ConnectorError, defineNode } from "../define";

/**
 * Run any tool on an app the org connected through Composio (docs/superpowers/plans/
 * 2026-09-13-composio-connections.md, "Execute flow").
 *
 * The connection this node is pointed at is an *account* row (kind `"composio"`, provider
 * `"composio"`), not the key row. Its sealed secret holds the project API key (`composioKey`) and
 * its `meta.composio` holds the toolkit, the connected-account id and the connect-time tool list —
 * so `run` stays a single vault open (plan's "Why the account row is self-contained") and the tool
 * dropdown is answered from the stored row, never a live Composio call (CLAUDE.md rule 11).
 *
 * Plain `fetch` only — `@composio/core` must never be imported from node/step code (CLAUDE.md rule
 * 4); the SDK's connection management lives server-side in `lib/composio-server.ts`.
 */

function parseArguments(text: string): unknown {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new ConnectorError(
      "Predictable: the arguments field must be a JSON object. Check the braces and quotes.",
      400,
    );
  }
}

function composioMessage(body: unknown, status: number, text: string): string {
  const detail = composioErrorDetail(text);
  if (detail) return detail;
  return body !== null && typeof body === "object" && "message" in (body as object)
    ? String((body as { message: unknown }).message)
    : `Composio returned HTTP ${status}`;
}

export const composioActionNode = defineNode({
  type: "composio.action",
  name: "Composio: Run app tool",
  description: "Run any tool on an app you connected through Composio.",
  category: "data",
  icon: "Blocks",
  // The account row (kind "composio") — `providersFor` already matches every composio row.
  credential: "composio",
  requiresFeature: "pro_connectors",
  version: "v1",
  inputs: z.object({
    connectionId: z.string(),
    tool: z.string().min(1).meta({ picker: TOOLS_PICKER, label: "Tool" }),
    /** JSON object, template-resolvable — the same shape the HTTP node's body is. */
    arguments: z.string().default("{}"),
  }),
  outputs: z.object({ data: z.unknown() }),
  async run({ inputs, credential, orgId }) {
    const composioKey = credential?.composioKey;
    const composio = credential?.meta as { composio?: { accountId?: unknown; toolkit?: unknown } } | undefined;
    const accountId = composio?.composio?.accountId;
    const toolkit = composio?.composio?.toolkit;

    if (typeof composioKey !== "string" || !composioKey || typeof accountId !== "string" || !accountId) {
      throw new ConnectorError(
        "This Composio connection is incomplete — reconnect the app in Settings → Connections.",
        400,
      );
    }

    const argumentsBody = parseArguments(inputs.arguments);
    if (argumentsBody !== null && typeof argumentsBody !== "object") {
      throw new ConnectorError("Predictable: the arguments field must be a JSON object.", 400);
    }

    const response = await fetch(`${COMPOSIO_BASE_URL}/tools/execute/${encodeURIComponent(inputs.tool)}`, {
      method: "POST",
      headers: { "x-api-key": composioKey, "content-type": "application/json" },
      body: JSON.stringify({
        connected_account_id: accountId,
        user_id: orgId,
        version: "latest",
        arguments: argumentsBody,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new ConnectorError(
        composioMessage(undefined, response.status, text),
        response.status,
        response.headers.get("retry-after") ?? undefined,
      );
    }

    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      // A 2xx with no JSON is still a 2xx — carry the text so the run has a record.
      body = text;
    }

    const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
    // Composio reports a tool-level refusal with a 200 and `execution_details.status: "failure"`.
    const details =
      typeof record.execution_details === "object" && record.execution_details !== null
        ? (record.execution_details as Record<string, unknown>)
        : {};
    if (details.status === "failure") {
      const error = String(details.error ?? "the app refused") || "the app refused";
      throw new ConnectorError(`"${inputs.tool}" failed: ${error}${toolkit ? ` (${toolkit})` : ""}`, 500);
    }

    const data =
      record.response_data ?? (record.data !== undefined ? record.data : record);
    return { data };
  },
});