// The Agent shop: two ready-made agents, framed as things to pick instead of graphs to draw.
//
// An agent here is exactly what the plan for the shop says — *"the node is the product"*: a small
// graph headed by the `ai.agent` node, shipped with the goal already written and a trigger
// attached. Deploying one is an ordinary `workflows.create({ name, graph })`, so nothing downstream
// — the engine, the validator, the Builder agent — can tell an agent apart from a graph somebody
// drew by hand. That is the point of the shop: pick a purpose, and end up in the canvas with the
// work already set up.
//
// The catalog is a separate shelf from `WORKFLOW_TEMPLATES` (`lib/templates.ts`) even though an
// agent *is* a `WorkflowTemplate` shape: templates are generic starter graphs, agents are
// pre-answered AI Agent sessions, and the two surfaces curate them differently. `requiresFeature`
// is derived from the registry exactly like a template's, so an agent can never claim to be free
// after the node it uses becomes a Pro feature.
//
// React-free and Convex-free, so the page, the gallery and the test read the same table.

import { NODES } from "@/nodes/registry";
import {
  type TemplateEdge,
  type TemplateGraph,
  templateFeature,
  type TemplateNode,
  type WorkflowTemplate,
} from "./templates";

/** An agent is a `WorkflowTemplate` whose graph is headed by the `ai.agent` node. */
export type Agent = WorkflowTemplate;

/** The React Flow node type every canvas node carries; mirrors `HERCULES_NODE_TYPE`. */
const HERCULES_NODE_TYPE = "hercules";

/** Grid the graphs are laid out on, so every agent opens looking like the same product. */
const COLUMN = 300;
const ROW = 150;

function node(
  key: string,
  nodeType: string,
  label: string,
  column: number,
  row: number,
  inputs: Record<string, unknown> = {},
): TemplateNode {
  return {
    id: key,
    type: HERCULES_NODE_TYPE,
    position: { x: column * COLUMN, y: row * ROW },
    data: { nodeType, key, label, inputs },
  };
}

function edge(source: string, target: string): TemplateEdge {
  return { id: `${source}-out-${target}`, source, target };
}

/** The first trigger on the canvas is the one the engine starts from — same rule as `toStoredGraph`. */
function graph(nodes: TemplateNode[], edges: TemplateEdge[]): TemplateGraph {
  const trigger = nodes.find((entry) => NODES[entry.data.nodeType]?.category === "trigger");
  return { nodes, edges, ...(trigger ? { triggerId: trigger.id } : {}) };
}

/**
 * JS agent: a manual trigger, and one Agent node that is the whole product.
 *
 * The runtime agent's tools are the workspace's connectors (bash and friends are off by design —
 * `agents/runtime/tools/bash.ts`), so the goal is honest about what it can and cannot do: write
 * code, deliver it through a connected tool such as GitHub, and never claim the script ran.
 * The run's answer is the code plus the command to run it locally.
 */
const jsAgent: TemplateGraph = graph(
  [
    node("job", "manual.trigger", "Run it", 0, 1, {
      sample: '{ "prompt": "Write a Node script that moves weekly CSVs into a dated folder" }',
    }),
    node("coder", "ai.agent", "Write the JavaScript", 1, 1, {
      connectionId: "",
      model: "",
      goal:
        "You are a focused coding agent. Write clean, working JavaScript for the task below — " +
        "plain functions, no framework, ready to run wherever Node.js is installed.\n\n" +
        "You cannot execute code from inside a workflow, so never claim to have run or tested it: " +
        "end by explaining exactly how to run it locally.\n\n" +
        "Use this workspace's connected tools to deliver the code when one fits — GitHub to open " +
        "an issue or a gist, for example. Otherwise just answer with the code and the run instructions.\n\n" +
        "Task:\n{{ job.prompt }}",
      maxSteps: 6,
    }),
  ],
  [edge("job", "coder")],
);

/**
 * Webhook agent: a webhook trigger feeding the same node.
 *
 * Every request to the workflow's URL becomes one run; the agent reads the method, the query string
 * and the payload, decides what is being asked, and records what it did. Runs are asynchronous
 * (the URL answers 200 immediately, like every inbound trigger), so the goal does not oversell a
 * reply it cannot send.
 */
const webhookAgent: TemplateGraph = graph(
  [
    node("hook", "webhook.trigger", "Request arrives", 0, 1),
    node("responder", "ai.agent", "Work out what to do", 1, 1, {
      connectionId: "",
      model: "",
      goal:
        "You are a webhook endpoint. A request has just landed on a workflow. Read the method, " +
        "the query string and the payload, decide what it is asking for, and answer with what you " +
        "did — or, when the request is only data to route on, what you would pass on.\n\n" +
        "You cannot reply to the caller from a run, so never pretend otherwise: the answer you give " +
        "is what this run records.\n\n" +
        "Use this workspace's connected tools when one fits; otherwise answer from the payload alone.\n\n" +
        "Method: {{ hook.method }}\nQuery: {{ hook.query }}\nBody:\n{{ hook.body }}",
      maxSteps: 6,
    }),
  ],
  [edge("hook", "responder")],
);

/** The shop's shelves, in the order the gallery lists them. */
export const AGENTS: readonly Agent[] = [
  {
    id: "js-agent",
    name: "JS agent",
    category: "Agent",
    description:
      "Ask for a coding task and get clean, focused JavaScript back — written to do one job, ready to run locally, and delivered through the workspace's tools when one fits.",
    graph: jsAgent,
    requiresFeature: templateFeature(jsAgent),
  },
  {
    id: "webhook-agent",
    name: "Webhook agent",
    category: "Agent",
    description:
      "Give it a URL. Every request that lands there is read by the model — the payload, the query string and the method — and answered with what it decided to do.",
    graph: webhookAgent,
    requiresFeature: templateFeature(webhookAgent),
  },
];

/** One agent by id, for a deep link or a gallery that was opened with an agent in mind. */
export function agentById(id: string): Agent | undefined {
  return AGENTS.find((entry) => entry.id === id);
}