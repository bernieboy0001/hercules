"use client";

import { ArrowLeftIcon, CheckIcon, ExternalLinkIcon, Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NodeIcon } from "@/components/canvas/node-icon";

import { useComposioLink } from "./use-composio-link";

type AppEntry = { id: string; label: string };

/**
 * Step two of "connect an app" once the org already holds a Composio project key
 * (docs/superpowers/plans/2026-09-13-composio-connections.md, the app picker).
 *
 * The key never enters this step or the browser tab that opens: the list the user picks from was
 * captured at key-test time into the key row's `meta` (CLAUDE.md rule 11), and "Connect" only asks
 * the server for a hosted sign-in URL. The tab-opening lives in `useComposioLink` — the same path
 * the Integrations page's app cards use.
 */
export function ComposioAppPicker({
  toolkits,
  connected,
  onBack,
}: {
  toolkits: AppEntry[];
  /** Toolkit slugs the org already has account rows for — shown, not offered again. */
  connected: ReadonlySet<string>;
  onBack?: () => void;
}) {
  const { connect, busy, error } = useComposioLink();

  return (
    <div className="grid gap-4 max-sm:flex max-sm:min-h-full max-sm:flex-col">
      <DialogHeader className="min-w-0 pr-8">
        <DialogTitle className="flex items-center gap-2">
          <span aria-hidden className="inline-flex size-5 items-center justify-center rounded-md bg-muted">
            <ExternalLinkIcon className="size-3" />
          </span>
          Pick the app to connect
        </DialogTitle>
        <DialogDescription>
          These are the apps your Composio project key can reach. Signing in happens on the app’s
          own page; this dialog stays open until the connection is registered.
        </DialogDescription>
      </DialogHeader>

      <ul className="grid min-h-0 gap-2 overflow-y-auto pr-1">
        {toolkits.map((toolkit) => {
          const already = connected.has(toolkit.id);
          return (
            <li key={toolkit.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <NodeIcon name="Blocks" className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{toolkit.label}</span>
              {already ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckIcon className="size-3.5" />
                  Connected
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void connect(toolkit.id)}
                >
                  {busy === toolkit.id ? <Loader className="size-3.5 animate-spin" /> : null}
                  Connect
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error.error}
        </p>
      ) : null}

      <DialogFooter className="max-sm:mt-auto">
        {onBack ? (
          <Button type="button" variant="outline" disabled={busy !== null} onClick={onBack}>
            <ArrowLeftIcon />
            Back
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Not seeing the app you want? {toolkits.length} app{toolkits.length === 1 ? "" : "s"} on
            this key — add a different project key to change the list.
          </p>
        )}
      </DialogFooter>
    </div>
  );
}