"use client";

import { createElement, useState } from "react";
import { Link2OffIcon, Loader, PlugZapIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FULL_WIDTH_DIALOG } from "@/components/workflows/mobile-dialog";
import { cn } from "@/lib/utils";

import { brandLogo } from "./brand-logos";
import { useComposioLink } from "@/components/connections/use-composio-link";
import type { ConnectedApp } from "./state";

/**
 * What one curated app card decides for itself. `busyToolkit` is the slug currently opening a
 * sign-in *anywhere* on the page (a single link flow at a time — see `useComposioLink`).
 */
export type AppCardProps = {
  slug: string;
  name: string;
  tagline?: string;
  icon?: string;
  connected?: ConnectedApp;
  /** True when the org's key can reach this toolkit (assumed true before a key exists). */
  available: boolean;
  /** True when the key exists and the plan allows Composio — the direct-link path. */
  canConnect: boolean;
  /** Clicking Connect when the preconditions are missing: open the key/setup dialog. */
  onSetup: () => void;
};

async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      const { error } = body as { error?: unknown };
      if (typeof error === "string") return error;
    }
  } catch {
    // Falls through.
  }
  return "Something went wrong — please try again";
}

/**
 * One app in the Integrations grid. Everything here is client state over the projected rows:
 * the "Connect" button starts the shared hosted sign-in, the "Connected" pill counts the tools
 * captured at connect time, and "Disconnect" revokes at Composio then deletes the row (the same
 * path the Connections page's row menu uses).
 */
export function AppCard({
  slug,
  name,
  tagline,
  icon,
  connected,
  available,
  canConnect,
  onSetup,
}: AppCardProps) {
  const { connect, busy, error } = useComposioLink();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const busyHere = busy !== null;
  const Logo = icon ? brandLogo(icon) : null;
  // No key yet: every card looks connectable and one tap starts the key setup instead.
  const connectable = canConnect && available;

  async function onConnect() {
    if (!connectable) {
      onSetup();
      return;
    }
    await connect(slug);
  }

  async function onDisconnectConfirmed() {
    if (!connected || disconnecting) return;
    setDisconnecting(true);
    try {
      const response = await fetch(`/api/connections/${connected.connectionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error(await errorMessage(response));
        return;
      }
      toast.success(`Disconnected ${name}`);
      setDisconnectOpen(false);
    } catch {
      toast.error("Could not reach the server — please try again");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors",
        !available && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white"
        >
          {Logo ? (
            createElement(Logo, { className: "size-6" })
          ) : (
            <span className="text-sm font-semibold text-foreground">{name.charAt(0)}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{name}</h3>
            {connected ? (
              <Badge variant="outline" className="gap-1 whitespace-nowrap">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                Connected
              </Badge>
            ) : null}
          </div>
          {tagline ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{tagline}</p> : null}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs text-muted-foreground">
          {connected ? (
            connected.tools === null ? (
              "Connected"
            ) : (
              `${connected.tools} tool${connected.tools === 1 ? "" : "s"} ready`
            )
          ) : available ? (
            "Ready to connect"
          ) : (
            "Not on this Composio key"
          )}
        </p>

        {connected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busyHere || disconnecting}
            onClick={() => setDisconnectOpen(true)}
          >
            <Link2OffIcon />
            Disconnect
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busyHere || !available}
            onClick={() => void onConnect()}
          >
            {busyHere && busy === slug ? <Loader className="size-3.5 animate-spin" /> : <PlugZapIcon />}
            Connect
          </Button>
        )}
      </div>

      {error && busy === null ? (
        <p className="text-xs text-destructive" role="alert">
          {error.error}
        </p>
      ) : null}

      {connected ? (
        <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
          <AlertDialogContent className={FULL_WIDTH_DIALOG}>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <Link2OffIcon className="text-destructive" />
              </AlertDialogMedia>
              <AlertDialogTitle>Disconnect {name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the connected account for everyone in your organisation. Any workflow
                node still using it fails on its next run, and the app is revoked at Composio. You
                can reconnect any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={disconnecting}>Keep it</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => void onDisconnectConfirmed()}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting…" : "Disconnect app"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}