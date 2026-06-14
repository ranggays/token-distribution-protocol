import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Velora Docs",
  tagline: "Token vesting protocol on Solana",
  favicon: "img/favicon.ico",

  url: "https://docs.velora.dev",
  baseUrl: "/",

  organizationName: "ranggays",
  projectName: "token-distribution-protocol",

  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/ranggays/token-distribution-protocol/tree/main/docs/",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/velora-social-card.png",
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Velora",
      logo: {
        alt: "Velora Logo",
        src: "img/velora-logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "guideSidebar",
          position: "left",
          label: "Guides",
        },
        {
          type: "docSidebar",
          sidebarId: "referenceSidebar",
          position: "left",
          label: "Reference",
        },
        {
          href: "https://github.com/ranggays/token-distribution-protocol",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Getting Started", to: "/docs/getting-started" },
            { label: "Architecture", to: "/docs/architecture" },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/ranggays/token-distribution-protocol",
            },
          ],
        },
        {
          title: "More",
          items: [
            { label: "Velora App", href: "https://velora.dev" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Velora. Built by Team 5 — Mancer × Superteam Indonesia.`,
    },
    prism: {
      theme: prismThemes.nightOwl,
      darkTheme: prismThemes.nightOwl,
      additionalLanguages: ["rust", "toml", "bash"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
