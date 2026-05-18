"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { navItems } from "@/components/velora-data";

const veloraLogoSrc = "/images/velora/icons/velora4.webp";

export function VeloraNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <section className="desktop-nav" aria-label="Primary navigation">
        <div className="desktop-nav-logo-container">
          <Link className="nav-logo-large velora-logo" href="/">
            <Image
              className="velora-logo-icon"
              src={veloraLogoSrc}
              alt=""
              width={48}
              height={48}
              priority
            />
            <span className="velora-logo-wordmark">Velora</span>
          </Link>
          <Link className="nav-logo-small velora-logo-compact" href="/">
            <Image
              className="velora-logo-icon"
              src={veloraLogoSrc}
              alt="Velora"
              width={40}
              height={40}
              priority
            />
          </Link>
        </div>
        <div className="desktop-nav-buttons-container">
          <ul className="desktop-nav-buttons">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  className={item.cta ? "desktop-nav-cta magnet-effect" : "magnet-effect"}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="desktop-nav-hr-container" aria-hidden="true">
            <div className="desktop-nav-hr" />
          </div>
        </div>
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <div className="mobile-nav-wrapper">
          <Link className="velora-logo" href="/">
            <Image
              className="velora-logo-icon"
              src={veloraLogoSrc}
              alt=""
              width={48}
              height={48}
              priority
            />
            <span className="velora-logo-wordmark">Velora</span>
          </Link>
          <details
            className="mobile-menu"
            onToggle={(event) => setIsMobileMenuOpen(event.currentTarget.open)}
            open={isMobileMenuOpen}
          >
            <summary
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={(event) => {
                event.preventDefault();
                setIsMobileMenuOpen((current) => !current);
              }}
            >
              <Image
                src="/images/velora/icons/hamburger-white.svg"
                alt=""
                width={24}
                height={18}
              />
            </summary>
            <div className="mobile-menu-panel">
              <div className="mobile-menu-header">
                <Image
                  className="velora-logo-icon"
                  src={veloraLogoSrc}
                  alt="Velora"
                  width={40}
                  height={40}
                />
                <button
                  aria-label="Close menu"
                  className="mobile-menu-close"
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Image
                  src="/images/velora/icons/close.svg"
                  alt=""
                  width={22}
                  height={22}
                />
                </button>
              </div>
              <div className="mobile-menu-links">
                {navItems.map((item) => (
                  <Link
                    href={item.href}
                    key={item.label}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label.toLowerCase()}
                  </Link>
                ))}
              </div>
              <div className="mobile-menu-social">
                <Link
                  href="https://github.com/ranggays/token-distribution-protocol"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  github
                </Link>
                <Link
                  href="https://github.com/ranggays/token-distribution-protocol#readme"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  readme
                </Link>
              </div>
            </div>
          </details>
        </div>
      </nav>
    </>
  );
}
