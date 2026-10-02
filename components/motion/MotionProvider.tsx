"use client";

import { useLayoutEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { homeTree } from "@/data/home";
import { paintBar } from "@/lib/ascii";
import { island } from "@/lib/hero/state";
import { onHeroCue } from "@/lib/motion/heroCue";
import { SIGNAL_LINE } from "@/lib/motion/bus";
import { finale } from "@/lib/motion/finale";
import { setLenis } from "@/lib/motion/lenis";
import { scrambleElement } from "@/lib/motion/scramble";
import { showcase } from "@/lib/showcase/state";

type ReadyWindow = Window & { __telemetryReady?: boolean };

/** Knock a pixel cover out cell by cell, in random order. */
function dissolve(cells: Element[] | NodeListOf<Element>, amount = 0.55) {
  return gsap.to(cells, { autoAlpha: 0, duration: 0.01, stagger: { amount, from: "random" } });
}

/* Stepped wipes read as bitmap increments rather than smooth fades. */
const wipeX = { from: { clipPath: "inset(0 100% 0 0)" }, to: { clipPath: "inset(0 0% 0 0)" } };
const wipeY = { from: { clipPath: "inset(0 0 100% 0)" }, to: { clipPath: "inset(0 0 0% 0)" } };

/* Reveals play once. Not `once: true`: a once-trigger already passed when the
   next trigger is created kills itself inside that trigger's refresh pass, and
   ScrollTrigger then stops updating altogether (a restored scroll position or
   a short first screen is enough). A trigger that stays alive and never
   reverses behaves the same without that hazard. */
const PLAY_ONCE = "play none none none";

/* Viewer: share of each screen's scroll spent holding still at either end,
   extra scroll (in screens) the last one holds, how many captures show in
   the stack behind the front one, and how far up (% of a capture) and back
   (px) each place in the stack sits. */
const VIEWER_HOLD = 0.24;
const VIEWER_TAIL = 0.5;
const VIEWER_DEPTH = 3;
const VIEWER_RISE = 16;
const VIEWER_SINK = 150;

/* Ring: share of each screen's scroll spent holding still at either end. */
const RING_HOLD = 0.2;
/* Ring: extra scroll (in screens) the last screen holds before the pin ends. */
const RING_TAIL = 0.5;

/* Stack board: pinned scroll (in screens); the share where chips start and
   stop seating, and where the board reports ready; how many chips' turns
   one drop lasts, so the next chip is already falling as one seats. */
const BOARD_TRAVEL = 2.4;
const BOARD_SEAT_FROM = 0.06;
const BOARD_SEAT_TO = 0.82;
const BOARD_READY = 0.86;
const BOARD_OVERLAP = 2.4;

export function MotionProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readyWindow = window as ReadyWindow;

    if (reduced) {
      root.classList.remove("motion-enabled");
      root.classList.add("motion-reduced");
      readyWindow.__telemetryReady = true;
      return () => root.classList.remove("motion-reduced");
    }
    root.classList.add("motion-enabled");

    const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.9, touchMultiplier: 1, smoothWheel: true });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const headerHeight = () => document.querySelector<HTMLElement>("[data-site-header]")?.offsetHeight ?? 72;

    let heroReadyHandler: (() => void) | null = null;
    let heroFallback = 0;
    const heroCueOffs: (() => void)[] = [];
    let finaleCleanup: (() => void) | null = null;
    const viewerMedia = gsap.matchMedia();
    const ringMedia = gsap.matchMedia();
    const boardMedia = gsap.matchMedia();

    const ctx = gsap.context(() => {
      /* Header ------------------------------------------------------------ */
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      if (header) {
        // Read the position, not isActive: at the very bottom the trigger
        // reaches its end and would report inactive.
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => header.classList.toggle("is-scrolled", self.scroll() > 12),
        });
      }

      /* Hero: an opening in two beats paced by the mascot intro (the wordmark
         and copy build as it pulls back, the island builds as it lands),
         then one handoff scrub. */
      const hero = document.querySelector<HTMLElement>("[data-hero-section]");
      if (hero) {
        const pixels = gsap.utils.toArray<SVGRectElement>("[data-hero-word] [data-px]", hero);
        const lines = gsap.utils.toArray<HTMLElement>("[data-hero-line]", hero);
        const readings = gsap.utils.toArray<HTMLElement>("[data-scramble-value]", hero);
        const figure = hero.querySelector<HTMLElement>("[data-hero-object]");

        gsap.set(pixels, { autoAlpha: 0 });
        gsap.set(lines, wipeY.from);

        let worldPlayed = false;
        let lightsPlayed = false;
        const playWorld = () => {
          if (worldPlayed) return;
          worldPlayed = true;
          gsap
            .timeline()
            .to(pixels, { autoAlpha: 1, duration: 0.01, stagger: { amount: 0.85, from: "random" } }, 0)
            .to(lines, { ...wipeY.to, duration: 0.5, ease: "steps(6)", stagger: 0.09, clearProps: "clipPath" }, 0.45);
        };
        // The board assembles out of the socket the robot landed on; the
        // chips project their works once it stands (HeroIsland).
        const playLights = () => {
          if (lightsPlayed) return;
          lightsPlayed = true;
          gsap
            .timeline()
            .to(island, { build: 1, duration: 2.1, ease: "none" }, 0)
            .add(() => readings.forEach((node) => scrambleElement(node, 700)), 0.5);
        };

        let started = false;
        const startHero = () => {
          if (started) return;
          started = true;
          heroCueOffs.push(onHeroCue("world", playWorld), onHeroCue("lights", playLights));
          // Should the mascot stall, the hero opens anyway. A hidden tab
          // holds the intro, so only visible time counts toward the wait.
          let waited = 0;
          const fallback = () => {
            if (!document.hidden) waited += 500;
            if (waited < 10000) {
              heroFallback = window.setTimeout(fallback, 500);
              return;
            }
            playWorld();
            playLights();
          };
          window.clearTimeout(heroFallback);
          heroFallback = window.setTimeout(fallback, 500);
        };
        heroReadyHandler = startHero;
        window.addEventListener("telemetry:ready", startHero, { once: true });
        if (readyWindow.__telemetryReady) requestAnimationFrame(startHero);
        else heroFallback = window.setTimeout(startHero, 4200);

        // Handoff: the wordmark raster breaks up as the hero leaves.
        gsap
          .timeline({ scrollTrigger: { trigger: hero, start: "12% top", end: "bottom top", scrub: 0.6 } })
          .to(pixels, { y: () => -gsap.utils.random(1, 7), autoAlpha: 0, ease: "none", stagger: { amount: 0.7, from: "random" } }, 0)
          .to(figure, { yPercent: 8, ease: "none" }, 0)
          // The island camera pitches down as the page moves on.
          .to(island, { dolly: 1, ease: "none" }, 0);
      }

      /* Section openers: label decodes, headline wipes, lead follows -------- */
      gsap.utils.toArray<HTMLElement>("[data-block-head]").forEach((head) => {
        const label = head.querySelector<HTMLElement>("[data-scramble]");
        const titleLines = head.querySelectorAll("[data-title-line]");
        const lead = head.querySelector("[data-block-lead]");
        // Heads boot as the signal front reaches them (see SignalBus).
        const tl = gsap.timeline({
          scrollTrigger: { trigger: head, start: `top ${SIGNAL_LINE * 100}%`, toggleActions: PLAY_ONCE },
        });
        const numPixels = head.querySelectorAll("[data-head-num] [data-px]");
        if (numPixels.length) {
          tl.fromTo(numPixels, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, stagger: { amount: 0.45, from: "random" } }, 0);
        }
        if (label) tl.add(() => scrambleElement(label), 0);
        tl.fromTo(titleLines, wipeX.from, { ...wipeX.to, duration: 0.6, ease: "steps(14)", stagger: 0.14 }, 0.05);
        if (lead) tl.fromTo(lead, { ...wipeY.from, y: 10 }, { ...wipeY.to, y: 0, duration: 0.5, ease: "steps(5)" }, 0.32);
        // A case passport follows the lead, one fact after another.
        const facts = head.querySelectorAll("[data-passport] > div");
        if (facts.length) {
          tl.fromTo(facts, wipeX.from, { ...wipeX.to, duration: 0.4, ease: "steps(8)", stagger: 0.1, clearProps: "clipPath" }, 0.5);
        }
      });

      /* Seams between sections: the row wipes in, the bar loads cell by cell
         and the number lights as it lands; scrubbed so it ends just before
         the next head reaches the signal line. --------------------------- */
      gsap.utils.toArray<HTMLElement>("[data-seam]").forEach((seam) => {
        const row = seam.querySelector("[data-seam-row]");
        const cells = seam.querySelectorAll(".seamBar i");
        const idx = seam.querySelector("[data-seam-idx]");
        gsap
          .timeline({
            scrollTrigger: { trigger: seam, start: "top 94%", end: `bottom ${SIGNAL_LINE * 100 + 4}%`, scrub: true },
            defaults: { ease: "none" },
          })
          .fromTo(row, wipeX.from, { ...wipeX.to, duration: 0.25, ease: "steps(10)" }, 0)
          .fromTo(cells, { scaleY: 0.34 }, { scaleY: 1, backgroundColor: "var(--accent)", duration: 0.02, ease: "steps(1)", stagger: 0.7 / cells.length }, 0.2)
          .fromTo(idx, { color: "var(--ink-4)" }, { color: "var(--accent)", duration: 0.05, ease: "steps(1)" }, 0.92);
      });

      /* Pixel covers outside the hero ------------------------------------- */
      gsap.utils.toArray<HTMLElement>("[data-px-frame]").forEach((frame) => {
        if (frame.closest("[data-hero-section]")) return;
        const cells = frame.querySelectorAll("[data-px-cover] i");
        ScrollTrigger.create({
          trigger: frame,
          start: "top 84%",
          once: true,
          onEnter: () => dissolve(cells, cells.length > 40 ? 0.7 : 0.4),
        });
      });

      /* Row lists pop in as one stepped cascade ---------------------------- */
      gsap.utils.toArray<HTMLElement>("[data-rows]").forEach((list) => {
        gsap.fromTo(
          list.children,
          { ...wipeX.from, x: -8 },
          {
            ...wipeX.to,
            x: 0,
            duration: 0.42,
            ease: "steps(8)",
            stagger: 0.07,
            clearProps: "clipPath",
            scrollTrigger: { trigger: list, start: "top 86%", toggleActions: PLAY_ONCE },
          },
        );
      });

      /* Works index: slots mount in sequence, like boot steps. A filled slot
         loads to LIVE; an open slot stays empty and blinks WAIT. ---------- */
      const stackCells = gsap.utils.toArray<HTMLElement>("[data-stack-cell]");
      if (stackCells.length) {
        const tl = gsap.timeline({ scrollTrigger: { trigger: ".stackBand", start: "top 90%", toggleActions: PLAY_ONCE } });
        stackCells.forEach((cell, index) => {
          const bar = cell.querySelector<HTMLElement>("[data-stack-bar]");
          const ok = cell.querySelector<HTMLElement>("[data-stack-ok]");
          const level = Number(cell.dataset.stackLevel ?? 1);
          const load = { value: 0 };
          if (bar) paintBar(bar, 0, 8);
          gsap.set(ok, { autoAlpha: 0 });
          tl.fromTo(cell, wipeY.from, { ...wipeY.to, duration: 0.3, ease: "steps(4)" }, index * 0.12);
          if (level > 0) {
            tl.to(
              load,
              { value: level, duration: 0.5, ease: "steps(8)", onUpdate: () => bar && paintBar(bar, load.value, 8) },
              index * 0.12 + 0.1,
            ).to(ok, { autoAlpha: 1, duration: 0.01 }, index * 0.12 + 0.62);
          } else {
            tl.to(ok, { autoAlpha: 1, duration: 0.01, repeat: 4, yoyo: true, repeatDelay: 0.12 }, index * 0.12 + 0.3);
          }
        });
      }

      /* Works as cartridges: each drops into its slot in steps, the LED
         decodes to LIVE, then the label's headline and tags follow. ------- */
      gsap.utils.toArray<HTMLElement>("[data-cart]").forEach((cart) => {
        const led = cart.querySelector<HTMLElement>("[data-cart-led]");
        const tl = gsap
          .timeline({ scrollTrigger: { trigger: cart, start: "top 82%", toggleActions: PLAY_ONCE } })
          .fromTo(cart, { y: -32 }, { y: 0, duration: 0.42, ease: "steps(6)" }, 0);
        if (led) tl.add(() => scrambleElement(led, 480), 0.42);
        tl.fromTo(cart.querySelector("h3"), wipeX.from, { ...wipeX.to, duration: 0.5, ease: "steps(12)" }, 0.5).fromTo(
          cart.querySelectorAll(".cartTags span"),
          { autoAlpha: 0, y: 6 },
          { autoAlpha: 1, y: 0, duration: 0.2, ease: "steps(3)", stagger: 0.08 },
          0.75,
        );
      });

      /* 02 Directions: the menu rows boot as one sequence — per row the
         pixel code builds in random order, the name wipes, the rest of the
         row follows. --------------------------------------------------- */
      const serviceRows = gsap.utils.toArray<HTMLElement>("[data-service]");
      if (serviceRows.length) {
        const boot = gsap.timeline({ scrollTrigger: { trigger: serviceRows[0], start: "top 84%", toggleActions: PLAY_ONCE } });
        serviceRows.forEach((row, index) => {
          const at = index * 0.18;
          boot
            .fromTo(
              row.querySelectorAll(".serviceCode [data-px]"),
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.01, stagger: { amount: 0.4, from: "random" } },
              at,
            )
            .fromTo(row.querySelector("h3"), wipeX.from, { ...wipeX.to, duration: 0.45, ease: "steps(10)" }, at + 0.25)
            .fromTo(
              row.querySelectorAll(".serviceLine, .servicePoints, .serviceProof"),
              wipeY.from,
              { ...wipeY.to, duration: 0.4, ease: "steps(5)", stagger: 0.08, clearProps: "clipPath" },
              at + 0.4,
            );
        });
      }

      /* Section offers: tag decodes, line wipes, button steps in ---------- */
      gsap.utils.toArray<HTMLElement>("[data-offer]").forEach((offer) => {
        const tag = offer.querySelector<HTMLElement>("[data-offer-tag]");
        const tl = gsap.timeline({ scrollTrigger: { trigger: offer, start: "top 88%", toggleActions: PLAY_ONCE } });
        if (tag) tl.add(() => scrambleElement(tag), 0);
        tl.fromTo(offer.querySelector("[data-offer-text]"), wipeX.from, { ...wipeX.to, duration: 0.55, ease: "steps(12)" }, 0.1).fromTo(
          offer.querySelector("[data-offer-cta]"),
          wipeX.from,
          { ...wipeX.to, duration: 0.25, ease: "steps(4)" },
          0.5,
        );
      });

      /* Case 02 screens: the viewer holds on each capture, then flips it
         down out of the window and the stack behind moves up a place; the
         channel list follows. Pinned on desktop only, rebuilt across the
         breakpoint; phones keep the flat row the markup ships. */
      const viewer = document.querySelector<HTMLElement>("[data-viewer]");
      if (viewer) {
        const pin = viewer.querySelector<HTMLElement>("[data-viewer-pin]");
        const win = viewer.querySelector<HTMLElement>("[data-viewer-win]");
        const channel = viewer.querySelector<HTMLElement>("[data-viewer-ch]");
        const bar = viewer.querySelector<HTMLElement>("[data-viewer-bar]");
        const shots = gsap.utils.toArray<HTMLElement>("[data-viewer-shot]", viewer);
        const items = gsap.utils.toArray<HTMLElement>("[data-viewer-item]", viewer);
        const last = shots.length - 1;
        const travel = last + VIEWER_TAIL;
        // jump.ts maps a channel onto the pinned range with this.
        viewer.dataset.viewerTravel = String(travel);
        let front = 0;

        const select = (next: number) => {
          if (next === front) return;
          shots[front]?.classList.remove("is-front");
          items[front]?.classList.remove("is-active");
          shots[next]?.classList.add("is-front");
          items[next]?.classList.add("is-active");
          if (channel) channel.textContent = String(next + 1).padStart(2, "0");
          front = next;
        };

        const flip = (position: number) => {
          const k = Math.floor(position);
          const f = gsap.utils.clamp(0, 1, (position - k - VIEWER_HOLD) / (1 - 2 * VIEWER_HOLD));
          const at = k + f * f * (3 - 2 * f);
          shots.forEach((shot, index) => {
            const rel = index - at;
            if (rel >= 0) {
              // Waiting in the stack: up and back, darker the deeper it sits.
              const alpha = gsap.utils.clamp(0, 1, VIEWER_DEPTH + 1 - rel);
              gsap.set(shot, {
                yPercent: -Math.min(rel, VIEWER_DEPTH) * VIEWER_RISE,
                z: -Math.min(rel, VIEWER_DEPTH) * VIEWER_SINK,
                rotationX: 0,
                autoAlpha: Math.round(alpha * 4) / 4,
              });
              shot.style.setProperty("--shade", Math.min(1, rel / VIEWER_DEPTH).toFixed(3));
            } else {
              // Seen: its top tips toward the camera and it drops out.
              const t = Math.min(1, -rel);
              gsap.set(shot, {
                yPercent: t * 70,
                z: t * 60,
                rotationX: -t * 84,
                autoAlpha: Math.round((1 - t * t) * 4) / 4,
              });
              shot.style.setProperty("--shade", (t * 0.7).toFixed(3));
            }
          });
          select(Math.min(last, Math.round(at)));
        };

        if (win) {
          gsap.fromTo(win, wipeY.from, {
            ...wipeY.to,
            duration: 0.6,
            ease: "steps(10)",
            clearProps: "clipPath",
            scrollTrigger: { trigger: win, start: "top 82%", toggleActions: PLAY_ONCE },
          });
        }
        gsap.fromTo(items, wipeX.from, {
          ...wipeX.to,
          duration: 0.4,
          ease: "steps(8)",
          stagger: 0.08,
          clearProps: "clipPath",
          scrollTrigger: { trigger: viewer.querySelector(".viewerList"), start: "top 84%", toggleActions: PLAY_ONCE },
        });

        viewerMedia.add("(min-width: 761px)", () => {
          const proxy = { p: 0 };
          flip(0);
          const tween = gsap.to(proxy, {
            p: travel,
            ease: "none",
            onUpdate: () => flip(Math.min(proxy.p, last)),
            scrollTrigger: {
              trigger: pin,
              start: () => `top top+=${headerHeight() + 12}`,
              end: () => `+=${Math.round(window.innerHeight * 0.6 * travel)}`,
              pin,
              scrub: 0.7,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              refreshPriority: 1,
              onUpdate: (self) => bar && paintBar(bar, self.progress, 20),
            },
          });
          return () => {
            tween.scrollTrigger?.kill(true);
            tween.kill();
            select(0);
            shots.forEach((shot) => {
              gsap.set(shot, { clearProps: "transform,opacity,visibility" });
              shot.style.removeProperty("--shade");
            });
          };
        });
        // Phones swipe the flat row; the channel follows the capture in view.
        const stage = viewer.querySelector<HTMLElement>("[data-viewer-stage]");
        viewerMedia.add("(max-width: 760px)", () => {
          if (!stage) return;
          const onSwipe = () => {
            const width = shots[0]?.offsetWidth || 1;
            select(gsap.utils.clamp(0, last, Math.round(stage.scrollLeft / width)));
          };
          stage.addEventListener("scroll", onSwipe, { passive: true });
          return () => {
            stage.removeEventListener("scroll", onSwipe);
            select(0);
          };
        });
      }

      /* Case 01 ring: scroll turns it one screen at a time. The turn holds on
         each screen, then swings to the next; the front screen's copy takes
         over. Pinned on desktop, a plain scrub on phones. */
      const ringSection = document.querySelector<HTMLElement>("[data-ring]");
      if (ringSection) {
        const pin = ringSection.querySelector<HTMLElement>("[data-ring-pin]");
        const stage = ringSection.querySelector<HTMLElement>("[data-ring-stage]");
        const spinner = ringSection.querySelector<HTMLElement>("[data-ring-spin]");
        const dial = ringSection.querySelector<HTMLElement>("[data-ring-dial]");
        const cards = gsap.utils.toArray<HTMLElement>("[data-ring-card]", ringSection);
        const items = gsap.utils.toArray<HTMLElement>("[data-ring-item]", ringSection);
        const ticks = gsap.utils.toArray<HTMLElement>("[data-ring-tick]", ringSection);
        const step = 360 / cards.length;
        let front = 0;

        const turn = (position: number) => {
          const k = Math.floor(position);
          const f = gsap.utils.clamp(0, 1, (position - k - RING_HOLD) / (1 - 2 * RING_HOLD));
          const angle = (k + f * f * (3 - 2 * f)) * step;
          // The WebGL screen (ShowcaseScene) takes the same beat.
          showcase.screen = Math.min(k, cards.length - 1);
          showcase.turn = k < cards.length - 1 ? f : 0;
          spinner?.style.setProperty("--spin", `${(-angle).toFixed(2)}deg`);
          dial?.style.setProperty("--spin", `${(-angle).toFixed(2)}deg`);
          cards.forEach((card, index) => {
            const rel = ((index * step - angle) * Math.PI) / 180;
            card.style.setProperty("--lit", ((1 + Math.cos(rel)) / 2).toFixed(3));
          });
          const next = Math.min(cards.length - 1, Math.round(angle / step));
          if (next === front) return;
          cards[front]?.classList.remove("is-front");
          items[front]?.classList.remove("is-active");
          cards[next]?.classList.add("is-front");
          items[next]?.classList.add("is-active");
          ticks.forEach((tick, index) => tick.classList.toggle("is-on", index <= next));
          front = next;
        };

        // The ring swings in from a quarter turn as the stage wipes open.
        if (stage && spinner) {
          gsap
            .timeline({ scrollTrigger: { trigger: stage, start: "top 82%", toggleActions: PLAY_ONCE } })
            .fromTo(stage, wipeY.from, { ...wipeY.to, duration: 0.6, ease: "steps(10)", clearProps: "clipPath" }, 0)
            .fromTo(spinner, { "--intro": "-110deg" }, { "--intro": "0deg", duration: 1.5, ease: "power3.out" }, 0)
            .fromTo(showcase, { intro: 0 }, { intro: 1, duration: 1.8, ease: "none" }, 0);
        }

        // The scrub runs a little past the last screen so it holds in front
        // before the pin lets go.
        const last = cards.length - 1;
        const travel = last + RING_TAIL;
        const proxy = { p: 0 };
        const apply = () => turn(Math.min(proxy.p, last));
        ringMedia.add("(min-width: 761px)", () => {
          proxy.p = 0;
          const tween = gsap.to(proxy, {
            p: travel,
            ease: "none",
            onUpdate: apply,
            scrollTrigger: {
              trigger: pin,
              start: () => `top top+=${headerHeight() + 12}`,
              end: () => `+=${Math.round(window.innerHeight * 0.55 * travel)}`,
              pin,
              scrub: 0.8,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              refreshPriority: 2,
            },
          });
          return () => {
            tween.scrollTrigger?.kill(true);
            tween.kill();
          };
        });
        ringMedia.add("(max-width: 760px)", () => {
          proxy.p = 0;
          const tween = gsap.to(proxy, {
            p: travel,
            ease: "none",
            onUpdate: apply,
            scrollTrigger: { trigger: stage, start: "top 70%", end: "bottom 10%", scrub: 0.6 },
          });
          return () => tween.kill();
        });
      }

      /* Case 02 layers: the stack pulls apart and turns on one stepped scrub;
         layers switch on bottom-up, rig first, and the list follows. ------- */
      const iso = document.querySelector<HTMLElement>("[data-layers-iso]");
      if (iso) {
        const slabs = gsap.utils.toArray<HTMLElement>("[data-slab]", iso);
        const rows = gsap.utils.toArray<HTMLElement>("[data-layer]");
        const byLayer = new Map(rows.map((row) => [Number(row.dataset.layer), row]));
        let lit = -1;
        const light = (count: number) => {
          if (count === lit) return;
          slabs.forEach((slab, index) => slab.classList.toggle("is-on", index < count));
          byLayer.forEach((row, index) => row.classList.toggle("is-on", index < count));
          lit = count;
        };
        light(0);
        const state = { explode: 0, turn: 0 };
        gsap.to(state, {
          explode: 1,
          turn: 1,
          ease: "steps(14)",
          scrollTrigger: { trigger: iso, start: "top 88%", end: "bottom 38%", scrub: 0.6 },
          onUpdate: () => {
            iso.style.setProperty("--explode", state.explode.toFixed(3));
            iso.style.setProperty("--rz", `${(32 + state.turn * 26).toFixed(2)}deg`);
            light(Math.min(slabs.length, Math.floor(state.explode * (slabs.length + 0.99))));
          },
        });
      }

      /* 06 Stack board: pinned on desktop (where it runs behind the mascot's
         glass, components/mascot), one scrub tilts the board in and
         seats the chips in the data's order, rig to screens, then the site;
         a trace lights once both its chips are in, the POST log prints each
         chip, and the board reports ready for the packets (StackBoard).
         Phones get the list by zone, row by row. ------------------------- */
      const board = document.querySelector<HTMLElement>("[data-board]");
      if (board) {
        const pin = board.querySelector<HTMLElement>("[data-board-pin]");
        const plane = board.querySelector<HTMLElement>("[data-board-plane]");
        const win = board.querySelector<HTMLElement>("[data-board-screen]");
        const chips = gsap.utils.toArray<HTMLElement>("[data-chip]", board);
        const paths = gsap.utils.toArray<SVGPathElement>("[data-trace]", board);
        const lines = gsap.utils.toArray<HTMLElement>("[data-log-line]", board);
        const readyLine = board.querySelector<HTMLElement>("[data-log-ready]");
        const index = new Map(chips.map((chip, i) => [chip.dataset.chip, i]));
        const slot = (BOARD_SEAT_TO - BOARD_SEAT_FROM) / (chips.length - 1 + BOARD_OVERLAP);
        const drops = chips.map(() => -1);

        if (win) {
          gsap.fromTo(win, wipeY.from, {
            ...wipeY.to,
            duration: 0.6,
            ease: "steps(10)",
            clearProps: "clipPath",
            scrollTrigger: { trigger: win, start: "top 82%", toggleActions: PLAY_ONCE },
          });
        }

        const seated = (label?: string) => drops[index.get(label) ?? -1] === 1;
        const assemble = (p: number) => {
          chips.forEach((chip, i) => {
            const f = gsap.utils.clamp(0, 1, (p - BOARD_SEAT_FROM - i * slot) / (slot * BOARD_OVERLAP));
            // Stepped, and falling faster as it goes.
            const drop = f >= 1 ? 1 : Math.floor(f * 8) / 8;
            if (drop === drops[i]) return;
            drops[i] = drop;
            chip.style.setProperty("--lift", (1 - drop * drop).toFixed(3));
            chip.classList.toggle("is-falling", drop > 0 && drop < 1);
            chip.classList.toggle("is-seated", drop === 1);
            lines[i]?.classList.toggle("is-on", drop === 1);
          });
          paths.forEach((path) => path.classList.toggle("is-on", seated(path.dataset.from) && seated(path.dataset.to)));
          const ready = p >= BOARD_READY;
          board.classList.toggle("is-ready", ready);
          readyLine?.classList.toggle("is-on", ready);
          // The board swings round and settles as it fills.
          const k = gsap.utils.clamp(0, 1, p / BOARD_SEAT_TO);
          const e = k * k * (3 - 2 * k);
          plane?.style.setProperty("--tilt", `${(46 - 24 * e).toFixed(2)}deg`);
          plane?.style.setProperty("--rz", `${(-12 + 12 * e).toFixed(2)}deg`);
          plane?.style.setProperty("--zoom", (0.86 + 0.14 * e).toFixed(3));
        };

        boardMedia.add("(min-width: 761px)", () => {
          board.classList.add("is-building");
          const proxy = { p: 0 };
          assemble(0);
          const tween = gsap.to(proxy, {
            p: 1,
            ease: "none",
            onUpdate: () => assemble(proxy.p),
            scrollTrigger: {
              trigger: pin,
              start: () => `top top+=${headerHeight() + 12}`,
              end: () => `+=${Math.round(window.innerHeight * BOARD_TRAVEL)}`,
              pin,
              scrub: 0.7,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          return () => {
            tween.scrollTrigger?.kill(true);
            tween.kill();
            board.classList.remove("is-building", "is-ready");
            readyLine?.classList.remove("is-on");
            chips.forEach((chip, i) => {
              chip.style.removeProperty("--lift");
              chip.classList.remove("is-falling", "is-seated");
              lines[i]?.classList.remove("is-on");
              drops[i] = -1;
            });
            paths.forEach((path) => path.classList.remove("is-on"));
            ["--tilt", "--rz", "--zoom"].forEach((name) => plane?.style.removeProperty(name));
          };
        });
        boardMedia.add("(max-width: 760px)", () => {
          const tweens = gsap.utils.toArray<HTMLElement>(".boardZone", board).map((zone) =>
            gsap.fromTo(zone.querySelectorAll(".boardFrame, .boardChip"), wipeX.from, {
              ...wipeX.to,
              duration: 0.35,
              ease: "steps(7)",
              stagger: 0.07,
              clearProps: "clipPath",
              scrollTrigger: { trigger: zone, start: "top 86%", toggleActions: PLAY_ONCE },
            }),
          );
          return () =>
            tweens.forEach((tween) => {
              tween.scrollTrigger?.kill();
              tween.kill();
            });
        });
      }

      /* Footer: columns cascade, then the wordmark raster builds ----------- */
      const stage = document.querySelector<HTMLElement>("[data-footer-stage]");
      if (stage) {
        const pixels = stage.querySelectorAll("[data-footer-word] [data-px]");
        gsap.set(pixels, { autoAlpha: 0 });
        ScrollTrigger.create({
          trigger: stage,
          start: "top 80%",
          once: true,
          onEnter: () => {
            gsap.to(pixels, { autoAlpha: 1, duration: 0.01, stagger: { amount: 0.9, from: "random" } });
          },
        });
      }
      /* Finale: the page powers off as it runs out. The shutdown log types
         out, the mascot dozes on its dock (lib/motion/finale.ts), the screen
         squashes into a bright line, the line into a dot, the dot goes out,
         and SYSTEM HALTED types in the dark. One scrub, so scrolling back
         up is the reboot. */
      const finaleStage = document.querySelector<HTMLElement>("[data-footer-stage]");
      const finaleScreen = finaleStage?.querySelector<HTMLElement>("[data-finale-screen]");
      if (finaleStage && finaleScreen) {
        const typed = gsap.utils.toArray<HTMLElement>("[data-finale-type]", finaleStage);
        const texts = typed.map((el) => el.textContent ?? "");
        const lines = gsap.utils.toArray<HTMLElement>("[data-finale-line]", finaleStage);
        const beam = finaleStage.querySelector<HTMLElement>("[data-finale-beam]");
        const halt = finaleStage.querySelector<HTMLElement>("[data-finale-halt]");
        const lineTyped = lines.map((line) => typed.indexOf(line.querySelector<HTMLElement>("[data-finale-type]")!));
        const haltTyped = halt ? gsap.utils.toArray<HTMLElement>("[data-finale-type]", halt).map((el) => typed.indexOf(el)) : [];

        /* The visit: a section counts once its body has crossed the middle of the screen. */
        const visited = finaleStage.querySelector<HTMLElement>("[data-finale-visited]");
        const sections = homeTree.map((node) => document.getElementById(node.id)).filter((el): el is HTMLElement => Boolean(el));
        const seen = new Set<Element>();
        const pad = (n: number) => String(n).padStart(2, "0");
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => entry.isIntersecting && seen.add(entry.target));
            if (visited) visited.textContent = `${pad(seen.size)}/${pad(sections.length)}`;
          },
          { rootMargin: "-45% 0px -45% 0px" },
        );
        sections.forEach((el) => observer.observe(el));
        finaleCleanup = () => observer.disconnect();

        const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
        const stepped = (t: number, n: number) => Math.round(t * n) / n;
        const type = (index: number, t: number) => {
          const el = typed[index];
          const n = String(Math.round(texts[index].length * t));
          if (!el || el.dataset.shown === n) return;
          el.dataset.shown = n;
          el.textContent = texts[index].slice(0, Number(n));
        };

        const apply = (p: number) => {
          lines.forEach((line, i) => {
            const t = seg(p, 0.04 + i * 0.09, 0.11 + i * 0.09);
            type(lineTyped[i], t);
            line.dataset.state = t <= 0 ? "off" : t < 1 ? "typing" : "done";
          });
          finale.doze = p > 0.42;
          finale.power = 1 - stepped(seg(p, 0.48, 0.58), 4);

          // Squash to a line, brightening as it goes; then the line to a dot.
          const squash = seg(p, 0.5, 0.62);
          const shrink = seg(p, 0.62, 0.74);
          const out = seg(p, 0.76, 0.84);
          const sy = Math.max(0.004, 1 - stepped(squash, 24));
          finaleScreen.style.transform = squash > 0 ? `scaleY(${sy.toFixed(3)})` : "";
          finaleScreen.style.setProperty("--flash", stepped(squash ** 1.6, 6).toFixed(3));
          finaleScreen.style.visibility = squash >= 1 ? "hidden" : "";
          if (beam) {
            beam.style.visibility = squash >= 1 && out < 1 ? "visible" : "hidden";
            beam.style.setProperty("--reach", (1 - stepped(shrink, 16)).toFixed(3));
            beam.style.opacity = (1 - stepped(out, 3)).toFixed(3);
          }
          if (halt) {
            const t = seg(p, 0.84, 0.96);
            halt.style.visibility = t > 0 ? "visible" : "hidden";
            haltTyped.forEach((index, i) => type(index, seg(t, i * 0.5, i * 0.5 + 0.5)));
          }
        };
        apply(0);
        ScrollTrigger.create({
          trigger: finaleStage,
          start: "top 75%",
          end: "max",
          onUpdate: (self) => apply(self.progress),
          onRefresh: (self) => apply(self.progress),
        });
      }

      gsap.fromTo(
        ".footerCols > *",
        { ...wipeY.from, y: 16 },
        {
          ...wipeY.to,
          y: 0,
          duration: 0.45,
          ease: "steps(6)",
          stagger: 0.1,
          clearProps: "clipPath",
          scrollTrigger: { trigger: ".footerTop", start: "top 86%", toggleActions: PLAY_ONCE },
        },
      );
    });

    /* Debounced: a resize drag fires continuously and each refresh recomputes
       every pinned trigger. */
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
    };
    window.addEventListener("resize", onResize, { passive: true });

    const onVisibility = () => (document.hidden ? lenis.stop() : lenis.start());
    document.addEventListener("visibilitychange", onVisibility);

    /* Fonts change line heights; measure again once they have landed. */
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      if (heroReadyHandler) window.removeEventListener("telemetry:ready", heroReadyHandler);
      if (heroFallback) window.clearTimeout(heroFallback);
      heroCueOffs.forEach((off) => off());
      finaleCleanup?.();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      setLenis(null);
      lenis.destroy();
      gsap.ticker.remove(raf);
      viewerMedia.revert();
      ringMedia.revert();
      boardMedia.revert();
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      root.classList.remove("motion-enabled");
    };
  }, []);

  return <>{children}</>;
}
