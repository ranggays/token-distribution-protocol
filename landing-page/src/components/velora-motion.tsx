"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

export function VeloraMotion() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    const finePointer = window.matchMedia("(pointer: fine)");
    const hasCustomCursor = finePointer.matches;

    if (hasCustomCursor) {
      document.body.classList.add("has-custom-cursor");
    }

    const root = document.documentElement;
    const mouse = { x: window.innerWidth / 3, y: window.innerHeight / 3 };
    const current = { x: mouse.x, y: mouse.y };
    const velocity = { x: 0, y: 0 };
    const skew = { x: 0, y: 0 };
    const smoothScroll = { current: window.scrollY, target: window.scrollY };
    const navCompactState = { active: false };

    const mouseLight = document.querySelector<HTMLElement>(".mouse-light");
    const cursorDot = document.querySelector<HTMLElement>(".cursor-dot");
    const cursorRing = document.querySelector<HTMLElement>(".cursor-ring");
    const headerTitle = document.querySelector<HTMLElement>(".header-title-effects");
    const headerLine = document.querySelector<HTMLElement>(".header-line");
    const fastContainer = document.querySelector<HTMLElement>(".fast-container");
    const fastButtons = document.querySelector<HTMLElement>(".fast-buttons");
    const navHr = document.querySelector<HTMLElement>(".desktop-nav-hr-container");
    const navLine = document.querySelector<HTMLElement>(".desktop-nav-hr");
    const navButtons = document.querySelector<HTMLElement>(".desktop-nav-buttons");
    const navLogoLarge = document.querySelector<HTMLElement>(".nav-logo-large");
    const navLogoSmall = document.querySelector<HTMLElement>(".nav-logo-small");
    const introAction = document.querySelector<HTMLElement>(".intro-content-action");
    const capabilities = document.querySelector<HTMLElement>(".capabilities");
    const cases = document.querySelector<HTMLElement>(".cases");
    const contactBg = document.querySelector<HTMLElement>(".contact-bg");
    const contactContent =
      document.querySelector<HTMLElement>(".contact-content-container");
    const kinetic = document.querySelector<HTMLElement>(".rgbKineticSlider");
    const introSection = document.querySelector<HTMLElement>(".intro-section");
    const introHeadingChars = gsap.utils.toArray<HTMLElement>(".intro-reveal-char");
    const introCopy = document.querySelector<HTMLElement>(".intro-section > div > p");

    const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

    const handleMouseMove = (event: MouseEvent) => {
      velocity.x = event.movementX;
      velocity.y = event.movementY;
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      skew.x = event.clientX - window.innerWidth / 2;
      skew.y = event.clientY - window.innerHeight / 2;
      root.style.setProperty("--mouse-x", `${event.clientX}px`);
      root.style.setProperty("--mouse-y", `${event.clientY}px`);
    };

    const handleScroll = () => {
      smoothScroll.target = window.scrollY;
    };

    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>("a, button, summary, .link"),
    );
    const magnetElements = Array.from(
      document.querySelectorAll<HTMLElement>(".magnet-effect"),
    );

    const enterHandlers: Array<() => void> = [];
    const leaveHandlers: Array<() => void> = [];
    const magnetThreshold = 100;
    const magnetStrength = 1;

    interactive.forEach((element) => {
      const onEnter = () => {
        gsap.to(cursorRing, {
          width: 54,
          height: 54,
          opacity: 0.45,
          duration: 0.25,
          ease: "power2.out",
        });
      };
      const onLeave = () => {
        gsap.to(cursorRing, {
          width: 28,
          height: 28,
          opacity: 0.75,
          duration: 0.25,
          ease: "power2.out",
        });
      };
      element.addEventListener("mouseenter", onEnter);
      element.addEventListener("mouseleave", onLeave);
      enterHandlers.push(() => element.removeEventListener("mouseenter", onEnter));
      leaveHandlers.push(() => element.removeEventListener("mouseleave", onLeave));
    });

    magnetElements.forEach((element) => {
      if (getComputedStyle(element).position === "static") {
        element.style.position = "relative";
      }
    });

    const resetMagnetElements = () => {
      magnetElements.forEach((element) => {
        gsap.to(element, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 1.4,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    };

    const getAnchorScrollFactor = (hash: string) => {
      if (hash === "#how-it-works") return 1.36;
      if (hash === "#schedules") return 1.16;
      return 1;
    };

    const getLayoutTop = (element: HTMLElement) => {
      let top = 0;
      let current: HTMLElement | null = element;

      while (current) {
        top += current.offsetTop;
        current = current.offsetParent as HTMLElement | null;
      }

      return top;
    };

    const handleAnchorClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );

      if (!link) return;

      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return;

      event.preventDefault();
      document
        .querySelectorAll<HTMLDetailsElement>(".mobile-menu[open]")
        .forEach((menu) => {
          menu.open = false;
        });

      const layoutTop = getLayoutTop(target);
      const scrollOffset = window.innerWidth <= 900 ? 72 : 110;
      const nextScroll = Math.max(
        0,
        (layoutTop - scrollOffset) / getAnchorScrollFactor(hash),
      );

      smoothScroll.target = nextScroll;
      gsap.to(window, {
        scrollTo: nextScroll,
        duration: 0.95,
        ease: "power3.out",
        onUpdate: () => {
          smoothScroll.target = window.scrollY;
        },
        onComplete: () => {
          smoothScroll.current = window.scrollY;
          smoothScroll.target = window.scrollY;
          window.history.replaceState(null, "", hash);
        },
      });
    };

    const handleMagnetMove = (event: MouseEvent) => {
      if (window.innerWidth <= 1000) return;

      magnetElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = event.clientX - centerX;
        const deltaY = event.clientY - centerY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance < magnetThreshold) {
          const pull = 1 - distance / magnetThreshold;
          gsap.to(element, {
            x: deltaX * magnetStrength * pull,
            y: deltaY * magnetStrength * pull,
            scale: 1 + pull * 0.01,
            duration: 1.2,
            ease: "expo.out",
            overwrite: "auto",
          });
        } else {
          gsap.to(element, {
            x: 0,
            y: 0,
            scale: 1,
            duration: 1.4,
            ease: "power3.out",
            overwrite: "auto",
          });
        }
      });
    };

    const revealElements = gsap.utils.toArray<HTMLElement>(".motion-reveal");
    revealElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const isAlreadyInViewport = rect.top < window.innerHeight * 0.92;

      gsap.fromTo(
        element,
        {
          autoAlpha: isAlreadyInViewport ? 1 : 0,
          y: isAlreadyInViewport ? 0 : 42,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: Number(element.dataset.duration ?? 1.3),
          delay: Number(element.dataset.delay ?? 0),
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 128%",
            toggleActions: "play none none reverse",
          },
        },
      );
    });

    if (introSection && introHeadingChars.length > 0) {
      gsap.fromTo(
        introHeadingChars,
        {
          color: "rgb(56, 56, 55)",
        },
        {
          color: "rgb(255, 254, 234)",
          duration: 0.3,
          stagger: 0.012,
          ease: "none",
          scrollTrigger: {
            trigger: introSection,
            start: "top 82%",
            end: "top 28%",
            scrub: 1,
            toggleActions: "play play reverse reverse",
          },
        },
      );
    }

    if (introCopy) {
      gsap.fromTo(
        introCopy,
        { opacity: 0.18, y: 24 },
        {
          opacity: 0.4,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: introCopy,
            start: "top 92%",
            end: "top 64%",
            scrub: 0.65,
          },
        },
      );
    }

    const ticker = () => {
      const isHeroActive = window.scrollY < window.innerHeight;
      current.x += (mouse.x - current.x) * 0.03;
      current.y += (mouse.y - current.y) * 0.03;
      velocity.x *= 0.86;
      velocity.y *= 0.86;
      smoothScroll.current += (smoothScroll.target - smoothScroll.current) * 0.2;

      if (mouseLight && isHeroActive) {
        mouseLight.style.setProperty("--cursor-x", `${current.x}px`);
        mouseLight.style.setProperty("--cursor-y", `${current.y}px`);
      }

      if (cursorDot) {
        gsap.set(cursorDot, { x: current.x, y: current.y });
      }
      if (cursorRing) {
        gsap.set(cursorRing, {
          x: current.x,
          y: current.y,
          xPercent: -50,
          yPercent: -50,
        });
      }

      const moveX = skew.x;
      const moveY = skew.y;
      const scrollY = smoothScroll.current;
      const rawScrollY = window.scrollY;
      const isMobile = window.innerWidth <= 900;
      const heroFade = clamp01(1 - rawScrollY / (window.innerHeight * 0.42));
      const heroSurfaceFade = clamp01(
        1 - rawScrollY / (window.innerHeight * 0.82),
      );
      const navProgress = clamp01((rawScrollY - 160) / 280);
      const navShouldCompact = rawScrollY >= 300;

      if (navLogoLarge && navLogoSmall) {
        gsap.set(navLogoLarge, { opacity: 1 - navProgress });
        gsap.set(navLogoSmall, { opacity: navProgress });
      }

      if (navHr && navButtons && navLine && navShouldCompact !== navCompactState.active) {
        navCompactState.active = navShouldCompact;

        gsap.to(navHr, {
          opacity: navShouldCompact ? 1 : 0,
          duration: navShouldCompact ? 0.35 : 0.2,
          ease: "power2.out",
        });
        gsap.to(navLine, {
          scaleX: navShouldCompact ? 1 : 0,
          transformOrigin: "right center",
          duration: 1.8,
          ease: "power3.out",
        });
        gsap.to(navButtons, {
          opacity: navShouldCompact ? 0 : 1,
          duration: 0.55,
          ease: "power2.out",
          onStart: () => {
            if (!navShouldCompact) navButtons.style.pointerEvents = "auto";
          },
          onComplete: () => {
            navButtons.style.pointerEvents = navShouldCompact ? "none" : "auto";
          },
        });
      }

      if (!isMobile) {
        if (kinetic) {
          gsap.set(kinetic, {
            x: 0,
            y: scrollY * 0.6,
            opacity: Math.max(0.01, heroSurfaceFade),
            scale: 1.12 + Math.sin(performance.now() * 0.0012) * 0.012,
            "--wave-x": `${50 + moveX * 0.012}%`,
            "--wave-y": `${50 + moveY * 0.012}%`,
            "--reveal-x": `${current.x}px`,
            "--reveal-y": `${current.y}px`,
            "--distort-x": `${-velocity.x * 2.2}px`,
            "--distort-y": `${-velocity.y * 2.2}px`,
            "--distort-inverse-x": `${velocity.x * 2.95}px`,
            "--distort-inverse-y": `${velocity.y * 2.95}px`,
          });
        }
        if (mouseLight) {
          gsap.set(mouseLight, { opacity: heroSurfaceFade });
        }
        if (headerTitle) {
          gsap.set(headerTitle, {
            x: 0,
            y: scrollY * 0.08,
            opacity: heroFade,
          });
        }
        if (headerLine) {
          gsap.set(headerLine, {
            x: 0,
            y: scrollY * 0.13,
            opacity: 0.3 * heroFade,
          });
        }
        if (fastContainer) {
          gsap.set(fastContainer, {
            x: 0,
            y: -scrollY * 0.5,
          });
        }
        if (fastButtons) {
          gsap.set(fastButtons, { opacity: heroFade });
        }
        if (introAction) gsap.set(introAction, { y: scrollY * -0.15 });
        if (capabilities) gsap.set(capabilities, { y: scrollY * -0.36 });
        if (cases) gsap.set(cases, { y: scrollY * -0.16 });
        if (contactBg) gsap.set(contactBg, { y: scrollY * 0.15, scale: 1.25 });
        if (contactContent) gsap.set(contactContent, { y: scrollY * 0.1 });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousemove", handleMagnetMove);
    document.addEventListener("mouseleave", resetMagnetElements);
    document.addEventListener("click", handleAnchorClick);
    window.addEventListener("scroll", handleScroll, { passive: true });
    gsap.ticker.add(ticker);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousemove", handleMagnetMove);
      document.removeEventListener("mouseleave", resetMagnetElements);
      document.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("scroll", handleScroll);
      if (hasCustomCursor) {
        document.body.classList.remove("has-custom-cursor");
      }
      gsap.ticker.remove(ticker);
      enterHandlers.forEach((remove) => remove());
      leaveHandlers.forEach((remove) => remove());
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <>
      <div className="cursor-dot" aria-hidden="true" />
      <div className="cursor-ring" aria-hidden="true" />
    </>
  );
}
