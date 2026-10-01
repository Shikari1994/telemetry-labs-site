"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PRELOADER_KEY } from "@/components/motion/PagePreloader";
import { createDirector, openingScale, type Director, type Intro, type Placement } from "@/lib/mascot/director";
import { HEAD_CENTER_Y } from "@/lib/mascot/model";
import { createParcel, type Stage } from "@/lib/mascot/parcel";
import { createMascotRenderer, type DrawState } from "@/lib/mascot/renderer";
import { createRig, poweredOff, type FaceCue } from "@/lib/mascot/rig";
import { routes } from "@/lib/mascot/route";
import { finale } from "@/lib/motion/finale";
import { emitHeroCue } from "@/lib/motion/heroCue";
import { ride } from "@/lib/transit/guide";
import { jumpTo } from "@/lib/motion/jump";

/**
 * The voxel robot that floats down the homepage: one fixed, pointer-transparent
 * WebGL canvas above the content, rendered at a coarse pixel grid so the 3D
 * model reads as pixel art. Where it goes comes from lib/mascot/route.ts; it
 * turns its head (and then its body) toward the cursor wherever it rests, and
 * its screen face reacts to the cursor, to flight and to being left alone.
 *
 * The page opens on it, full length in the middle of the screen: it powers
 * on, wakes, says hi and waves, then flies down onto the charging pad in the
 * hero room, which turns the room lights on (lib/motion/heroCue.ts). The
 * render pixel grows with its size, so the flight steps through resolutions.
 *
 * At every stop it works the section (the station's aim): it points at the
 * item under the cursor or in focus, watches the section's current item while
 * the cursor is quiet, and points that item out each time it changes. In the
 * room that means the posters, and clicking a poster sends it flying into
 * that poster as the page jumps to the case.
 *
 * It runs one errand across the visit (lib/mascot/parcel.ts): the pad hands
 * it a parcel on touchdown, it carries it down the page and sets it down on
 * the request window, and the parcel goes in when the request is sent. The
 * window carries the parcel's state as `data-parcel` for its title bar.
 *
 * In a transit it leaves the page for the board's world: the transit scene
 * (components/motion/TransitScene) puts the stretch's path for it through
 * its camera and hands over where it is and how it is turned (`ride`,
 * lib/transit/guide). Then it is drawn as that camera sees it, clipped to
 * where the board is uncovered.
 *
 * Draws on the GSAP ticker after Lenis and ScrollTrigger have updated, so its
 * reading of element boxes matches the frame being painted. No React state is
 * touched per frame. Reduced motion skips it entirely.
 */

/** Render pixel sizes, CSS px; the largest at most a fifth of a voxel is used. */
const PIXELS = [16, 12, 8, 6, 4, 3, 2];
const pixelFor = (scale: number) => PIXELS.find((p) => p * 5 <= scale) ?? 2;
/** Dive into a poster, and when the page jump starts within it. */
const DIVE_SECONDS = 0.55;
const DIVE_JUMP_AT = 0.4;
/** How long it points a new current item out. */
const CUE_MS = 1400;

type ReadyWindow = Window & { __telemetryReady?: boolean };
type Point = { x: number; y: number };

function clipOutside(boxes: DOMRect[] | null) {
  if (!boxes?.length) return "none";
  // Even-odd polygon: the viewport minus every occluder box.
  const holes = boxes.map((b) => {
    const [l, t, r, btm] = [b.left, b.top, b.right, b.bottom].map((n) => Math.round(n));
    return `${l}px ${t}px, ${r}px ${t}px, ${r}px ${btm}px, ${l}px ${btm}px, ${l}px ${t}px, 0 0`;
  });
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${holes.join(", ")})`;
}

const centre = (el: Element): Point => {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

export function Mascot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createMascotRenderer(canvas);
    if (!renderer) {
      // Nothing to fly in: the hero opens without waiting for it.
      emitHeroCue("world");
      emitHeroCue("lights");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const rig = createRig();
    let director: Director | null = null;

    /* Route and its triggers are rebuilt whenever the breakpoint flips. */
    const media = gsap.matchMedia();
    media.add({ desktop: "(min-width: 761px)", mobile: "(max-width: 760px)" }, (context) => {
      director = createDirector(context.conditions?.desktop ? routes.desktop : routes.mobile);
      rig.teleport();
      return () => {
        director = null;
      };
    });

    /* Viewport and render target; the pixel size follows the mascot's size. */
    let width = 1;
    let height = 1;
    let pixel = 2;
    const fit = () => renderer.resize(Math.ceil(width / pixel), Math.ceil(height / pixel));
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      fit();
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    /* Gaze: the mouse is followed live; a tap is looked at for a moment.
       Pointer and scroll both count as the visitor being around (it dozes
       off when nothing happens for a while). */
    let look: Point | null = null;
    let pointer: Point | null = null;
    let lookUntil = 0;
    let lastMove = performance.now();
    let lastActive = lastMove;
    let lastScroll = window.scrollY;
    const onPointer = (event: PointerEvent) => {
      const now = performance.now();
      look = { x: event.clientX, y: event.clientY };
      pointer = event.pointerType === "mouse" ? look : null;
      lookUntil = now + (event.pointerType === "mouse" ? 5000 : 2500);
      lastMove = now;
      lastActive = now;
    };
    const onLeave = () => {
      pointer = null;
      hovered = null;
    };
    /* What the cursor is over, for the station's aim. */
    let hovered: Element | null = null;
    const onOver = (event: PointerEvent) => {
      hovered = event.pointerType === "mouse" && event.target instanceof Element ? event.target : null;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    /* The pad shows a contact shadow while the robot stands on it. */
    const pad = document.querySelector<HTMLElement>("[data-room-pad]");
    let home = false;
    const setHome = (next: boolean) => {
      if (next === home || !pad) return;
      home = next;
      pad.dataset.home = next ? "1" : "0";
    };

    /* Intro: it hovers mid-screen with the glass dark; it powers on with a
       stutter, dozes, jolts awake, looks about, writes HI and waves, fills its
       charge cells — then it flies down onto the pad. The
       pull-back starts the hero build, the touchdown switches the room on.
       Any scroll, key or click fast-forwards it.
       The timeline is paused and stepped by the render tick with its clamped
       frame time, so a stall while the page loads holds the scene instead of
       skipping its beats (the global ticker runs without lag smoothing). */
    const intro: Intro = { shown: false, p: 0 };
    const power = poweredOff();
    let face: FaceCue | null = null;
    let introTimeline: gsap.core.Timeline | null = null;
    let introSpeed = 1;
    const hurry = () => {
      introSpeed = 5;
    };
    const hurryEvents = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
    const stopHurry = () => hurryEvents.forEach((type) => window.removeEventListener(type, hurry));
    /* The errand: caught and let go with a run of the fingers, and a wave
       when the parcel goes in. */
    let parcelStage: Stage = "waiting";
    const parcel = createParcel({
      caught: (side) => rig.flex(side),
      released: (side) => rig.flex(side),
      sent: () => {
        if (lastPlace.visible) rig.wave();
      },
    });
    const syncParcel = (el: HTMLElement | null) => {
      if (parcel.stage === parcelStage) return;
      parcelStage = parcel.stage;
      // Moves in between keep the bar as it was.
      if (el && (parcelStage === "parked" || parcelStage === "sent")) el.dataset.parcel = parcelStage;
    };

    const touchdown = () => {
      stopHurry();
      parcel.give();
      rig.puff();
      rig.flex(-1);
      rig.flex(1);
      if (pad) {
        pad.dataset.state = "land";
        window.setTimeout(() => {
          pad.dataset.state = "done";
        }, 700);
      }
      emitHeroCue("lights");
    };
    const playIntro = () => {
      if (introTimeline || intro.shown) return;
      intro.shown = true;
      // Landed on a restored scroll position: nobody is watching the hero.
      if (window.scrollY > window.innerHeight * 0.5) {
        Object.assign(power, { screen: 1, charge: 1 });
        intro.p = 1;
        parcel.give(true);
        emitHeroCue("world");
        emitHeroCue("lights");
        return;
      }
      let seen = false;
      try {
        seen = window.sessionStorage.getItem(PRELOADER_KEY) === "1";
      } catch {
        // Storage can be blocked; the full-length intro is the fallback.
      }
      const setFace = (next: FaceCue | null) => () => {
        face = next;
      };
      const tl = gsap.timeline({ paused: true });
      tl.set(power, { screen: 1 }, 0.35)
        .set(power, { screen: 0.15 }, 0.45)
        .set(power, { screen: 1 }, 0.53)
        .add(setFace("sleepy"), 0.35)
        .add(() => {
          face = "surprised";
          rig.startle(openingScale(width, height));
        }, 1.0)
        .add(setFace(null), 1.35)
        .add(setFace("hi"), 1.8)
        .add(() => rig.wave(), 1.8)
        .to(power, { charge: 1, duration: 0.5, ease: "steps(4)" }, 1.85)
        .add(() => {
          face = null;
          emitHeroCue("world");
        }, 3.0)
        .to(intro, { p: 1, duration: 1.5, ease: "none" }, 3.0)
        .add(touchdown, 4.5);
      if (seen) introSpeed = 1.5;
      introTimeline = tl;
      hurryEvents.forEach((type) => window.addEventListener(type, hurry, { passive: true }));
    };
    window.addEventListener("telemetry:ready", playIntro, { once: true });
    if ((window as ReadyWindow).__telemetryReady) playIntro();
    const introFallback = window.setTimeout(playIntro, 4200);

    /* Posters: a click is a dive (pointing is the hero station's aim). */
    const posters = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-room-poster]"));
    let dive: { el: HTMLAnchorElement; t: number; from: Placement & { visible: true }; jumped: boolean } | null = null;
    let divedAt = 0;
    let lastPlace: Placement = { visible: false };
    const posterListeners = posters.map((el) => {
      const click = (event: MouseEvent) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        const from = lastPlace;
        if (dive || !from.visible || from.key !== "hero" || !from.settled) return;
        // Takes the jump over from AnchorLink, which skips a prevented click.
        event.preventDefault();
        dive = { el, t: 0, from, jumped: false };
      };
      el.addEventListener("click", click);
      return () => el.removeEventListener("click", click);
    });

    /* Flies from where it stood into the poster's centre, shrinking away; the
       page jump starts on the way so the two overlap. */
    const placeDive = (dt: number): Placement => {
      if (!dive) return { visible: false };
      dive.t += dt / DIVE_SECONDS;
      const { el, from } = dive;
      const t = Math.min(1, dive.t);
      if (t >= DIVE_JUMP_AT && !dive.jumped) {
        dive.jumped = true;
        el.dataset.entered = "1";
        window.setTimeout(() => delete el.dataset.entered, 600);
        jumpTo(el.getAttribute("href")?.slice(1) ?? "top");
      }
      if (t >= 1) {
        dive = null;
        divedAt = performance.now();
        return { visible: false };
      }
      const goal = centre(el);
      const e = t * t;
      const k = from.scale * (1 - 0.75 * e);
      const headX = gsap.utils.interpolate(from.x, goal.x, e);
      const headY = gsap.utils.interpolate(from.y - HEAD_CENTER_Y * from.scale, goal.y, e) - Math.sin(Math.PI * t) * 40;
      return { ...from, x: headX, y: headY + HEAD_CENTER_Y * k, scale: k, pose: "hover", fly: 1, settled: false };
    };

    let wasVisible = false;
    let drawn = false;
    let lastKey = "";
    let wasSettled = false;
    let clip = "none";
    let boopReadyAt = 0;
    let rideWave = false;
    let current: Element | null = null;
    let cueUntil = 0;
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!director || document.hidden) return;
      if (window.scrollY !== lastScroll) {
        lastScroll = window.scrollY;
        lastActive = now;
        hurry();
      }
      if (introTimeline && introTimeline.progress() < 1) {
        introTimeline.totalTime(introTimeline.totalTime() + dt * introSpeed, false);
      }

      let place = director.evaluate(window.scrollY, width, height, intro);
      // After a dive it stays inside the poster until the hero is left, or
      // until the page is back at rest on the hero (a jump that went nowhere).
      if (divedAt) {
        if (!place.visible || place.key !== "hero" || (place.settled && now - divedAt > 1500)) divedAt = 0;
        else place = { visible: false };
      }
      if (dive) place = placeDive(dt);
      // On the board the transit owns it.
      const riding = ride.visible && !dive;
      if (riding) {
        place = {
          visible: true,
          key: `ride-${ride.index}`,
          x: ride.x,
          y: ride.y,
          scale: ride.scale,
          pose: "hover",
          fly: ride.fly,
          settled: false,
          wave: false,
          occluders: null,
          aim: null,
        };
        if (ride.wave && !rideWave) rig.wave();
      }
      rideWave = riding && ride.wave;
      lastPlace = place;

      setHome(place.visible && place.key === "hero" && place.settled);
      const spot = director.parcelSpot();
      let frame: ReturnType<typeof rig.update> | null = null;
      if (!place.visible) {
        wasVisible = false;
        if (clip !== "none") canvas.style.clipPath = clip = "none";
        // A parcel left on the window still needs its render pixel.
        if (spot && pixelFor(spot.scale) !== pixel) {
          pixel = pixelFor(spot.scale);
          fit();
        }
      } else {
        if (!wasVisible || place.key !== lastKey) rig.teleport();
        // Landing and greeting fire once on arrival, not while holding.
        if (place.settled && !(wasSettled && place.key === lastKey)) {
          if (place.pose === "sit") rig.land();
          if (place.wave) rig.wave();
        }
        wasVisible = true;
        lastKey = place.key;
        wasSettled = place.settled;

        const nextPixel = pixelFor(place.scale);
        if (nextPixel !== pixel) {
          pixel = nextPixel;
          fit();
        }

        const nextClip = riding ? (ride.top > 0 ? `inset(${Math.round(ride.top)}px 0 0 0)` : "none") : clipOutside(place.occluders);
        if (nextClip !== clip) canvas.style.clipPath = clip = nextClip;

        /* Aim: the hovered or focused item, else the section's current item,
           pointed out for a moment whenever it changes. */
        const aim = riding ? null : place.aim;
        const focused = document.activeElement;
        const hot = aim ? (hovered?.closest(aim.select) ?? (focused !== document.body ? focused?.closest(aim.select) : null)) : null;
        const actives = aim?.active ? document.querySelectorAll(aim.active) : null;
        const active = actives?.length ? actives[actives.length - 1] : null;
        if (active !== current) {
          current = active;
          if (active && place.pose !== "peek") {
            cueUntil = now + CUE_MS;
            rig.flex(centre(active).x < place.x ? -1 : 1);
          }
        }
        const point = hot ? centre(hot) : active && now < cueUntil && place.pose !== "peek" ? centre(active) : null;
        const fresh = look && now < lookUntil && !riding ? look : null;
        const gaze = point ?? fresh ?? (active ? centre(active) : null);
        /* Boop: a mouse brushing past the head gets a hop and a spin. */
        if (gaze && !point && place.settled && now - lastMove < 120 && now > boopReadyAt) {
          const head = rig.head;
          if (Math.hypot(gaze.x - head.x, gaze.y - head.y) < place.scale * 7) {
            rig.boop();
            boopReadyAt = now + 1600;
          }
        }

        frame = rig.update(dt, {
          x: place.x,
          y: place.y,
          scale: place.scale,
          pose: place.pose,
          fly: place.fly,
          tilt: place.tilt,
          look: gaze,
          pointer,
          still: (now - lastMove) / 1000,
          idle: (now - lastActive) / 1000,
          width,
          height,
          pixel,
          // On the last screen it goes dark with the page.
          power: place.halts ? { screen: Math.min(power.screen, finale.power), charge: Math.min(power.charge, finale.power) } : power,
          doze: place.halts && place.settled && finale.doze,
          point,
          carry: parcel.carry,
          frame: riding ? { yaw: ride.yaw, tilt: ride.tilt, roll: ride.roll } : null,
          face: riding && ride.face ? ride.face : face,
        });
      }

      const parcelParts = parcel.update(dt, {
        hold: frame?.hold ?? null,
        setDown: place.visible && place.settled && place.key === director.dropKey,
        spot,
        width,
        height,
        pixel,
      });
      syncParcel(director.dropElement);

      if (!frame && !parcelParts.length) {
        if (drawn) renderer.clear();
        drawn = false;
        return;
      }
      const state: DrawState = frame?.state ?? { glow: 0.6 + 0.25 * Math.sin(now / 300), charge: 1, screen: 1 };
      renderer.draw(frame ? [...frame.parts, ...parcelParts] : parcelParts, state);
      drawn = true;
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("telemetry:ready", playIntro);
      window.clearTimeout(introFallback);
      stopHurry();
      posterListeners.forEach((off) => off());
      introTimeline?.kill();
      media.revert();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="mascot" aria-hidden="true" />;
}
