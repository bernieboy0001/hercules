// The curated Integrations page catalogue. The Composio key row's `meta.toolkits` (captured when
// the key was tested, CLAUDE.md rule 11) is the set of apps that key can actually reach, so the
// viewer renders the union of this catalogue and that list — an entry whose slug a key happens
// not to offer simply never renders, and "Browse all" covers everything the catalogue does not.
//
// Slugs are Composio *toolkit* slugs (the ones `fetchToolkits` returns and the link route sends),
// not this app's connector providers. UI data only: no connector code, no Node imports.

export type IntegrationCategory =
  | "communication"
  | "productivity"
  | "data"
  | "engineering"
  | "payments";

export type CategoryFilter = "all" | IntegrationCategory;

export const INTEGRATION_CATEGORIES: Record<CategoryFilter, string> = {
  all: "All apps",
  communication: "Communication",
  productivity: "Productivity",
  data: "Data",
  engineering: "Engineering",
  payments: "Payments",
};

export const CATEGORY_ORDER: readonly CategoryFilter[] = [
  "all",
  "communication",
  "productivity",
  "data",
  "engineering",
  "payments",
];

/** One app card. `slug` is the Composio toolkit slug; `icon` names a hand-rolled brand mark. */
export type IntegrationApp = {
  slug: string;
  name: string;
  tagline: string;
  category: IntegrationCategory;
  /** The brand mark in `brand-logos.tsx`. Absent slides the card back to a letter tile. */
  icon?: string;
};

export const INTEGRATION_APPS: readonly IntegrationApp[] = [
  {
    slug: "slack",
    name: "Slack",
    tagline: "Post to channels, read messages, and approve steps where the team already works.",
    category: "communication",
    icon: "slack",
  },
  {
    slug: "gmail",
    name: "Gmail",
    tagline: "Send, search and triage email in the account you signed in with.",
    category: "productivity",
    icon: "gmail",
  },
  {
    slug: "github",
    name: "GitHub",
    tagline: "Open issues, review pull requests, and drive repositories from a workflow.",
    category: "engineering",
    icon: "github",
  },
  {
    slug: "notion",
    name: "Notion",
    tagline: "Create pages, update databases, and post results into your team's workspace.",
    category: "productivity",
    icon: "notion",
  },
  {
    slug: "discord",
    name: "Discord",
    tagline: "Send messages and read activity in servers and threads.",
    category: "communication",
    icon: "discord",
  },
  {
    slug: "telegram",
    name: "Telegram",
    tagline: "Deliver notifications and replies to a chat that is always in your pocket.",
    category: "communication",
    icon: "telegram",
  },
  {
    slug: "linear",
    name: "Linear",
    tagline: "Create and update issues, and keep an engineering backlog moving.",
    category: "engineering",
    icon: "linear",
  },
  {
    slug: "airtable",
    name: "Airtable",
    tagline: "Read and write the tables that hold your team's structured data.",
    category: "data",
    icon: "airtable",
  },
  {
    slug: "googlecalendar",
    name: "Google Calendar",
    tagline: "Check availability, create events, and rebook meetings automatically.",
    category: "productivity",
    icon: "google-calendar",
  },
  {
    slug: "googlesheets",
    name: "Google Sheets",
    tagline: "Append rows, read ranges, and turn live sheets into workflow data.",
    category: "productivity",
    icon: "google-sheets",
  },
  {
    slug: "googledrive",
    name: "Google Drive",
    tagline: "Find and organise files across a shared drive.",
    category: "data",
    icon: "google-drive",
  },
  {
    slug: "stripe",
    name: "Stripe",
    tagline: "Watch payments, refund charges, and act on customer financial events.",
    category: "payments",
    icon: "stripe",
  },
  {
    slug: "asana",
    name: "Asana",
    tagline: "Create tasks and keep projects up to date from inside a run.",
    category: "productivity",
    icon: "asana",
  },
  {
    slug: "trello",
    name: "Trello",
    tagline: "Move cards and update boards so the status of every job stays visible.",
    category: "productivity",
    icon: "trello",
  },
];

const bySlug = new Map(INTEGRATION_APPS.map((app) => [app.slug, app]));

/** The curated entry for a toolkit slug, or null when the catalogue does not cover it. */
export function integrationAppFor(slug: string): IntegrationApp | null {
  return bySlug.get(slug) ?? null;
}