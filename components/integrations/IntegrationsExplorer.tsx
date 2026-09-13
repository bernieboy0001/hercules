"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  AppWindowIcon,
  KeyRoundIcon,
  PlugZapIcon,
  SearchIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AddConnectionDialog } from "@/components/connections/AddConnectionDialog";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

import { AppCard } from "./AppCard";
import {
  CATEGORY_ORDER,
  INTEGRATION_APPS,
  INTEGRATION_CATEGORIES,
  integrationAppFor,
  type CategoryFilter,
} from "./catalog";
import { composioAllowed, composioKeyRow, connectedApps, toolkitList } from "./state";

/**
 * The Integrations page body. All state is derived from projected Convex rows — the curated
 * catalogue ∩ the key row's `meta.toolkits` (captured at key-test time, CLAUDE.md rule 11), plus
 * any connected app the catalogue does not cover. A credential never reaches this component or
 * the model: "Connect" only trades a toolkit slug for a hosted sign-in URL, and Disconnect revokes
 * at Composio then deletes the row.
 *
 * One dialog does the key work (docs/superpowers/plans/2026-09-13-composio-connections.md): with
 * no key it shows the key form (and the plan wall when the plan lacks `pro_connectors`); once a
 * key row lands in the subscription it flips to the same app picker the Connections page uses.
 */
export function IntegrationsExplorer() {
  const connections = useQuery(api.connections.list);
  const plan = useQuery(api.plan.current);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [setupOpen, setSetupOpen] = useState(false);

  const keyRow = useMemo(() => composioKeyRow(connections), [connections]);
  const toolkits = useMemo(() => toolkitList(keyRow), [keyRow]);
  const connected = useMemo(() => connectedApps(connections), [connections]);
  const allowed = useMemo(() => composioAllowed(plan?.features), [plan]);
  // The grid needs the key AND an allowed plan to offer the direct link. Optimism while the plan
  // query lands (same beat as the add-connection dialog) — flat-out "this is on your plan" guess.
  const canConnect = keyRow !== null && (allowed || plan === undefined);

  const keyLabels = useMemo(() => new Map(toolkits.map((t) => [t.id, t.label])), [toolkits]);
  const hasKey = keyRow !== null;

  const cards = useMemo(() => {
    const list: {
      slug: string;
      name: string;
      tagline?: string;
      icon?: string;
      category?: string;
    }[] = [];
    const seen = new Set<string>();

    // The curated showcase: entries fine on the grid even before a key exists, so a fresh org
    // sees the full page and one tap on any card starts key setup.
    for (const app of INTEGRATION_APPS) {
      seen.add(app.slug);
      list.push(app);
    }

    // Connected apps the catalogue does not cover still deserve a card — letter tile, the key's
    // own label, a working Disconnect.
    for (const slug of connected.keys()) {
      if (seen.has(slug)) continue;
      const curated = integrationAppFor(slug);
      seen.add(slug);
      list.push({
        slug,
        name: curated?.name ?? keyLabels.get(slug) ?? slug,
        tagline: curated?.tagline ?? "Connected through Composio — use it from any workflow.",
        icon: curated?.icon,
        category: curated?.category,
      });
    }

    return list
      // With a key, the availability filter is implicit: a curated app the key cannot reach is
      // simply not rendered ("Browse all" covers the rest of the key). No key — show the whole
      // catalogue so Connect labels the action correctly.
      .filter((app) => category === "all" || app.category === category)
      .filter((app) => {
        const q = query.trim().toLowerCase();
        return q.length === 0 || app.name.toLowerCase().includes(q) || app.slug.includes(q);
      })
      .sort((a, b) => {
        const aOn = connected.has(a.slug) ? 0 : 1;
        const bOn = connected.has(b.slug) ? 0 : 1;
        return aOn - bOn || a.name.localeCompare(b.name);
      });
  }, [connected, keyLabels, category, query]);

  const connectedCount = connected.size;

  return (
    <div className="flex flex-col gap-6">
      {/* Status line: how many apps are live, and the state of the key under them. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">
          Integrations
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {connectedCount} app{connectedCount === 1 ? "" : "s"} connected
            {hasKey ? " · one Composio key active" : " · no Composio key yet"}
          </span>
        </h1>
        <Button type="button" variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
          <KeyRoundIcon />
          {hasKey ? "Pick an app to connect" : "Add Composio key"}
        </Button>
      </div>

      {/* The onboarding strip: un-keyed orgs get their first action big and obvious. */}
      {!hasKey ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
            >
              <SparklesIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">One key unlocks every app below</h2>
              <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted-foreground">
                Add your Composio project API key once, pick the apps this organisation works in,
                and every supported connector becomes usable from a workflow. The key is encrypted
                like all your credentials, and the app tokens stay with Composio.
              </p>
            </div>
          </div>
          <Button type="button" className="shrink-0" onClick={() => setSetupOpen(true)}>
            <KeyRoundIcon />
            Connect your Composio key
          </Button>
        </div>
      ) : null}

      {/* How it works — the explaining half of the page. */}
      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: KeyRoundIcon,
            title: "Add one Composio key",
            body: "A project API key from composio.dev, sealed like every credential. One key covers the whole organisation.",
          },
          {
            icon: PlugZapIcon,
            title: "Connect an app",
            body: "Sign-in happens on the app's own page — Composio hosts it, stores the tokens and refreshes them. Tokens never pass through HERCULES.",
          },
          {
            icon: WorkflowIcon,
            title: "Act from a workflow",
            body: "The Connector nodes in the builder use these accounts; runs call the app with your connection.",
          },
        ].map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-xl border border-border bg-card/60 p-4">
            <step.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step {index + 1}
              </p>
              <h3 className="mt-0.5 text-sm font-medium text-foreground">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Search + category chips. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps…"
            aria-label="Search integrations"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {CATEGORY_ORDER.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={category === filter}
              onClick={() => setCategory(filter)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                category === filter
                  ? "border-foreground/20 bg-muted font-medium text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {INTEGRATION_CATEGORIES[filter]}
            </button>
          ))}
        </div>
      </div>

      {/* The grid. */}
      {connections === undefined ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-label="Loading integrations"
        >
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center">
          <AppWindowIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">No apps match “{query}”.</p>
          <p className="text-xs text-muted-foreground">Clear the search or pick another category.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((app) => (
            <li key={app.slug}>
              <AppCard
                slug={app.slug}
                name={app.name}
                tagline={app.tagline}
                icon={app.icon}
                connected={connected.get(app.slug)}
                // A rendered card is always reachable: curated entries without key coverage never
                // render once a key exists, and before a key every card labels Connect->setup.
                available
                canConnect={canConnect}
                onSetup={() => setSetupOpen(true)}
              />
            </li>
          ))}

          {/* Browse all: the rest of what the key offers, in the same dialog's app picker. */}
          <li>
            <button
              type="button"
              aria-label="Browse all connectable apps"
              className={cn(
                "flex h-full min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-center",
                "transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              )}
              onClick={() => setSetupOpen(true)}
            >
              <span
                aria-hidden
                className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card"
              >
                <AppWindowIcon className="size-5 text-muted-foreground" />
              </span>
              <span className="text-sm font-medium text-foreground">Browse all apps</span>
              <span className="text-xs text-muted-foreground">
                {hasKey
                  ? `${toolkits.length} apps on your Composio key — or add a different project key`
                  : "Connect a Composio key first to see the full catalogue"}
              </span>
            </button>
          </li>
        </ul>
      )}

      {/* Key setup / app picker / plan wall: one dialog for all three, so the same flow serves the
          banner, the manage button, and any card tap. */}
      <AddConnectionDialog
        provider="composio"
        open={setupOpen}
        onOpenChange={setSetupOpen}
      />
    </div>
  );
}