// Hand-rolled brand marks for the curated Integrations grid. Each is a fixed 24×24 viewBox
// designed to render legibly on a light tile (bg-card) in both light and dark themes.  Colours
// are brand-accurate; monochrome marks use `currentColor` where the brand itself is monochrome.
//
// React Compiler rule (CLAUDE.md 8): dynamic tag resolution must go through `createElement`,
// which `BrandLogo` does at render time.

import { type ComponentType } from "react";

type BrandProps = { className?: string; "aria-hidden"?: boolean };

// ──────────────── logo components ────────────────

const Slack: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M8.17 3a1.08 1.08 0 0 0-.26 2.14l.53.08.06.54a1.08 1.08 0 0 0 2.13-.26l-.06-.54-.54-.06a1.08 1.08 0 0 0-1.86.14z" fill="#e01e5a" />
    <path d="M15.17 12.17a1.08 1.08 0 0 0-2.13.26l.06.54.54.06a1.08 1.08 0 0 0 .26-2.13l-.53-.08-.07.54.07.81z" fill="#e01e5a" />
    <path d="M13.83 5.17A1.08 1.08 0 0 0 11.7 3a1.08 1.08 0 0 0 0 2.16l.53.08.07-.54.53-.07zm-5.17 0-.07.54.07.54A1.08 1.08 0 0 0 9.97 8.5l.54-.07-.07-.54-.06-.54A1.08 1.08 0 0 0 8.66 5.17z" fill="#e01e5a" />
    <path d="M15.83 13.83a1.08 1.08 0 0 0-2.13.26v.54h1.59v.54a1.08 1.08 0 0 0 2.13-.26v-.54l-.06-.54a1.08 1.08 0 0 0-.26-.54z" fill="#2eb67d" />
    <path d="M14.41 19.83a1.08 1.08 0 0 0 .54-1.87l-.06-.07-.54.06a1.08 1.08 0 0 0 0 2.14l.54.06v-.06zm6-6a1.08 1.08 0 0 0-2.14.26l.06.54.54.06a1.08 1.08 0 0 0 .26-2.13l-.06-.07-.54.07zm-2.14 0-.06.07.06.54A1.08 1.08 0 0 0 17.2 13.8l.06-.54-.06-.54a1.08 1.08 0 0 0-.34-.54z" fill="#ecb22e" />
    <path d="M5.83 17.83a1.08 1.08 0 0 0 2.14-.26v-.54H6.37v-.54a1.08 1.08 0 0 0-.54-.81z" fill="#36c5f0" />
    <path d="M4.17 4.17a1.08 1.08 0 0 0 .81 1.59l.54-.06v-1.6a1.08 1.08 0 0 0-1.35.07z" fill="#36c5f0" />
    <path d="M17.83 5.83a1.08 1.08 0 0 0-1.87-.54l-.07.06.07.54a1.08 1.08 0 0 0 .81.27h1.06v-.33z" fill="#ecb22e" />
  </svg>
);

const Gmail: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="#ea4335" strokeWidth="1.6" fill="none" />
    <path d="M2.5 6.5L12 13l9.5-6.5" stroke="#ea4335" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M2 19l7-6.5M22 19l-7-6.5" stroke="#4285f4" strokeWidth="1.4" strokeLinecap="round" />
    <rect x="2" y="5" width="4" height="14" rx="1" fill="#4285f4" fillOpacity="0.12" />
    <rect x="18" y="5" width="4" height="14" rx="1" fill="#4285f4" fillOpacity="0.12" />
  </svg>
);

const GitHub: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
  </svg>
);

const Notion: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M3.47 4.56L5.24 3h13.52l1.77 1.56v14.88l-1.77 1.56H5.24l-1.77-1.56V4.56zm3.37 1.69v11.5h10.32V6.25H6.84zm2.09 2.36h6.14v1.37H8.93V8.61zm0 2.59h6.14v1.37H8.93V11.2zm0 2.59h4.1v1.37H8.93V13.79z" fill="#191919" />
  </svg>
);

const Discord: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.378-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.319 13.555.099 17.947a.08.08 0 0 0 .031.055 20.02 20.02 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.461-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.077.077 0 0 1-.008-.125c.125-.094.25-.192.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.123.095.246.193.372.287a.077.077 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.076.076 0 0 0-.04.105c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.95 19.95 0 0 0 6.002-2.98.077.077 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z" fill="#5865F2" />
  </svg>
);

const Telegram: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <circle cx="12" cy="12" r="10" fill="#229ED9" />
    <path d="M6.5 12.5l10.5-4.5-2 11-3.5-3-2 2v-1l-4-3.5 1-2z" fill="#fff" />
  </svg>
);

const Linear: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5" fill="#5E6AD2" />
    <path d="M7 17l10-10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const Airtable: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M12.56 5.2c-.17-.05-.17-.05 0 0L4 8.3v.04l8.5 5.76L21 8.34V8.3l-8.44-3.1z" fill="#F82B60" />
    <path d="M3.9 8.5L12 11.8 8.56 14.14 3.9 11.2V8.5z" fill="#18BFFF" />
    <path d="M12 11.8l8.1-3.3v2.7l-3.54 2.34L12 11.8z" fill="#FFB400" />
    <path d="M8.56 14.14 12 11.8v7.1c-.1.04-.4.18-1.06.36-.98.27-2.37.58-2.44.6l-0.01-3.6z" fill="#72DDC3" />
    <path d="M12 11.8l3.4 2.34 3.54 2.36v-1.7c.04-1.2.1-2.6-.14-4.7l-3.54 1.7L12 11.8z" fill="#18BFFF" fillOpacity="0.7" />
  </svg>
);

const GoogleCalendar: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect x="3" y="4" width="18" height="17" rx="2" stroke="#4285F4" strokeWidth="1.4" fill="#fff" />
    <rect x="3" y="4" width="18" height="5.5" rx="2" fill="#4285F4" />
    <path d="M8 2v4M16 2v4" stroke="#3367D6" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 13.5l2.2 2.2 4.3-4.4" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GoogleSheets: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect x="3" y="4" width="18" height="17" rx="2" stroke="#0F9D58" strokeWidth="1.4" fill="#fff" />
    <rect x="3" y="4" width="18" height="5.5" rx="2" fill="#0F9D58" />
    <path d="M3 12.5h18M3 17h18M12 9.5v11.5" stroke="#0F9D58" strokeWidth="1.2" />
  </svg>
);

const GoogleDrive: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M8.1 4h7.8L22 12H14.2L8.1 4z" fill="#0F9D58" />
    <path d="M16.5 12L22 12l-3.9 6.5H9.4l1.8-6.5h5.3z" fill="#FFCD40" />
    <path d="M5.1 4l3.9 8-3.9 8H1.3l-3.9-8 3.9-8h3.8z" fill="#4285F4" />
    <path d="M10.2 20.5 2.5 12 5.1 4 13 12l-2.8 8.5z" fill="#EA4335" fillOpacity="0.7" />
  </svg>
);

const Stripe: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#635BFF" />
    <path d="M12.1 7.5c0-.6.5-.8 1.3-.8 1.2 0 2.7.4 3.9 1V5.2C15.6 4.6 14.2 4.3 12.9 4.3c-3 0-5 1.6-5 4.3 0 4.2 5.8 3.5 5.8 5.3 0 .7-.6.9-1.5.9-1.3 0-3-.5-4.3-1.4v2.6c1.4.6 2.9.9 4.3.9 3.1 0 5.2-1.5 5.2-4.3-.1-4.5-5.8-3.7-5.8-5.4z" fill="#fff" />
  </svg>
);

const Asana: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <circle cx="8.5" cy="7" r="2.5" fill="#F06A6A" />
    <circle cx="15.5" cy="7" r="2.5" fill="#F06A6A" />
    <circle cx="15.5" cy="17" r="2.5" fill="#F06A6A" />
  </svg>
);

const Trello: ComponentType<BrandProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#0079BF" />
    <rect x="5" y="5" width="7" height="9" rx="1" fill="#fff" />
    <rect x="13" y="5" width="6" height="6" rx="1" fill="#fff" />
  </svg>
);

// ──────────────── registry ────────────────

const BRAND_LOGOS: Record<string, ComponentType<BrandProps>> = {
  slack: Slack,
  gmail: Gmail,
  github: GitHub,
  notion: Notion,
  discord: Discord,
  telegram: Telegram,
  linear: Linear,
  airtable: Airtable,
  "google-calendar": GoogleCalendar,
  "google-sheets": GoogleSheets,
  "google-drive": GoogleDrive,
  stripe: Stripe,
  asana: Asana,
  trello: Trello,
};

/**
 * Returns the hand-rolled brand component for a slug, or `null` when no brand mark exists.
 *
 * React Compiler safety: the returned component type is always a top-level import, resolved
 * statically in the component below — never a dynamic constructor created at render time.
 */
export function brandLogo(icon: string): ComponentType<BrandProps> | null {
  return BRAND_LOGOS[icon] ?? null;
}
