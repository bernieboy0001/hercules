# Agent Shop — presenter's guide

For the person demoing the **Agents** page (the Agent Shop). Everything is written for a live
showing: what to click, what to say, what to have ready, and what to do when a live demo breaks.

## The pitch (say this in your first twenty seconds)

> Automating with HERCULES usually means dragging nodes onto a canvas. The Agent Shop inverts it:
> you pick a job — "ask for a coding task", "give this URL to an AI" — and the workflow appears on
> your canvas fully set up, with the AI Agent node's goal already written and a trigger attached.
> It is a real workflow from the first second: editable, runnable, durable.

One line on how it's built, for the technical person in the room:

> An agent in the shop is a small graph headed by the `ai.agent` node — same node you can drag from
> the sidebar, same engine, same runs. The shop just ships the graph already drawn, with the goal
> pre-written. Deploying one is an ordinary "create workflow", so nothing can tell it apart from a
> workflow somebody built by hand. Two honest notes: the agent runs **on your own AI key**, and the
> runtime agent's tools are the workspace's connectors — it can write code and deliver it, but it
> does **not** execute code on your machine. The goals are written to say exactly that.

## Before the demo (do this once, ~15 minutes)

**1. A working local install.** In one terminal run `pnpm dev`, in another `pnpm convex:dev`
(`CONVEX_ALLOW_ANONYMOUS=false npx convex dev`). Both must be up, and the app must load at
`http://localhost:3000`.

**2. An organisation on Pro.** A new organisation is on Free, and *running* an agent needs the
`ai_agent` feature, which is Pro.

- Sign in, create/switch an organisation.
- **Settings → Plans → Pro → start checkout.** In development this is Clerk's shared test gateway
  (`CheckoutButton`), so no Stripe account and no real card is involved. If asked for card details,
  it's a test checkout.
- The new plan lands on the **next session token (≤ 60 s)** — nothing mirrors the plan in
  Convex. Don't demo until the Settings → Plans page shows **Pro**. (On Free you *can* browse the
  shop and create an agent — you just can't run one, so the demo will stall later. Upgrade first.)

**3. One AI connection.** The Agent node runs on the org's own key.

- **Connections → Add** → pick a provider you hold a live key for. A cheap personal key is fine —
  recommended: OpenAI, Anthropic, Google, or Groq.
- Paste the key → **Test & save**. Saving validates the key against the provider and caches the
  provider's model list on the connection. Use a key that actually works: the "Test" step calls the
  provider for real.
- You now see the connection in the list, masked (`••••hint`), which is the same view the audience
  sees — and a good thirty-second talking point about the sealed vault.

**4. A second terminal window, ready to paste the curl command** for the webhook act (below). Have
the three agent facts in your head: webhook outputs are `body`, `headers`, `query`, `method`
(headers minus `authorization` and `cookie`).

**5. Clean slate.** If you want the demo to start empty, delete/archive previous demo workflows
from **Workflows** so the list and the shop both open on a fresh story.

## The demo (~5 minutes)

### Act 0 · The landing page (30 s)

Scroll the marketing page to **Pick an agent instead of drawing a graph** and click into **Agents**.
Or just use the **Agents** item in the app navigation. Say: *"Here's the shop — two agents, both
behind the AI agent's Pro feature."* Point at the **Pro** badge and the **Needs an AI provider**
chip, then at the search box (type `webhook` to show search) and clear it.

### Act 1 · The JS agent (2 minutes)

1. On **JS agent**, click **Use this**. You land on the workflow canvas with its own workflow —
   note its name in the tab/toolbar is **"JS agent"**: picking an agent *created a workflow*.
2. Point at the two nodes: **Run it** (the Manual trigger) and **Write the JavaScript** (the
   `ai.agent` node). Say: *"The product is the Agent node — the goal is already written. Open the
   node and read the goal out loud: it can't run code, it says so, and it delivers the script; that
   honesty is deliberate."*
3. Select the node → pick your connection and a model from the picker (the model list came from the
   connection). The red validation state on the node clears.
4. Press **Run**. In the popover beside it the sample JSON is pre-filled:
   `{ "prompt": "Write a Node script that moves weekly CSVs into a dated folder" }`. Say: *"The goal
   reads `{{ job.prompt }}` — the Manual trigger's output is exactly this object, so whatever I type
   here becomes the task."* Type something shorter if you like, then **Run** (⌘/Ctrl+Enter also
   runs).
5. Watch the **last-run pill** in the toolbar flip to *Running* then *Completed*, and if you have
   time, open **Run history** (`/w/<id>/runs`) to see the step and its answer — the script and the
   run instructions. For the deeper proof, run `pnpm workflow:web` and show the durable run inspector
   (name of the workflow, steps, inputs/outputs, timings).

### Act 2 · The webhook agent (2 minutes)

1. Go back to **Agents** → **Webhook agent** → **Use this**. On the canvas: **Request arrives** →
   **Work out what to do**.
2. Configure the Agent node (connection + model) as before.
3. Click the **Request arrives** trigger node. Its config panel shows *the* URL — say: *"This URL is
   the whole contract. The secret lives on the workflow, and rotating it kills every copy of the old
   URL at once."*
4. **Publish** the workflow (the Publish switch) — *"drafts only run on Run; the outside world
   respects the switch."*
5. From your second terminal:

   ```bash
   curl -s http://localhost:3000/api/hooks/<workflowId>/<secret> \
     -H "Content-Type: application/json" \
     -d '{ "kind": "ticket", "priority": "high", "summary": "Checkout 400 errors" }'
   ```

   The route answers **200 immediately** — inbound triggers are async by design, the run happens
   after. Say: *"The endpoint can't reply to the caller from a run, and the goal says so — it reads
   method, query and payload and records what it did."*
6. Refresh the canvas: the run's status pill reports the new run; open **Run history** and read the
   agent's answer. If a second curl with a different `?channel=` query string is easy, fire it to
   show each request becomes its own run.

### Optional extra · the plan walls (20 s each)

- **Workflow cap wall:** on Free, create a few templates/agents until the plan cap is hit — the
  shop puts up the wall *in place* under the gallery rather than a toast (it has to stay next to
  the thing you tried).
- **Pro gate:** on a Free org, run a shop agent and show that the engine refuses the Agent node for
  lack of `ai_agent` — the UI badges and the engine agree, because both read the same registry.

## If something breaks live

| Symptom | What it is | Fix under the clock |
| --- | --- | --- |
| Agent "Use this" does nothing / toast "could not create" | Org at the Free workflow cap (3) | Upgrade to Pro, or unpublish-plus-delete an old workflow. |
| Run refuses with a plan message | Not on Pro (or `ai_agent` not in the session token yet) | Upgrade, wait ≤ 60 s, refresh. |
| Node stays red after picking a connection | Model picker empty = connection's models never cached (old/partially-created connection) | Delete the connection, re-add it (Test & save re-caches models), retry. |
| Webhook curl returns a refusal | Workflow not **Published** | Flip Publish, retry. |
| Webhook's URL won't load from the audience's phone | Localhost is your machine | Demo `curl` on your own machine, or run against the Vercel preview URL (`APP_ORIGIN`). |
| Run starts but the node sits "Running" | The provider call is genuinely in flight | Narrate the durable step — failures retry, waits hold. Show the run inspector; don't let silence feel like a hang. |
| Anything else | — | Fall back to Act 1's JS agent on a fresh run; it's the shortest reliable path. |

## Likely questions

- **Does it actually run the code?** No — and that's by design. The runtime agent's tools are the
  connection connectors (GitHub, etc.); bash/file tools are disabled. The goal is honest about it:
  the run's answer is the code plus the command to run it locally.
- **How is this different from the Templates shelf?** Templates are generic multi-node starter
  graphs (Loop, Switch, Waiting…). Agents are single-purpose: the AI Agent node *is* the product,
  with the goal pre-written and a trigger attached.
- **Who pays for the AI?** The org's own connection — same key the LLM/Extract/Classify nodes use.
- **Can customers build their own agents?** The shop is a curated shelf today; building one is just
  drawing the same two-node graph on the canvas and saving it.

## Reference facts (don't read these out, just don't be wrong)

- Agents: `lib/agents.ts` (`AGENTS` — `js-agent`, `webhook-agent`); the gallery:
  `components/agents/AgentGallery.tsx`; page: `app/(app)/agents/page.tsx`.
- Both agents derive `requiresFeature: "ai_agent"` from the `ai.agent` node's registry entry — never
  hardcoded, so they can't silently become Free.
- Manual trigger output = the parsed sample object (`{{ job.prompt }}`); webhook trigger output =
  `{ body, headers, query, method }` → `{{ hook.method }}`, `{{ hook.query }}`, `{{ hook.body }}`.
- Webhook URL: `${APP_ORIGIN}/api/hooks/<workflowId>/<webhookSecret>`, shown/rotated on the node's
  config panel. Inbound triggers answer 200 before the run; runs are durable on Vercel Workflows
  (inspector: `pnpm workflow:web`).
- Plan: `ai_agent` is Pro (`lib/plans.ts`); `workflows.create` only caps *count* (`plan_limit`), the
  feature gate bites at run time (`runNode`) — UI badges and engine read the same registry.
- The plan arrives on the next session token (`pla`/`fea`, ≤ 60 s); nothing is mirrored in Convex.