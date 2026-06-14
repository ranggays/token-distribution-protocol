import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";

type CardItem = {
  title: string;
  description: string;
  to: string;
  meta?: string;
};

const collections: CardItem[] = [
  {
    title: "Getting Started",
    description:
      "Install dependencies, build the program, and deploy to devnet in under five minutes.",
    to: "/docs/getting-started",
    meta: "2 articles",
  },
  {
    title: "Vesting Schedules",
    description:
      "Linear, cliff, cliff+linear, and milestone release. Choose the right schedule for your token distribution.",
    to: "/docs/vesting/overview",
    meta: "5 articles",
  },
  {
    title: "Streams",
    description:
      "Create, withdraw from, and cancel token streams. Authority models and cancellation policies.",
    to: "/docs/streams/create",
    meta: "4 articles",
  },
];

const reference: CardItem[] = [
  {
    title: "SDK Reference",
    description:
      "TypeScript client library for interacting with the Velora program. PDAs, instructions, and type definitions.",
    to: "/docs/reference/sdk-overview",
    meta: "6 articles",
  },
  {
    title: "Architecture",
    description:
      "PDA derivation, token flow diagrams, schedule logic formulas, and the authority model.",
    to: "/docs/architecture",
    meta: "On-chain design",
  },
  {
    title: "Account Reference",
    description:
      "StreamConfig and ClaimReceipt account layouts, field descriptions, and space budgets.",
    to: "/docs/reference/accounts",
    meta: "Data structures",
  },
  {
    title: "Error Codes",
    description:
      "Complete list of on-chain error codes, their meanings, and how to resolve them.",
    to: "/docs/reference/errors",
    meta: "14 error codes",
  },
];

function CardsSection({
  heading,
  items,
}: {
  heading: string;
  items: CardItem[];
}) {
  return (
    <section style={{ marginBottom: "3rem" }}>
      <h2
        style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--velora-text-muted)",
          marginBottom: "1rem",
        }}
      >
        {heading}
      </h2>
      <div className="velora-cards-grid">
        {items.map((item) => (
          <Link key={item.to} className="velora-card" to={item.to}>
            <h3 className="velora-card__title">{item.title}</h3>
            <p className="velora-card__description">{item.description}</p>
            {item.meta && <span className="velora-card__meta">{item.meta}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header
      style={{
        padding: "4rem 0 3rem",
        textAlign: "left",
        maxWidth: "680px",
      }}
    >
      <h1
        style={{
          fontWeight: 300,
          fontSize: "clamp(2.5rem, 5vw, 3.8rem)",
          lineHeight: 1.1,
          color: "var(--velora-text)",
          marginBottom: "1rem",
        }}
      >
        {siteConfig.title}
      </h1>
      <p
        style={{
          fontSize: "1.15rem",
          lineHeight: 1.6,
          color: "var(--velora-text-muted)",
          maxWidth: "560px",
        }}
      >
        {siteConfig.tagline}. Lock SPL tokens into on-chain vaults and release
        them on configurable schedules: linear, cliff, cliff+linear, or
        milestone.
      </p>
      <div style={{ display: "flex", gap: "12px", marginTop: "2rem" }}>
        <Link
          className="button button--primary button--lg"
          to="/docs/getting-started"
          style={{
            borderRadius: "6px",
            fontWeight: 500,
            fontSize: "0.95rem",
          }}
        >
          Get Started
        </Link>
        <Link
          className="button button--secondary button--lg"
          to="/docs/architecture"
          style={{
            borderRadius: "6px",
            fontWeight: 500,
            fontSize: "0.95rem",
          }}
        >
          Architecture
        </Link>
      </div>
    </header>
  );
}

export default function Home(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Docs"
      description="Velora token vesting protocol documentation"
    >
      <Head>
        <meta property="og:title" content={`${siteConfig.title} — Velora`} />
        <meta property="og:description" content={siteConfig.tagline} />
      </Head>
      <main
        style={{
          padding: "0 min(5vw, 72px) 96px",
          maxWidth: "1200px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <HomepageHeader />
        <CardsSection heading="Guides" items={collections} />
        <CardsSection heading="Reference" items={reference} />
        <section
          style={{
            marginTop: "2rem",
            padding: "24px 28px",
            background: "var(--velora-surface)",
            border: "1px solid var(--velora-border)",
            borderRadius: "6px",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 500,
              marginBottom: "8px",
              color: "var(--velora-text)",
            }}
          >
            Quick Links
          </h2>
          <div
            style={{
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
              fontSize: "0.9rem",
            }}
          >
            <Link to="/docs/glossary" style={{ color: "var(--velora-accent)" }}>
              Glossary
            </Link>
            <Link
              to="/docs/troubleshooting"
              style={{ color: "var(--velora-accent)" }}
            >
              Troubleshooting
            </Link>
            <Link
              to="/docs/reference/errors"
              style={{ color: "var(--velora-accent)" }}
            >
              Error Codes
            </Link>
            <a
              href="https://github.com/ranggays/token-distribution-protocol"
              style={{ color: "var(--velora-accent)" }}
            >
              GitHub ↗
            </a>
          </div>
        </section>
      </main>
    </Layout>
  );
}
