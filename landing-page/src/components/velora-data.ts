import type {
  ActionLink,
  CapabilityColumn,
  NavItem,
  ScheduleTextItem,
} from "@/types/velora";

export const navItems: NavItem[] = [
  {
    label: "Docs",
    href: "https://velora-1.gitbook.io/docs/",
  },
  { label: "Open App", href: "/app", cta: true },
];

export const heroLinks: ActionLink[] = [
  { label: "Explore use cases", href: "#use-cases" },
  { label: "Open app", href: "/app" },
];

export const introActions: ActionLink[] = [
  { label: "View schedules", href: "#schedules" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Open app", href: "/app" },
];

export const capabilities: CapabilityColumn[] = [
  {
    title: "Create",
    items: [
      "Choose a recipient",
      "Set the total token amount",
      "Pick a release schedule",
      "Define cancellation rules",
    ],
  },
  {
    title: "Lock",
    items: [
      "Tokens move into a controlled distribution vault",
      "Release rules are fixed up front",
      "The schedule becomes visible and predictable",
    ],
  },
  {
    title: "Release",
    items: [
      "Tokens unlock by time, cliff, or milestone",
      "No manual spreadsheets or reminders",
      "Each release follows the selected schedule",
    ],
  },
  {
    title: "Claim",
    items: [
      "Recipients claim what is available",
      "Locked tokens remain protected",
      "Creators and recipients can track the distribution state",
    ],
  },
];

export const scheduleItems: ScheduleTextItem[] = [
  {
    name: "Linear",
    href: "#schedules",
    paragraphs: [
      "Linear schedules release tokens gradually from a start point to an end point.",
      "Useful for vesting, contributor rewards, and allocations that should unlock steadily over time.",
    ],
  },
  {
    name: "Cliff",
    href: "#schedules",
    paragraphs: [
      "Cliff schedules keep the full allocation locked until a single unlock moment.",
      "Useful when a grant, reward, or team allocation should become available all at once.",
    ],
  },
  {
    name: "Milestone",
    href: "#schedules",
    paragraphs: [
      "Milestone schedules release tokens after an agreed outcome or delivery point is reached.",
      "Useful for grants, project work, and payouts tied to progress instead of only time.",
    ],
  },
];
