"use client";

// "Connect an app" for the whole app — the picker dialog and the Integrations page share exactly
// one path to a hosted Composio sign-in (docs/superpowers/plans/2026-09-13-composio-connections.md).
//
// The blank tab is opened *synchronously* with the click — `window.open` after an `await` is not a
// user gesture, so a popup blocker would eat it — then only pointed at Composio once the server
// has answered with the hosted sign-in URL. The credentials the user enters there never pass
// through this app; Convex's `connections.list` subscription flips the row to connected.

import { useRef, useState } from "react";
import { toast } from "sonner";

/** `{ code, error }` from the link route, or a generic message when the response is not JSON. */
export type ComposioLinkError = { code: string; error: string };

async function readError(response: Response): Promise<ComposioLinkError> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      const { code, error } = body as { code?: unknown; error?: unknown };
      if (typeof code === "string" && typeof error === "string") return { code, error };
    }
  } catch {
    // Falls through to the generic message.
  }
  return { code: "unknown", error: "Could not start the sign-in — please try again" };
}

/**
 * Starts a hosted sign-in for one Composio toolkit, returning the open button's handler.
 *
 * `busy` is the toolkit slug currently opening a tab — the caller disables its own controls while
 * it is set. `error` carries the last failure so the caller can render an inline message.
 */
export function useComposioLink() {
  const tab = useRef<Window | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ComposioLinkError | null>(null);

  async function connect(toolkit: string) {
    if (busy) return;

    // Reserve the tab before any await; its `location` is set once the route answers.
    tab.current = window.open("", "_blank");

    setBusy(toolkit);
    setError(null);
    try {
      const response = await fetch("/api/connections/composio/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toolkit }),
      });

      if (!response.ok) {
        tab.current?.close();
        const failure = await readError(response);
        setError(failure);
        if (failure.code === "upgrade_required") {
          toast.error("This needs a plan with Pro connectors — see the Upgrade card below.");
        } else {
          toast.error(failure.error);
        }
        return;
      }

      const { openUrl } = (await response.json()) as { openUrl: string };
      if (tab.current) {
        tab.current.location.href = openUrl;
      } else {
        // The browser refused the blank tab (rare, but possible): a plain navigation loses the
        // current page state, so the user is told what to do instead of losing the flow silently.
        window.location.href = openUrl;
      }
      toast.success("Sign in to the app in the tab that just opened — this page stays open.");
    } catch {
      tab.current?.close();
      setError({ code: "network", error: "Could not reach the server — please try again" });
    } finally {
      setBusy(null);
    }
  }

  return { connect, busy, error, clearError: () => setError(null) };
}