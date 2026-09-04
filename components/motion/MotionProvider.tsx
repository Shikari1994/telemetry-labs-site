"use client";

import { useLayoutEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/.-_";
type ReadyWindow = Window & { __telemetryReady?: boolean };

type CleanupNode = HTMLElement & { __motionCleanup?: () => void };

function scrambleElement(element: HTMLElement, duration = 680) {
  const finalText = element.dataset.scrambleText ?? element.textContent ?? "";
  const startedAt = performance.now();
  let frame = 0;

  const draw = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 2.4);
    const resolved = Math.floor(finalText.length * eased);
    let output = "";

    for (let index = 0; index < finalText.length; index += 1) {
      const char = finalText[index];
      if (/\s/.test(char)) output += char;
      else if (index < resolved || progress === 1) output += char;
      else output += SCRAMBLE_CHARS[(index * 7 + Math.floor(now / 42)) % SCRAMBLE_CHARS.length];
    }

    element.textContent = output;
    if (progress < 1) frame = requestAnimationFrame(draw);
  };

  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

export function MotionProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readyWindow = window as ReadyWindow;
    root.classList.add("motion-enabled");

    if (reduced) {
      root.classList.add("motion-reduced");
      readyWindow.__telemetryReady = true;
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) => {
        node.style.opacity = "1";
        node.style.transform = "none";
      });
      return () => root.classList.remove("motion-enabled", "motion-reduced");
    }

    const lenis = new Lenis({
      lerp: 0.068,
      wheelMultiplier: 0.9,
      touchMultiplier: 1,
      smoothWheel: true,
    });

    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onLenisScroll);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    let heroReadyHandler: (() => void) | null = null;
    let heroFallback = 0;

    const deckMedia = gsap.matchMedia();

    const ctx = gsap.context(() => {
      /* Global reveal language ------------------------------------------------ */
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
        const delay = Number(node.dataset.revealDelay ?? 0) / 1000;
        gsap.fromTo(
          node,
          { y: 42, clipPath: "inset(0 0 100% 0)" },
          {
            y: 0,
            clipPath: "inset(0 0 0% 0)",
            duration: 0.92,
            delay,
            ease: "expo.inOut",
            clearProps: "clipPath",
            scrollTrigger: { trigger: node, start: "top 91%", once: true },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-scramble]").forEach((node) => {
        let played = false;
        ScrollTrigger.create({
          trigger: node,
          start: "top 90%",
          once: true,
          onEnter: () => {
            if (played) return;
            played = true;
            scrambleElement(node, Number(node.dataset.scrambleDuration ?? 620));
            gsap.fromTo(node, { autoAlpha: 0.18 }, { autoAlpha: 1, duration: 0.44, ease: "steps(4)" });
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-flicker]").forEach((node) => {
        gsap.fromTo(
          node,
          { autoAlpha: 0.08 },
          {
            autoAlpha: 1,
            duration: 0.48,
            ease: "steps(5)",
            scrollTrigger: { trigger: node, start: "top 89%", once: true },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-line-draw]").forEach((line) => {
        gsap.fromTo(
          line,
          { scaleX: 0, transformOrigin: "0 50%" },
          {
            scaleX: 1,
            duration: 1.05,
            ease: "expo.inOut",
            scrollTrigger: { trigger: line, start: "top 92%", once: true },
          },
        );
      });

      /* Header / document progress ------------------------------------------- */
      const progress = document.querySelector<HTMLElement>("[data-scroll-progress]");
      if (progress) {
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => gsap.set(progress, { scaleX: self.progress }),
        });
      }

      const header = document.querySelector<HTMLElement>("[data-site-header]");
      if (header) {
        ScrollTrigger.create({
          start: 18,
          end: "max",
          onUpdate: (self) => header.classList.toggle("is-scrolled", self.scroll() > 18),
        });
      }

      /* Hero opening ---------------------------------------------------------- */
      const hero = document.querySelector<HTMLElement>("[data-hero-section]");
      const heroWords = gsap.utils.toArray<HTMLElement>("[data-hero-word]");
      const heroObject = document.querySelector<HTMLElement>("[data-hero-object]");
      const heroCopy = gsap.utils.toArray<HTMLElement>("[data-hero-copy]");
      const heroMeta = gsap.utils.toArray<HTMLElement>("[data-hero-meta]");
      const heroCorners = gsap.utils.toArray<HTMLElement>("[data-hero-corner]");

      gsap.set(heroWords, { yPercent: 112, rotate: 0.001 });
      gsap.set(heroObject, { autoAlpha: 0, y: 72, scale: 0.92, rotate: -1.6 });
      gsap.set(heroCopy, { autoAlpha: 0, y: 22 });
      gsap.set(heroMeta, { autoAlpha: 0 });
      gsap.set(heroCorners, { scale: 0, transformOrigin: "50% 50%" });

      let heroPlayed = false;
      const playHero = () => {
        if (heroPlayed) return;
        heroPlayed = true;
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.to(heroWords, { yPercent: 0, duration: 1.0, stagger: 0.065 })
          .to(heroObject, { autoAlpha: 1, y: 0, scale: 1, rotate: 0, duration: 1.15 }, 0.16)
          .to(heroCopy, { autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.06 }, 0.53)
          .to(heroMeta, { autoAlpha: 1, duration: 0.48, stagger: 0.035 }, 0.62)
          .to(heroCorners, { scale: 1, duration: 0.34, stagger: 0.025, ease: "back.out(2)" }, 0.7);
      };

      heroReadyHandler = playHero;
      window.addEventListener("telemetry:ready", playHero, { once: true });
      if (readyWindow.__telemetryReady) requestAnimationFrame(playHero);
      else heroFallback = window.setTimeout(playHero, 2800);

      /* Hero → system stack handoff. One scrub timeline, no looping effects. */
      if (hero) {
        const titleLines = gsap.utils.toArray<HTMLElement>(".heroTitleLine", hero);
        const panel = hero.querySelector<HTMLElement>(".heroCornerPanel");
        const readings = hero.querySelector<HTMLElement>(".heroReadings");
        const handoff = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "65% top+=62",
            end: "bottom top+=62",
            scrub: 0.65,
          },
        });
        handoff
          .to(titleLines[0], { xPercent: -6, yPercent: -7, opacity: 0.18, ease: "none" }, 0)
          .to(titleLines[1], { xPercent: 8, yPercent: 5, opacity: 0.18, ease: "none" }, 0)
          .to(heroObject, { yPercent: 28, scale: 0.82, rotate: 4, opacity: 0.12, ease: "none" }, 0)
          .to(heroCopy, { y: -24, opacity: 0, ease: "none" }, 0)
          .to(panel, { x: 24, opacity: 0, ease: "none" }, 0)
          .to(readings, { yPercent: 38, opacity: 0.18, ease: "none" }, 0);
      }

      /* System stack cells enter like the reference partner rail. */
      const stackCells = gsap.utils.toArray<HTMLElement>(".stackBandCell");
      if (stackCells.length) {
        gsap.fromTo(
          stackCells,
          { yPercent: 102 },
          {
            yPercent: 0,
            duration: 0.85,
            stagger: 0.055,
            ease: "expo.out",
            scrollTrigger: { trigger: ".stackBand", start: "top 92%", once: true },
          },
        );
      }


      /* Program pair: large, synchronized, reference-style scene reveals. */
      const programCards = gsap.utils.toArray<HTMLElement>("[data-program-card]");
      programCards.forEach((card, index) => {
        const visual = card.querySelector<HTMLElement>(".programCardVisual");
        const rings = gsap.utils.toArray<HTMLElement>(".programRing", card);
        const core = card.querySelector<HTMLElement>(".programCore");
        const pulse = card.querySelector<HTMLElement>(".programPulse");
        const titleLines = gsap.utils.toArray<HTMLElement>("h3 span", card);
        const local = gsap.timeline({
          scrollTrigger: { trigger: card, start: "top 82%", end: "bottom 28%", scrub: 0.65 },
        });
        local.fromTo(visual, { yPercent: 10, scale: .92 }, { yPercent: -4, scale: 1, ease: "none", duration: 1 }, 0)
          .fromTo(rings, { scale: .82, opacity: .2 }, { scale: 1 + index * .025, opacity: .85, stagger: .08, ease: "none", duration: .72 }, 0)
          .fromTo(core, { rotate: index ? 7 : -7 }, { rotate: index ? -2 : 2, ease: "none", duration: 1 }, 0)
          .fromTo(pulse, { scaleY: .25, opacity: .2 }, { scaleY: 1, opacity: 1, transformOrigin: "50% 100%", ease: "none", duration: .75 }, .12)
          .fromTo(titleLines, { yPercent: 24, opacity: .35 }, { yPercent: 0, opacity: 1, stagger: .05, ease: "none", duration: .4 }, .18);
      });

      /* Field proof: one horizontal rhythm, not three independent fade cards. */
      const proofSection = document.querySelector<HTMLElement>(".proofSection");
      const proofCards = gsap.utils.toArray<HTMLElement>(".proofCard");
      if (proofSection && proofCards.length) {
        gsap.fromTo(proofCards,
          { y: 70, opacity: .28 },
          {
            y: 0, opacity: 1, stagger: .12, ease: "power3.out",
            scrollTrigger: { trigger: proofSection, start: "top 78%", end: "top 28%", scrub: .55 },
          }
        );
        proofCards.forEach((card, index) => {
          const cross = card.querySelector<HTMLElement>(".proofCardMetric i");
          if (!cross) return;
          gsap.to(cross, {
            rotate: index % 2 ? -55 : 55,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
          });
        });
      }

      /* Equipment: sticky visual is driven by the row crossing the focal line. */
      const equipmentRows = gsap.utils.toArray<HTMLElement>(".equipmentLabRow");
      const equipmentSegments = gsap.utils.toArray<HTMLElement>(".equipmentAsideSegment");
      equipmentRows.forEach((row, index) => {
        ScrollTrigger.create({
          trigger: row,
          start: "top 52%",
          end: "bottom 48%",
          onToggle: (self) => {
            if (!self.isActive) return;
            equipmentRows.forEach((item) => item.classList.remove("is-active"));
            equipmentSegments.forEach((item) => item.classList.remove("is-active"));
            row.classList.add("is-active");
            equipmentSegments[index]?.classList.add("is-active");
          },
        });
      });
      equipmentRows[0]?.classList.add("is-active");
      equipmentSegments[0]?.classList.add("is-active");

      /* Portfolio-like systems rail: vertical scroll drives a horizontal deck. */
      const systemsSection = document.querySelector<HTMLElement>(".systemsShowcase");
      const systemsPin = systemsSection?.querySelector<HTMLElement>(".systemsPin");
      const systemsRail = systemsSection?.querySelector<HTMLElement>(".systemsRail");
      /* Pin-heavy horizontal decks are desktop-only. They are registered through
         gsap.matchMedia so that crossing the breakpoint rebuilds or tears them
         down; a boolean read once at mount would leave a stale pinned rail. */
      if (systemsSection && systemsPin && systemsRail) {
        deckMedia.add("(min-width: 761px)", () => {
          const getDistance = () => Math.max(0, systemsRail.scrollWidth - systemsPin.clientWidth + 48);
          const tween = gsap.to(systemsRail, {
            x: () => -getDistance(),
            ease: "none",
            scrollTrigger: {
              trigger: systemsSection,
              start: "top top+=62",
              end: () => `+=${Math.max(900, getDistance() * 1.18)}`,
              pin: systemsPin,
              scrub: 0.7,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          return () => {
            // `true` also removes the pin spacer it created.
            tween.scrollTrigger?.kill(true);
            tween.kill();
            gsap.set(systemsRail, { clearProps: "all" });
          };
        });
      }

      /* Drill Monitor: trace is revealed by scroll, not an endless animation. */
      const monitorStage = document.querySelector<HTMLElement>(".monitorStage");
      if (monitorStage) {
        const fact = monitorStage.querySelector<SVGPathElement>(".monitorFact");
        const cursor = monitorStage.querySelector<HTMLElement>(".monitorCursor");
        const events = gsap.utils.toArray<HTMLElement>(".monitorEvents div", monitorStage);
        if (fact) {
          const length = fact.getTotalLength();
          gsap.set(fact, { strokeDasharray: length, strokeDashoffset: length });
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: monitorStage,
              start: "top 78%",
              end: "bottom 28%",
              scrub: 0.75,
            },
          });
          tl.to(fact, { strokeDashoffset: 0, ease: "none", duration: 1 }, 0)
            .fromTo(cursor, { autoAlpha: 0, left: "9%", top: "16%" }, { autoAlpha: 1, left: "82%", top: "78%", ease: "none", duration: 1 }, 0)
            .fromTo(events, { autoAlpha: 0.25, x: 10 }, { autoAlpha: 1, x: 0, stagger: 0.09, duration: 0.3, ease: "power2.out" }, 0.2);
        }
      }


      /* Field presence: editorial media-grid choreography, driven as one section. */
      const presenceSection = document.querySelector<HTMLElement>(".presenceSection");
      const presenceCards = gsap.utils.toArray<HTMLElement>("[data-presence-card]");
      if (presenceSection && presenceCards.length) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: presenceSection,
            start: "top 78%",
            end: "55% 52%",
            scrub: 0.62,
          },
        });
        tl.fromTo(
          presenceCards,
          { y: 58, autoAlpha: 0.22, clipPath: "inset(12% 0 0 0)" },
          { y: 0, autoAlpha: 1, clipPath: "inset(0% 0 0 0)", stagger: 0.11, ease: "power3.out", duration: 0.62 },
          0,
        );
        presenceCards.forEach((card, index) => {
          const bars = gsap.utils.toArray<HTMLElement>(".presenceScan i", card);
          gsap.fromTo(
            bars,
            { scaleY: 0.12, transformOrigin: "50% 100%" },
            {
              scaleY: 0.45 + (index % 3) * 0.22,
              stagger: 0.035,
              ease: "none",
              scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        });
      }

      /* Field notes: testimonial-like horizontal deck without fake endorsements. */
      const notesSection = document.querySelector<HTMLElement>(".notesSection");
      const notesRail = notesSection?.querySelector<HTMLElement>("[data-notes-rail]");
      if (notesSection && notesRail) {
        deckMedia.add("(min-width: 761px)", () => {
          const getNotesDistance = () => Math.max(0, notesRail.scrollWidth - window.innerWidth + 2 * 30);
          const tween = gsap.to(notesRail, {
            x: () => -getNotesDistance(),
            ease: "none",
            scrollTrigger: {
              trigger: notesSection,
              start: "top top+=62",
              end: () => `+=${Math.max(1100, getNotesDistance() * 1.35)}`,
              pin: notesSection,
              scrub: 0.72,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          return () => {
            tween.scrollTrigger?.kill(true);
            tween.kill();
            gsap.set(notesRail, { clearProps: "all" });
          };
        });
      }

      /* Research: one clipped editorial reveal, matching the late-page rhythm. */
      const researchSection = document.querySelector<HTMLElement>(".researchSection");
      const researchCards = gsap.utils.toArray<HTMLElement>("[data-research-card]");
      if (researchSection && researchCards.length) {
        gsap.fromTo(
          researchCards,
          { y: 54, autoAlpha: 0.18, clipPath: "inset(0 0 18% 0)" },
          {
            y: 0,
            autoAlpha: 1,
            clipPath: "inset(0 0 0% 0)",
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: researchSection, start: "top 78%", end: "top 28%", scrub: 0.58 },
          },
        );
      }

      /* Subtle parallax only where specifically requested. */
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((node) => {
        const amount = Number(node.dataset.parallax ?? 3);
        gsap.fromTo(
          node,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: "none",
            scrollTrigger: { trigger: node, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });

      /* Pointer response is restrained to CTAs and the footer placeholder. */
      gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((node) => {
        const onMove = (event: PointerEvent) => {
          const rect = node.getBoundingClientRect();
          const x = event.clientX - rect.left - rect.width / 2;
          const y = event.clientY - rect.top - rect.height / 2;
          gsap.to(node, { x: x * 0.055, y: y * 0.075, duration: 0.38, ease: "power3.out" });
        };
        const onLeave = () => gsap.to(node, { x: 0, y: 0, duration: 0.55, ease: "power3.out" });
        node.addEventListener("pointermove", onMove);
        node.addEventListener("pointerleave", onLeave);
        (node as CleanupNode).__motionCleanup = () => {
          node.removeEventListener("pointermove", onMove);
          node.removeEventListener("pointerleave", onLeave);
        };
      });

      const footerScene = document.querySelector<HTMLElement>(".footerLabScene");
      if (footerScene) {
        const onMove = (event: PointerEvent) => {
          const rect = footerScene.getBoundingClientRect();
          const nx = (event.clientX - rect.left) / rect.width - 0.5;
          const ny = (event.clientY - rect.top) / rect.height - 0.5;
          gsap.to(footerScene.querySelectorAll("i"), {
            x: nx * 18,
            y: ny * 12,
            rotate: (index) => index * 58 + nx * 8,
            duration: 0.8,
            stagger: 0.04,
            ease: "power3.out",
          });
        };
        footerScene.addEventListener("pointermove", onMove);
        (footerScene as CleanupNode).__motionCleanup = () => footerScene.removeEventListener("pointermove", onMove);
      }
    });

    /* Debounced: a resize drag fires continuously and each refresh recomputes
       every pinned trigger. */
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
    };
    window.addEventListener("resize", onResize, { passive: true });

    const onVisibility = () => {
      if (document.hidden) lenis.stop();
      else lenis.start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (heroReadyHandler) window.removeEventListener("telemetry:ready", heroReadyHandler);
      if (heroFallback) window.clearTimeout(heroFallback);
      document.querySelectorAll<CleanupNode>("[data-magnetic], .footerLabScene").forEach((node) => node.__motionCleanup?.());
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      lenis.destroy();
      gsap.ticker.remove(raf);
      deckMedia.revert();
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      root.classList.remove("motion-enabled");
    };
  }, []);

  return <>{children}</>;
}
