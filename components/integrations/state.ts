// Pure derivation of the Integrations page state from `api.connections.list` and
// `api.plan.current`. React-free on purpose — tested in `tests/integrations-state.test.ts` and
// shared between the page and any component that needs it.
//
// The composio key row (`provider "composio"`, `kind "apiKey"`) carries the app list its key can
// reach in `meta.toolkits` (captured when the key was tested — CLAUDE.md rule 11). The account
// rows (`kind "composio"`) carry the connected toolkit in `meta.composio.toolkit` and the tool
// list captured at connect time in `meta.composio.tools`. Only ids, labels and counts ever leave
// this module — no credential, no `meta` blob beyond what is projected.

export const COMPOSIO_FEATURE = "pro_connectors";

export type ConnectionRowLike = {
  _id: string;
  provider: string;
  kind: string;
  status: string;
  meta?: unknown;
};

export type ToolkitEntry = { id: string; label: string };

/** The org's Composio key row, or null. `kind` separates it from the account rows. */
export function composioKeyRow(
  rows: readonly ConnectionRowLike[] | undefined,
): ConnectionRowLike | null {
  return (
    rows?.find(
      (row) => row.provider === "composio" && row.kind === "apiKey" && row.status === "active",
    ) ?? null
  );
}

/** The toolkit list a key can reach — the "available on this key" set for the grid. */
export function toolkitList(keyRow: ConnectionRowLike | null): ToolkitEntry[] {
  const raw = (keyRow?.meta as { toolkits?: unknown } | undefined)?.toolkits;
  if (!Array.isArray(raw)) return [];
  const toolkits: ToolkitEntry[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, label } = entry as { id?: unknown; label?: unknown };
    if (typeof id !== "string" || !id) continue;
    toolkits.push({ id, label: typeof label === "string" ? label : id });
  }
  return toolkits.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

/** A connected composio account, reduced to what a card shows. */
export type ConnectedApp = {
  /** The account row id — what DELETE revokes. */
  connectionId: string;
  /** The toolkit slug. */
  toolkit: string;
  /** The count of tools captured at connect time, or null when the capture predates it. */
  tools: number | null;
};

/** Every composio account row, keyed by toolkit slug (one per org per app: plan decision 2). */
export function connectedApps(rows: readonly ConnectionRowLike[] | undefined): ReadonlyMap<string, ConnectedApp> {
  const apps = new Map<string, ConnectedApp>();
  for (const row of rows ?? []) {
    if (row.provider !== "composio" || row.kind !== "composio") continue;
    const composio = (row.meta as { composio?: Record<string, unknown> } | undefined)?.composio;
    const toolkit = composio?.toolkit;
    if (typeof toolkit !== "string" || !toolkit) continue;
    const tools = Array.isArray(composio?.tools) ? (composio.tools as unknown[]).length : null;
    apps.set(toolkit, { connectionId: row._id, toolkit, tools });
  }
  return apps;
}

/** Whether the org's session claims include the Composio feature (`"org:"` prefix stripped). */
export function composioAllowed(features: readonly string[] | undefined): boolean {
  return features?.includes(COMPOSIO_FEATURE) ?? false;
}