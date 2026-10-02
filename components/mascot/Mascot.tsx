"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PRELOADER_KEY } from "@/components/motion/PagePreloader";
import { CLOSEUP_HD, createDirector, type Director, type Intro, type Placement } from "@/lib/mascot/director";
import { GREETING_LENGTH } from "@/lib/mascot/hd";
import { clamp, easeInOut } from "@/lib/mascot/math";
import { HEAD_CENTER_Y } from "@/lib/mascot/model";
import { toClip } from "@/lib/mascot/occlude";
import { createParcel, type Stage } from "@/lib/mascot/parcel";
import { createMascotRenderer, type DrawState } from "@/lib/mascot/renderer";
import { createRig, KNOCK_HITS, poweredOff, type FaceCue } from "@/lib/mascot/rig";
import { routes } from "@/lib/mascot/route";
import { finale } from "@/lib/motion/finale";
import { island } from "@/lib/hero/state";
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
 * on, wakes, says hi and waves, then flies down onto the socket of the hero
 * island, and the touchdown builds the board (lib/motion/heroCue.ts). The
 * render pixel grows with its size, so the flight steps through resolutions.
 *
 * In the hero and at the request it works the section (the station's aim):
 * it points at the item under the cursor or in focus, watches the section's
 * current item while the cursor is quiet, and points that item out each time
 * it changes. In the hero that means the works' screens over the island, and
 * clicking one sends it flying into that screen as the page jumps to the
 * case. In the works' sections it plays a part instead (lib/mascot/acts.ts),
 * mostly behind the content: what it is behind is cut out of its drawing.
 *
 * It runs one errand across the visit (lib/mascot/parcel.ts): the socket hands
 * it a parcel on touchdown, it carries it down the page and sets it down on
 * the request window, and the parcel goes in when the request is sent. The
 * window carries the parcel's state as `data-parcel` for its title bar.
 *
 * In 06 it is the scene: it flies up close until its glass covers the slot
 * the stack board is laid out in, knocks on its temple, and the glass turns
 * into a window onto the board (cut out of the canvas; the board under it
 * stays the page's own, hover and all). The slot carries the screen's state
 * as `data-screen`: dark (the face on the glass), static, on, off; without
 * the attribute (phones, no WebGL, reduced motion) the board shows as is.
 *
 * In a transit it leaves the page for the board's world: the transit scene
 * (components/motion/TransitScene) puts the stretch's path for it through
 * its camera and hands over where it is and how it is turned (`ride`,
 * lib/transit/guide). It takes the ride once the board is uncovered under
 * it, and is drawn as that camera sees it.
 *
 * Once the intro has played it never leaves the screen. Between stations it
 * sits on its perch (lib/mascot/route.ts), and whenever what it follows
 * changes (a station, a seam, a ride, the dive, a rebuilt route) it flies
 * from where it was drawn to the new spot: the gap is carried and closed
 * over a short hop, so nothing ever cuts it from one place to another.
 *
 * Draws on the GSAP ticker after Lenis and ScrollTrigger have updated, so its
 * reading of element boxes matches the frame being painted. No React state is
 * touched per frame. Reduced motion skips it entirely.
 */

/** Render pixel sizes, CSS px; the largest at most a fifth of a voxel is used. */
const PIXELS = [16, 12, 8, 6, 4, 3, 2];
const pixelFor = (scale: number) => PIXELS.find((p) => p * 5 <= scale) ?? 2;
/** The close-up model's cells are a quarter voxel: a finer grid for it. */
const closeupPixel = (scale: number) => Math.min(4, Math.max(2, Math.round(scale / 24)));
/** Dive into a poster, and when the page jump starts within it. */
const DIVE_SECONDS = 0.55;
const DIVE_JUMP_AT = 0.4;
/** A hop between two things it follows: seconds for no distance, more per px, and the longest. */
const HOP = { base: 0.45, perPx: 1 / 1600, max: 1.1 };
/** How long it points a new current item out. */
const CUE_MS = 1400;
/** Pace of the opening against its timeline's seconds; quicker again once the session has seen it. */
const INTRO_PACE = { first: 1.3, seen: 1.9 };
/** Screen station: the pause before the knock, the static after it, and
    the power-down before it leaves. */
const KNOCK_DELAY = 0.3;
const STATIC_SECONDS = 0.45;
const OFF_SECONDS = 0.35;

/** wait and knock show the face, like dark; the rest cut the glass out. */
type ScreenMode = "dark" | "wait" | "knock" | "static" | "on" | "off";

type ReadyWindow = Window & { __telemetryReady?: boolean };
type Point = { x: number; y: number };

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

    /* Screen stations: the element shows only through the glass, so it is
       dark until the mascot knocks it on. */
    let screenMode: ScreenMode = "dark";
    let screenT = 0;
    const showScreen = (el: HTMLElement, mode: ScreenMode) => {
      const shown = mode === "wait" || mode === "knock" ? "dark" : mode;
      if (el.dataset.screen !== shown) el.dataset.screen = shown;
    };

    /* Route and its triggers are rebuilt whenever the breakpoint flips; it
       flies over to wherever the new route has it. */
    let rebuilt = false;
    const media = gsap.matchMedia();
    media.add({ desktop: "(min-width: 761px)", mobile: "(max-width: 760px)" }, (context) => {
      const next = createDirector(context.conditions?.desktop ? routes.desktop : routes.mobile);
      director = next;
      screenMode = "dark";
      next.screens.forEach((el) => showScreen(el, "dark"));
      rebuilt = true;
      return () => {
        director = null;
        next.screens.forEach((el) => delete el.dataset.screen);
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
    /* What the cursor is over, for the station's aim; on a touch screen what
       was tapped, while it is being looked at. */
    let hovered: Element | null = null;
    let tapped: Element | null = null;
    const onOver = (event: PointerEvent) => {
      hovered = event.pointerType === "mouse" && event.target instanceof Element ? event.target : null;
    };
    const onTap = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") tapped = event.target instanceof Element ? event.target : null;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointerdown", onTap, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    /* The socket's pad glows steady while the robot stands on it. */
    const setHome = (next: boolean) => {
      island.home = next;
    };

    /* Intro: it opens on a close-up, the glass dark; it powers on with a
       stutter, dozes, jolts awake, looks about, raises its hand and waves,
       fills its charge cells and types a greeting across its screen. The
       camera pulls back to the whole robot, which flies down onto the socket.
       The flight starts the hero build, the touchdown builds the island.
       Any scroll, key or click fast-forwards it.
       The timeline is paused and stepped by the render tick with its clamped
       frame time, so a stall while the page loads holds the scene instead of
       skipping its beats (the global ticker runs without lag smoothing). */
    const intro: Intro = { shown: false, p: 0, zoom: 1, typed: 0 };
    const power = poweredOff();
    let face: FaceCue | null = null;
    let introTimeline: gsap.core.Timeline | null = null;
    let introSpeed = INTRO_PACE.first;
    /* Development only: the intro held still for __mascotShot. */
    let introHeld = false;
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
      island.landedAt = performance.now();
      emitHeroCue("lights");
    };
    const playIntro = () => {
      if (introTimeline || intro.shown) return;
      intro.shown = true;
      // Landed on a restored scroll position: nobody is watching the hero.
      if (window.scrollY > window.innerHeight * 0.5) {
        Object.assign(power, { screen: 1, charge: 1 });
        Object.assign(intro, { p: 1, zoom: 0 });
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
          // A hop sized to the close-up.
          rig.startle(lastPlace.visible ? lastPlace.scale * 0.45 : 8);
        }, 1.1)
        .add(setFace(null), 1.45)
        .add(() => rig.wave(3.5), 2.1)
        .to(power, { charge: 1, duration: 0.5, ease: "steps(4)" }, 2.15)
        .add(setFace("hi"), 2.9)
        .to(intro, { typed: GREETING_LENGTH, duration: 0.9, ease: `steps(${GREETING_LENGTH})` }, 2.9)
        .add(setFace(null), 4.6)
        .to(intro, { zoom: 0, duration: 1.2, ease: "power2.inOut" }, 4.9)
        .add(() => emitHeroCue("world"), 6.0)
        .to(intro, { p: 1, duration: 1.5, ease: "none" }, 6.1)
        .add(touchdown, 7.6);
      if (seen) introSpeed = INTRO_PACE.seen;
      introTimeline = tl;
      hurryEvents.forEach((type) => window.addEventListener(type, hurry, { passive: true }));
    };
    window.addEventListener("telemetry:ready", playIntro, { once: true });
    if ((window as ReadyWindow).__telemetryReady) playIntro();
    const introFallback = window.setTimeout(playIntro, 4200);

    /* Works' screens: a click is a dive (pointing is the hero station's aim). */
    const posters = Array.from(document.querySelectorAll<HTMLElement>("[data-island-work]"));
    let dive: { el: HTMLElement; t: number; from: Placement & { visible: true }; jumped: boolean } | null = null;
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

    /* Flies from where it stood into the screen's centre, shrinking; the page
       jump starts on the way so the two overlap, and it comes out with it. */
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
        return { visible: false };
      }
      const goal = centre(el);
      const e = t * t;
      const k = from.scale * (1 - 0.6 * e);
      const headX = gsap.utils.interpolate(from.x, goal.x, e);
      const headY = gsap.utils.interpolate(from.y - HEAD_CENTER_Y * from.scale, goal.y, e) - Math.sin(Math.PI * t) * 40;
      return { ...from, x: headX, y: headY + HEAD_CENTER_Y * k, scale: k, pose: "hover", fly: 1, settled: false };
    };

    let wasVisible = false;
    let drawn = false;
    let lastKey = "";
    let wasSettled = false;
    let boopReadyAt = 0;
    let rideWave = false;
    let current: Element | null = null;
    let cueUntil = 0;
    let last = performance.now();
    /* Continuity: where it was drawn last frame, what it followed, and the
       hop from where it was drawn when that changed to the new spot. */
    type Spot = { x: number; y: number; scale: number };
    let drawnAt: Spot | null = null;
    let following = "";
    let hopping: { from: Spot; lift: number; t: number; seconds: number } | null = null;

    const step = (forcedDt?: number) => {
      const now = performance.now();
      const dt = forcedDt ?? Math.min(0.05, (now - last) / 1000);
      last = now;
      // A forced step (__mascotShot) draws even in a hidden tab.
      if (!director || (document.hidden && forcedDt === undefined)) return;
      if (window.scrollY !== lastScroll) {
        lastScroll = window.scrollY;
        lastActive = now;
        hurry();
      }
      if (introTimeline && introTimeline.progress() < 1 && !introHeld) {
        introTimeline.totalTime(introTimeline.totalTime() + dt * introSpeed, false);
      }

      // What the visitor is doing: the mouse, or a fresh tap, and what is under it.
      const tapFresh = now < lookUntil;
      let place = director.evaluate(window.scrollY, width, height, intro, dt, {
        poke: pointer ?? (tapFresh && !pointer ? look : null),
        target: hovered ?? (tapFresh ? tapped : null),
        now,
      });
      if (dive) {
        const diving = placeDive(dt);
        if (diving.visible) place = diving;
      }
      // On the board the transit owns it, once the board is uncovered under its head.
      const riding = ride.visible && !dive && ride.y - HEAD_CENTER_Y * ride.scale > ride.top;
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
          masks: null,
          aim: null,
        };
        if (ride.wave && !rideWave) rig.wave();
      }
      rideWave = riding && ride.wave;

      /* A change of what it follows is flown, not cut: from where it was
         drawn to the new spot (live, so it lands where that is by then), over
         a hop with an arc. */
      if (place.visible) {
        const follows = `${dive ? "dive:" : ""}${place.key}`;
        if (drawnAt && (follows !== following || rebuilt)) {
          const far = Math.hypot(drawnAt.x - place.x, drawnAt.y - place.y);
          hopping =
            far > 2 || Math.abs(Math.log(drawnAt.scale / place.scale)) > 0.02
              ? { from: drawnAt, lift: Math.min(140, far * 0.18), t: 0, seconds: Math.min(HOP.max, HOP.base + far * HOP.perPx) }
              : null;
        }
        following = follows;
        rebuilt = false;
        if (hopping) {
          hopping.t += dt / hopping.seconds;
          if (hopping.t >= 1) hopping = null;
          else {
            const { from } = hopping;
            const e = easeInOut(hopping.t);
            const up = Math.sin(Math.PI * hopping.t);
            place = {
              ...place,
              x: from.x + (place.x - from.x) * e,
              y: from.y + (place.y - from.y) * e - up * hopping.lift,
              scale: from.scale * Math.exp(Math.log(place.scale / from.scale) * e),
              fly: Math.max(place.fly, clamp(up * 1.6, 0, 1)),
              settled: false,
              aim: null,
            };
          }
        }
        drawnAt = { x: place.x, y: place.y, scale: place.scale };
      } else {
        drawnAt = null;
        hopping = null;
      }
      lastPlace = place;

      /* The screen: knocked on once it has settled over the element, a beat
         of static, the element; powered down on its way out. */
      const screen = place.visible ? place.screen : undefined;
      if (screen) {
        const was = screenMode;
        screenT += dt;
        const go = (mode: ScreenMode) => {
          screenMode = mode;
          screenT = 0;
          if (mode === "knock") rig.knock();
        };
        if (screenMode === "dark") {
          if (screen.live) go("wait");
        } else if (screenMode === "wait" || screenMode === "knock") {
          if (!screen.live) go("dark");
          else if (screenMode === "wait" && screenT >= KNOCK_DELAY) go("knock");
          else if (screenMode === "knock" && screenT >= KNOCK_HITS[KNOCK_HITS.length - 1]) go("static");
        } else if (screenMode === "static" || screenMode === "on") {
          if (!screen.live) go("off");
          else if (screenMode === "static" && screenT >= STATIC_SECONDS) go("on");
        } else if (screen.live) go("static");
        else if (!screen.aligned || screenT >= OFF_SECONDS) go("dark");
        if (screenMode !== was) showScreen(screen.el, screenMode);
      } else if (screenMode !== "dark") {
        screenMode = "dark";
        director.screens.forEach((el) => showScreen(el, "dark"));
      }
      const hole = screenMode === "static" || screenMode === "on" || screenMode === "off";

      setHome(place.visible && place.key === "hero" && place.settled);
      const spot = director.parcelSpot(width, height);
      let frame: ReturnType<typeof rig.update> | null = null;
      if (!place.visible) {
        wasVisible = false;
        // A parcel left on the window still needs its render pixel.
        if (spot && pixelFor(spot.scale) !== pixel) {
          pixel = pixelFor(spot.scale);
          fit();
        }
      } else {
        if (!wasVisible) rig.teleport();
        // Landing and greeting fire once on arrival, not while holding.
        if (place.settled && !(wasSettled && place.key === lastKey)) {
          if (place.pose === "sit") rig.land();
          if (place.wave) rig.wave();
        }
        wasVisible = true;
        lastKey = place.key;
        wasSettled = place.settled;

        // The close-up model until the pull-back is nearly done.
        const hd = place.hd ?? (place.zoom ?? 0) > CLOSEUP_HD;
        const nextPixel = hd ? closeupPixel(place.scale) : pixelFor(place.scale);
        if (nextPixel !== pixel) {
          pixel = nextPixel;
          fit();
        }

        /* Aim: the hovered or focused item, else the section's current item,
           pointed out for a moment whenever it changes. */
        const aim = riding ? null : place.aim;
        const focused = document.activeElement;
        const touched = now < lookUntil ? tapped : null;
        const hot = aim
          ? (hovered?.closest(aim.select) ??
            touched?.closest(aim.select) ??
            (focused !== document.body ? focused?.closest(aim.select) : null))
          : null;
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
        if (gaze && !point && place.settled && !place.lock && now - lastMove < 120 && now > boopReadyAt) {
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
          hands: place.hands,
          lean: place.lean,
          carry: parcel.carry,
          frame: riding ? { yaw: ride.yaw, tilt: ride.tilt, roll: ride.roll } : null,
          face: riding && ride.face ? ride.face : face,
          hd,
          perspective: place.zoom ?? 0,
          typed: intro.typed,
          lock: place.lock,
          hole,
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
      const masks = place.visible && place.masks?.length ? toClip(place.masks, width, height) : undefined;
      renderer.draw(frame ? [...frame.parts, ...parcelParts] : parcelParts, state, masks);
      drawn = true;
    };
    const tick = () => step();
    gsap.ticker.add(tick);
    /* Development only: `__mascotShot(seconds)` holds the intro at that
       second, renders a second's worth of frames on top and returns the
       canvas, for checking the opening without a running clock. */
    if (process.env.NODE_ENV !== "production") {
      (window as Window & { __mascotShot?: (at: number, frames?: number) => string }).__mascotShot = (at, frames = 60) => {
        playIntro();
        introHeld = true;
        introTimeline?.totalTime(at, false);
        for (let i = 0; i < frames; i += 1) step(1 / 60);
        return canvas.toDataURL("image/png");
      };
      /* `__mascotTrace(frames)` steps that many frames and says where it is
         drawn after each, for checking a route without a running clock. */
      (window as Window & { __mascotTrace?: (frames?: number) => unknown[] }).__mascotTrace = (frames = 1) =>
        Array.from({ length: frames }, () => {
          step(1 / 60);
          if (!lastPlace.visible) return null;
          const { key, x, y, scale, settled } = lastPlace;
          return { key, x: Math.round(x), y: Math.round(y), scale: Math.round(scale * 10) / 10, settled };
        });
    }

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerdown", onTap);
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
