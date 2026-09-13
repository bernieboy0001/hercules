"use client";

import { Fragment, useId, useMemo, useState } from "react";
import { ChevronRightIcon, SearchIcon } from "lucide-react";

import { NodeIcon } from "@/components/canvas/node-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanWall } from "@/components/workflows/NewWorkflowDialog";
import { flowStrip } from "@/components/workflows/template-flow";
import { useCreateWorkflow } from "@/components/workflows/use-create-workflow";
import { AGENTS, type Agent } from "@/lib/agents";
import { featureLabel } from "@/lib/plans";
import { credentialName, templateSetup } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { NODES } from "@/nodes/registry";

/**
 * The Agent shop's gallery: agents as cards, each one picked by a single "Use this".
 *
 * Picking an agent is nothing more than creating its workflow — `workflows.create` carries the
 * agent's graph as `setup args` and `useCreateWorkflow` lands on the canvas, so the plan wall, the
 * toast and the jump to `/w/<id>` (the agent's root) all live here once, exactly as they do for the
 * starter templates.
 */

export function AgentGallery() {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const { createFromTemplate, pendingTemplate, limit, atLimit } = useCreateWorkflow();

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return AGENTS;
    return AGENTS.filter((agent) =>
      `${agent.name} ${agent.description}`.toLowerCase().includes(needle),
    );
  }, [query]);

  const busy = pendingTemplate !== null;

  return (
    <div className="flex flex-col gap-3">
      {atLimit ? <PlanWall limit={limit} /> : null}

      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search agents"
          aria-label="Search agents"
          className="pl-8"
        />
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-border p-6">
          <p className="text-sm font-medium">No agents match</p>
          <p className="text-sm text-muted-foreground">
            Try a shorter search, or build a workflow on the canvas and give it its own Agent node.
          </p>
          <Button variant="outline" size="sm" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              pending={pendingTemplate === agent.id}
              disabled={busy}
              onPick={createFromTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  pending,
  disabled,
  onPick,
}: {
  agent: Agent;
  pending: boolean;
  disabled: boolean;
  onPick: (agent: Agent) => void;
}) {
  const { steps, more } = flowStrip(agent.graph);
  // "an AI provider" rather than "ai": the card is read before the agent is picked, so it has to
  // say what you will be asked for in the words you would use.
  const needs = [...new Set(templateSetup(agent.graph).map((step) => credentialName(step.credential)))];

  function pick() {
    if (!disabled) onPick(agent);
  }

  return (
    <div
      onClick={pick}
      className={cn(
        "group flex min-w-0 cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors",
        "hover:border-ring hover:bg-muted/40 has-[button:focus-visible]:border-ring",
        disabled && "cursor-not-allowed opacity-60",
        pending && "border-ring bg-muted/40",
      )}
    >
      <div className="min-w-0">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{agent.category}</p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{agent.name}</p>
          {agent.requiresFeature ? (
            <Badge variant="secondary" className="shrink-0">
              {featureLabel(agent.requiresFeature)}
            </Badge>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{agent.description}</p>

      {steps.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-0.5 sm:flex-nowrap">
          {steps.map((step, index) => (
            <Fragment key={`${step.nodeType}-${index}`}>
              {index > 0 ? (
                <ChevronRightIcon
                  aria-hidden
                  className="size-3 shrink-0 text-muted-foreground/60"
                />
              ) : null}
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-xs">
                <NodeIcon
                  name={NODES[step.nodeType]?.icon}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="max-w-28 truncate">{step.label}</span>
              </span>
            </Fragment>
          ))}
          {more > 0 ? (
            <span className="shrink-0 pl-1 text-xs text-muted-foreground">+{more} more</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {needs.length > 0 ? (
            needs.map((need) => (
              <span
                key={need}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 text-xs text-muted-foreground"
              >
                Needs {need}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Runs once you press Run</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={(event) => {
            // The card behind it would otherwise pick the same agent twice.
            event.stopPropagation();
            pick();
          }}
        >
          {pending ? "Adding…" : "Use this"}
        </Button>
      </div>
    </div>
  );
}