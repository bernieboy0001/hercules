import { Suspense } from "react";
import type { Metadata } from "next";

import { IntegrationsExplorer } from "@/components/integrations/IntegrationsExplorer";

export const metadata: Metadata = {
  title: "Integrations",
};

/**
 * The curated app grid over the org's Composio key (docs/superpowers/plans/2026-09-13-composio-connections.md).
 * Organisational access is enforced by the `(app)` layout; the explorer is a single client
 * component so it can subscribe to Convex and reuse the connections dialog.
 */
export default function IntegrationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <Suspense fallback={null}>
        <IntegrationsExplorer />
      </Suspense>
    </div>
  );
}