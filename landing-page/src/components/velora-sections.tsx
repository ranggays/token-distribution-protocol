import Image from "next/image";
import Link from "next/link";

import { ActionRow } from "@/components/action-row";
import { HeroKineticCanvas } from "@/components/hero-kinetic-canvas";
import { VeloraWaitlist } from "@/components/velora-waitlist";
import {
  capabilities,
  heroLinks,
  introActions,
  scheduleItems,
} from "@/components/velora-data";
import { VisionDistortionCanvas } from "@/components/vision-distortion-canvas";

const veloraLogoSrc = "/images/velora/icons/velora4.webp";

export function HeroSection() {
  return (
    <header className="velora-hero header" id="overview">
      <div className="rgb-kinetic rgbKineticSlider" aria-hidden="true">
        <HeroKineticCanvas />
      </div>
      <div className="mouse-light" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-title-row">
          <div className="hero-title header-title-effects">
            <h1>Velora - Plan Token Releases That Unlock on Schedule</h1>
            <h2>
              Plan token
              <br />
              releases that
              <br />
              unlock on schedule.
            </h2>
          </div>
          <p className="scroll-downer">scroll down</p>
        </div>
        <span className="hero-line header-line" aria-hidden="true" />
        <div className="hero-fast-links fast-container">
          <div className="fast-buttons">
          {heroLinks.map((link) => (
            <Link href={link.href} key={link.label}>
              {link.label}
            </Link>
          ))}
          </div>
        </div>
      </div>
    </header>
  );
}

export function IntroSection() {
  return (
    <section className="intro-section intro">
      <span className="section-anchor" id="use-cases" aria-hidden="true" />
      <div className="motion-reveal" data-duration="1.5">
        <IntroRevealHeading text="Create a token release plan." />
        <IntroRevealHeading text="Lock the tokens in the vault." />
        <IntroRevealHeading text="Let recipients claim over time." />
        <p>
          Velora helps projects distribute tokens without manual tracking. <br />
          Creators choose the amount, recipient, and unlock schedule. <br />
          The program holds the tokens and releases them when they become claimable.
        </p>
      </div>
      <ActionRow actions={introActions} className="intro-actions intro-content-action motion-reveal" />
    </section>
  );
}

function IntroRevealHeading({ text }: { text: string }) {
  const words = text.split(" ");

  return (
    <h2 className="intro-reveal-line" aria-label={text}>
      {words.map((word, wordIndex) => (
        <span aria-hidden="true" key={`${word}-${wordIndex}`}>
          <span className="intro-reveal-word">
            {Array.from(word).map((char, charIndex) => (
              <span className="intro-reveal-char" key={`${char}-${wordIndex}-${charIndex}`}>
                {char}
              </span>
            ))}
          </span>
          {wordIndex < words.length - 1 ? " " : null}
        </span>
      ))}
    </h2>
  );
}

export function CapabilitiesSection() {
  return (
    <section className="capabilities-section capabilities">
      <span className="section-anchor" id="how-it-works" aria-hidden="true" />
      <div className="section-title motion-reveal" data-duration="2" data-delay="0.1">
        <h2>How It Works</h2>
      </div>
      <div className="capability-grid">
        {capabilities.map((column, index) => (
          <article className="capability-column" key={column.title}>
            <h3 className="motion-reveal" data-duration="1.8" data-delay={0.45 + index * 0.12}>
              {column.title}
            </h3>
            <div
              className="motion-reveal"
              data-duration={1.8 + index * 0.12}
              data-delay={0.62 + index * 0.12}
            >
              {column.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CasesSection() {
  return (
    <section className="cases-section cases">
      <span className="section-anchor" id="schedules" aria-hidden="true" />
      <div className="cases-title motion-reveal" data-duration="2" data-delay="0.1">
        <h2>Release Schedules</h2>
      </div>
      <div className="client-list">
        {scheduleItems.map((item, index) => (
          <article
            className="client-company motion-reveal"
            data-duration={2 + index * 0.4}
            data-delay={0.05 + index * 0.05}
            key={item.name}
          >
            <Link className="schedule-text-link" href={item.href}>
              {item.name}
            </Link>
            <div className="company-text">
              <p>
                <strong>{item.name}</strong>
                {item.paragraphs[0].replace(item.name, "")}
              </p>
              <p>{item.paragraphs[1]}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function VisionSection() {
  return (
    <section className="vision-section vision">
      <span className="section-anchor" id="security" aria-hidden="true" />
      <div className="vision-content">
        <div className="vision-title">
          <div>
            <div className="motion-reveal" data-duration="2" data-delay="0.02">
              <h2>Built around</h2>
            <div className="vision-title-sub">
              <div className="vision-words">
                <ul>
                  <li>clarity</li>
                  <li>control</li>
                  <li>trust</li>
                </ul>
              </div>
            </div>
            <h2>for token releases.</h2>
            </div>
            <p>
              Velora keeps every release plan clear before tokens move. <br />
              The schedule is set by the creator, the tokens stay locked in the
              vault, and recipients can only claim the amount that has unlocked.
            </p>
          </div>
          <div className="vision-action motion-reveal" data-duration="2" data-delay="0.16">
            <p>Review the current protocol verification.</p>
            <div className="vision-action-row">
              <div className="velora-action">
                <span className="velora-rule" />
                <Link className="velora-action-link magnet-effect" href="/security">
                  <span>Open security evidence</span>
                  <Image
                    src="/images/velora/icons/chevron-right.svg"
                    alt=""
                    width={24}
                    height={24}
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div
          className="vision-distortion distortion motion-reveal"
          data-duration="2.2"
          data-delay="0.18"
          aria-hidden="true"
        >
          <VisionDistortionCanvas />
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section className="contact-section">
      <div className="contact-bg" aria-hidden="true" />
      <div className="contact-shadow" aria-hidden="true" />
      <div className="contact-content contact-content-container">
        <div className="contact-title motion-reveal" data-duration="2" data-delay="0.1">
          <h2>
            <span>Create</span> <strong>token</strong> <span>schedules</span>
          </h2>
          <h2>
            <span>Let</span> <strong>recipients</strong> <span>claim</span>
          </h2>
        </div>
        <VeloraWaitlist />
      </div>
    </section>
  );
}

export function VeloraFooter() {
  return (
    <footer className="velora-footer">
      <div className="footer-container">
        <div className="footer-logo-block">
          <div className="velora-logo footer-velora-logo" aria-label="Velora">
            <Image
              className="velora-logo-icon"
              src={veloraLogoSrc}
              alt=""
              width={48}
              height={48}
            />
            <span className="velora-logo-wordmark">Velora</span>
          </div>
          <div className="company-info">
            <p>Velora token release workspace</p>
            <p>Programmable token releases</p>
            <p>Team 5 - Mancer x Superteam Indonesia</p>
          </div>
        </div>
        <FooterLinks
          links={[
            { label: "overview", href: "#overview" },
            { label: "use cases", href: "#use-cases" },
            { label: "schedules", href: "#schedules" },
          ]}
        />
        <FooterLinks
          links={[
            { label: "how it works", href: "#how-it-works" },
            { label: "security", href: "#security" },
            { label: "open app", href: "/app" },
          ]}
        />
        <div className="footer-links">
          <p>Resources</p>
          <Link
            className="magnet-effect"
            href="https://velora.gitbook.io"
          >
            docs
          </Link>
          <Link
            className="magnet-effect"
            href="https://github.com/ranggays/token-distribution-protocol"
          >
            github
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <div className="footer-links">
      {links.map((link) => (
        <Link className="magnet-effect" href={link.href} key={link.label}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}
