import { describe, expect, it } from "vitest";

import { AGENTS, type Agent } from "@/lib/agents";
import { templateFeature, templateSetup, WORKFLOW_TEMPLATES } from "@/lib/templates";
import { validateWorkflow } from "@/lib/validate-workflow";
import { NODES } from "@/nodes/registry";

/**
 * An agent is a graph handed straight to `workflows.create`, so it must pass the same bar as the
 * starter templates: it would run. `validateWorkflow` is the check the Builder agent and the engine
 * make, and the only work an agent is allowed to leave undone is the connection behind its Agent
 * node — the one thing the shop cannot fill in.
 *
 * The shop has one extra invariant the shelf does not: the agent IS the product. Every entry must be
 * headed by the `ai.agent` node with the goal pre-written, or the card is promising a thing the
 * workflow is not.
 */
describe("agent shop", () => {
  it("ships two agents, js first, with unique ids", () => {
    expect(AGENTS).toHaveLength(2);
    expect(new Set(AGENTS.map((entry) => entry.id)).size).toBe(2);
    expect(AGENTS.map((entry) => entry.id)).toEqual(["js-agent", "webhook-agent"]);
  });

  it("names agents as their own shelf, not as starter workflows", () => {
    // The shop and the New workflow shelf are separate surfaces; a shared id would let one card
    // point at the other's graph by accident.
    const templateIds = new Set(WORKFLOW_TEMPLATES.map((entry) => entry.id));
    for (const entry of AGENTS) {
      expect(templateIds.has(entry.id), entry.id).toBe(false);
    }
  });

  it.each(AGENTS.map((entry) => [entry.id, entry] as const))(
    "%s is built only from registered node types",
    (_id, entry) => {
      for (const graphNode of entry.graph.nodes) {
        expect(NODES[graphNode.data.nodeType], graphNode.data.nodeType).toBeDefined();
      }
    },
  );

  it.each(AGENTS.map((entry) => [entry.id, entry] as const))(
    "%s validates, leaving work only on the Agent node it names",
    (_id, entry) => {
      const { problems } = validateWorkflow(entry.graph);
      const allowed = new Set(templateSetup(entry.graph).map((step) => step.nodeId));

      expect(problems.filter((problem) => problem.nodeId === undefined)).toEqual([]);
      expect(
        problems.filter((problem) => !allowed.has(problem.nodeId ?? "")).map((p) => p.message),
      ).toEqual([]);
    },
  );

  it.each(AGENTS.map((entry) => [entry.id, entry] as const))(
    "%s is the Agent node: one ai.agent, triggered, with the goal pre-written",
    (_id, entry) => {
      expect(NODES["ai.agent"], "registry has the ai.agent node").toBeDefined();

      const agentNodes = entry.graph.nodes.filter(
        (graphNode) => graphNode.data.nodeType === "ai.agent",
      );
      expect(agentNodes, entry.id).toHaveLength(1);

      const trigger = entry.graph.nodes.find(
        (graphNode) => graphNode.id === entry.graph.triggerId,
      );
      expect(trigger, entry.id).toBeDefined();
      expect(NODES[trigger!.data.nodeType].category).toBe("trigger");

      // The trigger is wired to the agent, so a run reaches it.
      expect(
        entry.graph.edges.some((graphEdge) => graphEdge.target === agentNodes[0].id),
        entry.id,
      ).toBe(true);

      // The one thing the shop fills in. A blank goal on a shop agent is a card with no product.
      expect(
        (agentNodes[0].data.inputs as { goal?: unknown }).goal,
        entry.id,
      ).toMatch(/[^ ][\w\W]*\S/);
    },
  );

  it("heads every agent at the connection the shop cannot invent", () => {
    for (const entry of AGENTS) {
      const agentNodes = entry.graph.nodes.filter(
        (graphNode) => graphNode.data.nodeType === "ai.agent",
      );
      const agent = agentNodes[0];
      expect(agent, entry.id).toBeDefined();

      // The Agent node runs on the reader's own key, so "Needs an AI provider" shows on the card.
      expect(agent.data.inputs).toMatchObject({ connectionId: "", model: "" });
      expect(templateSetup(entry.graph)).toEqual([
        { nodeId: agent.id, label: agent.data.label, credential: "ai" },
      ]);

      // …and that unresolved connection is the whole of the validator's complaint.
      const { problems } = validateWorkflow(entry.graph);
      expect(problems.filter((problem) => problem.nodeId === agent.id)).not.toEqual([]);
    }
  });

  it("gates both agents behind the ai_agent feature, derived like a template's", () => {
    expect(Object.fromEntries(AGENTS.map((entry) => [entry.id, entry.requiresFeature]))).toEqual({
      "js-agent": "ai_agent",
      "webhook-agent": "ai_agent",
    });
    for (const entry of AGENTS) {
      expect(entry.requiresFeature, entry.id).toBe(templateFeature(entry.graph));
    }
  });

  it("gives every node a unique, template-safe key that matches its id", () => {
    for (const entry of AGENTS) {
      const keys = entry.graph.nodes.map((graphNode) => graphNode.data.key);
      expect(new Set(keys).size, entry.id).toBe(keys.length);
      for (const graphNode of entry.graph.nodes) {
        expect(graphNode.data.key, entry.id).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(graphNode.id, entry.id).toBe(graphNode.data.key);
      }
    }
  });

  it("points every edge at a node in the same graph", () => {
    for (const entry of AGENTS) {
      const ids = new Set(entry.graph.nodes.map((graphNode) => graphNode.id));
      for (const graphEdge of entry.graph.edges) {
        expect(ids.has(graphEdge.source), `${entry.id}: ${graphEdge.id}`).toBe(true);
        expect(ids.has(graphEdge.target), `${entry.id}: ${graphEdge.id}`).toBe(true);
      }
    }
  });
});

/**
 * What each agent is *for* is its goal, so each one's purpose is pinned by name rather than left to
 * the generic checks above — the way the showcase templates' demo parts are.
 */
describe("agent goals", () => {
  function agentOf(id: string): Agent {
    const found = AGENTS.find((entry) => entry.id === id);
    expect(found, id).toBeDefined();
    return found!;
  }

  it("has the JS agent answer in the reader's terms, not the agent's", () => {
    const js = agentOf("js-agent");
    const coder = js.graph.nodes.find(
      (graphNode) => graphNode.data.nodeType === "ai.agent",
    )!;
    const goal = (coder.data.inputs as { goal: string }).goal;

    // The goal reads the prompt the manual run carries in.
    expect(goal).toContain("{{ job.prompt }}");
    // …and is honest about the runtime agent's one hard limit: it cannot run the code.
    expect(goal).toContain("cannot execute code");
  });

  it("has the webhook agent read method, query and payload", () => {
    const hook = agentOf("webhook-agent");
    const responder = hook.graph.nodes.find(
      (graphNode) => graphNode.data.nodeType === "ai.agent",
    )!;
    const goal = (responder.data.inputs as { goal: string }).goal;

    expect(hook.graph.nodes.some((graphNode) => graphNode.data.nodeType === "webhook.trigger")).toBe(
      true,
    );
    expect(goal).toContain("{{ hook.method }}");
    expect(goal).toContain("{{ hook.query }}");
    expect(goal).toContain("{{ hook.body }}");
  });
});