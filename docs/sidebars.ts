import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  guideSidebar: [
    "index",
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: ["getting-started", "quick-start"],
    },
    {
      type: "category",
      label: "Vesting Schedules",
      collapsed: false,
      items: [
        "vesting/overview",
        "vesting/linear",
        "vesting/cliff",
        "vesting/cliff-linear",
        "vesting/milestone",
      ],
    },
    {
      type: "category",
      label: "Streams",
      items: [
        "streams/create",
        "streams/withdraw",
        "streams/cancel",
        "streams/authority",
      ],
    },
  ],
  referenceSidebar: [
    {
      type: "category",
      label: "SDK Reference",
      collapsed: false,
      items: [
        "reference/sdk-overview",
        "reference/sdk-stream-config",
        "reference/sdk-derive-pdas",
        "reference/sdk-create-stream",
        "reference/sdk-withdraw",
        "reference/sdk-cancel",
      ],
    },
    {
      type: "category",
      label: "On-Chain",
      items: ["architecture", "reference/accounts", "reference/errors"],
    },
    {
      type: "category",
      label: "Help",
      items: ["troubleshooting", "glossary"],
    },
  ],
};

export default sidebars;
