import type { Metadata } from "next";

import { AgentGallery } from "@/components/agents/AgentGallery";

export const metadata: Metadata = {
  title: "Agents",
};

/**
 * The Agent shop: single-purpose AI agents, each shipped as a small graph with the `ai.agent` node
 * already set up. `Use this` is an ordinary `workflows.create`, so an agent arrives on the canvas as
 * the workflow of the same name — real workflow, real runs, all its pieces editable.
 *
 * The org guard lives in `app/(app)/layout.tsx`; this page is only the frame around the client
 * gallery, mirroring the workflow index.
 */
export default function AgentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Ready-made AI agents. Pick one and its workflow appears on the canvas, already set up.
        </p>
      </div>

      <AgentGallery />
    </div>
  );
}