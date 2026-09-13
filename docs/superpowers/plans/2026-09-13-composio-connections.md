# Composio connection layer (2026-09-13)

Adopt [Composio](https://docs.composio.dev) (REST API v3.1 / `@composio/core`) as the
connection layer for the long tail of apps, without disturbing the two things that make this
product what it is: **users bring their own credentials** (sealed per org in our vault) and
**nodes are typed contracts** (`defineNode` + zod) the Builder can parse and the config panel can
render.

Scope of this phase: connections + one node (`composio.action`) + the engine path. The eve
Builder/Runtime agents get Composio tool access in a later phase; this phase makes that possible
by owning the credentials.

## Why Composio and not more hand-rolled `connectors/`

- Our OAuth connectors (Slack, Notion, Airtable, Linear, GitHub) need per-provider HTTPS
  apps, token refresh and scope handling — the maintenance tail. Composio's hosted Connect Link
  handles sign-in, storage and refresh for 1000+ toolkits; credentials never pass through our
  servers.
- `docs/research/connectors-*.md` and `lib/oauth/` stay for the apps we already own. Composio is
  for *new* apps and for the long tail, not a migration of today's catalogue.
- Harmonises with hard rule 11: tool / toolkit lists are captured at connect time (like
  `meta.models`) and rendered from the stored row.

## Terminology (Composio v3 — use these words, not the old ones)

`user_id` (not entity), `toolkit` (not app), `tool` (not action), `auth config` (not
integration), `connected account` (not connection). Base URL `https://backend.composio.dev/api/v3.1`,
auth via the `x-api-key` header.

## Model

Two connection kinds live side by side under the existing `connections` table. Both are normal
rows in the catalogue and the connections list.

1. **The key (one per org).** `provider: "composio"`, `kind: "apiKey"` — the connector
   `connectors/composio.ts`; the field is the composer's project API key. `test()` validates by
   fetching the toolkit list and stores `meta.toolkits` (the installed picker source for "which
   app"). Sealed with AES-GCM like every key. Label "Composio".
2. **A connected account (one per app per org).** `provider: "composio"` (same provider string,
   different row), `kind: "composio"` (new literal — see schema diff). Carries no third-party
   secret: the sealed `secret` is the short `{}` record, and everything the node needs at run time
   lives in `meta`:
   - `composio.toolkit` — `gmail`, `slack`, …
   - `composio.accountId` — the connected-account nanoid.
   - `composio.tools` — the toolkit's tool slugs + names (captured at connect), the node's tool
     picker source, and the demo label the connections list shows.
   - `composio.keyId` — the id of the key row this account was made with (for key rotation and
     revocation hygiene, optional in v1).

The node is pointed at an *account* row (`connectionId`), not the key row. `runNode` opens the
account row exactly like every other node (hard rule 1: only ids travel; the composio API key is
read from the account row's own sealed `secret` — see "Why self-contained" below).

### Why the account row is self-contained (no second lookup)

Every other node opens exactly one connection in `run`. Adding "find the org's composio key row
and open it too" would grow engine plumbing (`run-node`, `openCredential`, projections) for one
node. Instead `POST /api/connections/composio/link` reads the org's key row, opens it, and seals
`{ composioKey }` into the account row. The node stays a single open. Cost: rotating the composio
key means reconnecting accounts (documented in the UI help text; same class of event as a Slack
app reinstall — already a "reconnect" in this product's language).

## Connect flow (hosted, no OAuth app of ours)

```
user picks toolkit → POST /api/connections/composio/link { toolkit }
  server: open key row, create auth-link session (SDK connectedAccounts.link(
            userId: orgId, toolkit/…, { callbackUrl, data:{toolkit} })),
          → returns session (URL + session_uri)
  client: opens the URL in a new tab (Composio hosts the sign-in; it stores + refreshes tokens)
  on success Composio redirects the browser to callbackUrl = /api/connections/composio/callback?session_uri=…
  server: completes/verifies the session (complete_auth), then GET connected accounts
          filtered by userId+toolkit → finds the nanoid → creates the account row
  Convex subscription (connections.list) shows the new row; canvas/node palette light up
```

Security note (Composio docs): whoever opens a Connect Link consents and becomes the account
attached to that flow. A bare public callback is spoofable, so the callback path must be hardened
using Composio's identity-verification story (verifier URL + `complete_auth`, or at minimum
server-side confirmation against `userId`) — implementation closes this against the exact v3.1
endpoints before anything ships. This is the one genuinely novel attack surface in the phase.

Cancel / failure: session expired or FAILED → no row is created; the client shows the error from
the link call. Revoking a row deletes it at Composio too (see DELETE route change).

## Execute flow (the node)

New `nodes/actions/composio-action.ts`:

- `type: "composio.action"`, `name: "Composio: Run app tool"`, `category: "data"`,
  `credential: "composio"`.
- `inputs`: `connectionId` (the account row), `tool: z.string().min(1).meta({ picker: "tools" })`
  (picker reads `meta.composio.tools` — a connect-time capture, hard rule 11), and
  `arguments: z.string()` (JSON text area, template-resolvable, exactly like the HTTP request
  node's body).
- `outputs`: `z.object({ data: z.unknown() })` — the variable picker offers `{{ node.data }}`
  loosely; a tool's schema can refine this later.
- `run`: `POST {BASE}/tools/execute/{tool}` with `x-api-key` = opened `composioKey`,
  body `{ arguments, userId: orgId, connectedAccountId, version: "latest" }`. Plain `fetch`
  (hard rule 5 — no provider SDK under `nodes/`; `@composio/core` must not be imported from
  node/step code). Map 4xx → `ConnectorError` (FatalError), 429 → retryable, non-2xx → error with
  Composio's message.

## Schema diff (the only schema change)

`convex/schema.ts` `connections.kind` union gains one literal:

```ts
kind: v.union(
  v.literal("apiKey"), v.literal("oauth2"), v.literal("webhookUrl"),
  v.literal("botToken"), v.literal("signingSecret"), v.literal("composio"),
),
```

Nothing else. No new tables, no new indices (org-scoped lists are `by_org`). `isTokenKind`
stays false for `composio` (the HTTP node must not send it as a bearer token).

## Env vars

None added. The composio key is a per-org connection like every other AI key.

## File list

New:
- `connectors/composio.ts` — the key connector (`provider: "composio"`, kind `apiKey`,
  `test()` → `meta.toolkits`, `docsUrl`, icon, one secret field `apiKey`). Registered in
  `connectors/registry.ts` (one line).
- `lib/composio-server.ts` — server-side Composio client on the v3.1 REST API:
  `linkSession`, `completeLink`, `listAccounts`, `revokeAccount`, `fetchToolkits`, `fetchTools`.
  Imported only by routes and `lib/` (Node runtime OK).
- `app/api/connections/composio/link/route.ts` — `POST`; org guard, opens key row, returns
  `{ sessionUri, openUrl }`.
- `app/api/connections/composio/callback/route.ts` — `GET`; verifies, creates the account row
  (`connections.createFromComposio` via the engine path `lib/engine-client` or a direct internal
  mutation), redirects to `/connections?composio=connected`.
- `nodes/actions/composio-action.ts` — the node above.
- `components/connections/ComposioAppPicker.tsx` — the picker you reach from the key's form:
  connects a toolkit into an account row (used by both `AddConnectionDialog` and the future
  Builder `request_connection`).

Modified:
- `connectors/registry.ts` — register `composioConnector`.
- `convex/schema.ts` — the kind literal above.
- `components/connections/AddConnectionDialog.tsx` — after the composio key saves, offer a
  "Connect an app" step (app picker) instead of ending; `?add=composio` opens the standard form.
- `app/api/connections/[id]/route.ts` — when deleting a `composio` account row, call
  Composio `revoke` first.
- `nodes/registry.ts` — register `composioAction`.
- `package.json` — pin `@composio/core` only if the link/complete/execute paths we need are
  cleaner through the SDK than raw fetch (decided during implementation; raw fetch preferred,
  hard rule 5).

Unchanged and re-used as-is: `lib/vault.ts` sealing, `lib/connection-match.ts` (provider
equality already matches all `composio` rows), `components/connections/ConnectionPicker.tsx`,
`ConnectionList.tsx`, the config panel's `connectionId` picker, `ConnectorError` handling in
`run-node.ts`, plan gating (`requiresFeature`).

## Hard-rule compliance

- Secrets never reach a model/step-arg/return/client query: only the account `connectionId`
  travels; the composio key is opened inside the step from the sealed row.
- No Node built-ins under `nodes/`/`connectors/`: the node uses `fetch` + `globalThis.crypto`
  only; the file is parseable by the Workflow SDK bundler.
- Gating: the composio key connector gets `requiresFeature` (Pro) at registration; the node's
  `credential` resolution and plan gates work like every other node.

## Risks / decisions needing a second look during implementation

1. **Connect-link identity verification**: must match the exact v3.1 endpoints
   (`/connected_accounts/complete_auth`, verifier URL) — the whole security story of the phase.
2. **`userId` collision**: we key accounts by `orgId`; two members connecting the same app both
   land on one account. Composio supports multiple accounts per toolkit per user — v1 keeps
   "one per org" (matches this product's org-scoped ownership, hard rule 12) and notes it.
3. **Toolkit version pinning**: v3.1 defaults to `latest`; a changed schema mid-workflow is a run
   risk we accept for v1 (documented; can pin `version` later behind a config field).
4. **Cost**: Composio is usage-billed and executes outside our envelope — the tradeoff the plan
   already stated to the user. Never call Composio from a UI path; only from steps and the
   connect/revoke routes.

## Test plan

- `pnpm typecheck && pnpm test` green.
- `tests/` additions: `connection-match` treats `composio` account rows as acceptable to
  `credential: "composio"` and not to `ANY_CREDENTIAL`; the composio node's `run` uses a stubbed
  `fetch` (following the chat/data connector test style) for 2xx / 4xx / 429.
- Manual: connect key → pick app → hosted sign-in → row appears; drop the `composio.action` node,
  pick the app + tool, run a workflow, verify the call and the `data` output on the canvas.
- Manual: delete an account row → account revoked at Composio.

## Build order

1. `connectors/composio.ts` + registry (key connector + toolkit discovery).
2. `lib/composio-server.ts` + link/callback routes + account-row creation.
3. `nodes/actions/composio-action.ts` + `nodeIcon`/catalogue wiring.
4. Dialog app-picker + DELETE revoke.
5. Tests + manual pass.