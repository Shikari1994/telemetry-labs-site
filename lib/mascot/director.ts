import { ScrollTrigger } from "gsap/ScrollTrigger";
import { pace as follow } from "@/lib/motion/pace";
import { clamp, easeInCubic, easeInOut, easeOutCubic, mix } from "@/lib/mascot/math";
import { GLASS_WIDE } from "@/lib/mascot/hd";
import { HEAD_CENTER_Y, PEEK_DEPTH, PEEK_HIDE } from "@/lib/mascot/model";
import type { Spot } from "@/lib/mascot/parcel";
import type { AimDef, CameoDef, Pose, RouteDef, StationDef } from "@/lib/mascot/route";

/**
 * Maps the scroll position to where the mascot is and what it is doing.
 *
 * ScrollTrigger owns every measurement (it re-measures on refresh, pins and
 * breakpoint rebuilds); per frame the director only reads trigger start/end
 * numbers and the live box of at most one element, so the mascot stays glued
 * to its card while the page scrolls under it.
 *
 * A station marked `opening` opens the page: the intro first holds a close-up
 * of the robot (the close-up model, hd.ts: its head filling the screen and
 * room beside it for the waving hand), pulls back to the whole mascot in the
 * middle of the viewport, about half its height, then flies it in an arc
 * down onto its spot, shrinking as it goes.
 *
 * While it holds a station the placement carries the station's aim, which
 * the mascot resolves against the cursor and the section's current item.
 *
 * A `screen` station is a close-up of its own: it flies up from under the
 * screen, growing until its glass covers the station's element exactly (the
 * element is as wide as the glass), squares up to the camera and holds
 * there; it powers the screen down before it shrinks away again.
 *
 * Must be created inside a gsap.matchMedia callback so its triggers are
 * reverted when the breakpoint changes.
 */

export type Placement =
  | { visible: false }
  | {
      visible: true;
      key: string;
      x: number;
      y: number;
      scale: number;
      pose: Pose;
      fly: number;
      tilt?: number;
      /** Fully arrived and holding the station pose. */
      settled: boolean;
      wave: boolean;
      /** Boxes the mascot is behind, in viewport px. */
      occluders: DOMRect[] | null;
      /** What it works on while settled. */
      aim: AimDef | null;
      /** At the station where the page powers off. */
      halts?: boolean;
      /** The opening close-up: 1 held … 0 pulled back. */
      zoom?: number;
      /** Draw the close-up model whatever the zoom (a screen station). */
      hd?: boolean;
      /** 0 free … 1 square on to the camera and still (lib/mascot/rig.ts). */
      lock?: number;
      /** A screen station's element, and whether the glass covers it now
          (`aligned`) and is staying (`live`: not on its way out). */
      screen?: { el: HTMLElement; aligned: boolean; live: boolean };
    };

type Range = { start: number; end: number };

/** Opening shot: hidden until shown; `zoom` 1 holds the close-up … 0 the
    whole robot, then `p` 0 holds the whole robot … 1 landed. `typed` counts
    the glyphs of the greeting typed out on its screen. */
export type Intro = { shown: boolean; p: number; zoom: number; typed: number };

/** Model height from the ground point to the antenna tip, and the height of
    its middle, in voxels; the arms spread a little wider than this. */
const ROBOT_TALL = 28;
const ROBOT_MID = 14;
const ROBOT_WIDE = 16;

/** CSS px per voxel for the opening shot: the whole robot, half the viewport tall. */
export function openingScale(width: number, height: number) {
  return Math.min((height * 0.5) / ROBOT_TALL, (width * 0.6) / ROBOT_WIDE);
}

/** Below this the close-up has pulled back far enough to swap to the voxel robot. */
export const CLOSEUP_HD = 0.15;

/** A screen station: CSS px per voxel above which the close-up model is
    drawn, and the share of its way out it holds still, the screen powering
    down, before it leaves. */
const SCREEN_HD = 22;
const SCREEN_HOLD = 0.2;

/**
 * The close-up framing: CSS px per voxel and where the head centre goes. On
 * a wide screen the head fills most of the height, set right so the waving
 * hand comes up on its left; on a tall one the whole robot fits the width,
 * the hand raised beside its head.
 */
function closeup(width: number, height: number) {
  if (width > height) {
    const k = Math.min((height * 0.68) / 10, (width * 0.62) / 15.5);
    return { k, x: width * 0.57, y: height * 0.6 };
  }
  const k = Math.min((height * 0.62) / ROBOT_TALL, (width * 0.86) / 21);
  return { k, x: width * 0.5 + k * 1.2, y: height * 0.3 };
}

/**
 * Scroll says where a station's flights should be; time says how fast they
 * may get there. Each station keeps its own `enter` and `leave` progress that
 * follow the scroll's, no faster than a flight takes (`ENTER_SECONDS`,
 * `LEAVE_SECONDS`), so a flick of the wheel does not make it flash by. The
 * station on stage keeps it until it is off, then the next one takes it.
 * The opening hero is the intro's and its way out is the transit's, so it
 * follows the scroll as it is.
 */
const ENTER_SECONDS = 1.25;
const LEAVE_SECONDS = 0.95;

type Pace = { enter: number; leave: number };
type ResolvedStation = {
  def: StationDef;
  el: HTMLElement;
  enter: ScrollTrigger | null;
  leave: ScrollTrigger | null;
  pace: Pace;
  paced: boolean;
};

const onStage = ({ pace }: ResolvedStation) => pace.enter > 0 && pace.leave < 1;

/* A station whose element has scrolled out of the screen is not seen leaving. */
function inView(el: HTMLElement, height: number) {
  const box = el.getBoundingClientRect();
  return box.bottom > -200 && box.top < height + 200;
}
type ResolvedCameo = { def: CameoDef; range: ScrollTrigger; along: HTMLElement };

const progress = (scroll: number, range: Range) =>
  clamp((scroll - range.start) / Math.max(1, range.end - range.start), 0, 1);

function measure(trigger: HTMLElement, [start, end]: [string, string]) {
  return ScrollTrigger.create({ trigger, start, end });
}

export function createDirector(route: RouteDef) {
  const stations: ResolvedStation[] = route.stations.flatMap((def) => {
    const el = document.querySelectorAll<HTMLElement>(def.select)[def.index ?? 0];
    const enterOn = def.enterOn ? document.querySelector<HTMLElement>(def.enterOn) : el;
    const leaveOn = def.leaveOn ? document.querySelector<HTMLElement>(def.leaveOn) : el;
    if (!el || !enterOn || !leaveOn) return [];
    return [
      {
        def,
        el,
        enter: def.enter ? measure(enterOn, def.enter) : null,
        leave: def.leave ? measure(leaveOn, def.leave) : null,
        pace: { enter: 0, leave: 0 },
        paced: Boolean(def.enter) && def.exit !== "down",
      },
    ];
  });

  const cameos: ResolvedCameo[] = route.cameos.flatMap((def) => {
    const trigger = document.querySelectorAll<HTMLElement>(def.trigger)[def.index ?? 0];
    const along = trigger?.querySelector<HTMLElement>(def.along);
    if (!trigger || !along) return [];
    return [{ def, range: measure(trigger, [def.start, def.end]), along }];
  });

  let seeded = false;
  let holder = -1;

  function placeOpening(station: ResolvedStation, intro: Intro, width: number, height: number): Placement {
    const spot = placeStation(station, 1, 0, width, height);
    if (!spot.visible) return spot;
    const { p, zoom } = intro;
    const ko = openingScale(width, height);
    // The size falls away first (the pull-back), then the glide catches up.
    let k = Math.exp(mix(Math.log(ko), Math.log(spot.scale), easeOutCubic(clamp(p * 1.25, 0, 1))));
    const s = easeInOut(p);
    let headX = mix(width / 2, spot.x, s);
    const headY0 = height / 2 - (HEAD_CENTER_Y - ROBOT_MID) * ko;
    let headY = mix(headY0, spot.y - HEAD_CENTER_Y * spot.scale, s) - Math.sin(Math.PI * s) * height * 0.16;
    let tilt = mix(0.04, spot.tilt ?? 0.22, s);
    if (zoom > 0) {
      // Before that, the camera dollies back out of the close-up.
      const near = closeup(width, height);
      k = Math.exp(mix(Math.log(k), Math.log(near.k), zoom));
      headX = mix(headX, near.x, zoom);
      headY = mix(headY, near.y, zoom);
      tilt = mix(tilt, 0.02, zoom);
    }
    return {
      ...spot,
      x: headX,
      y: headY + HEAD_CENTER_Y * k,
      scale: k,
      pose: "hover",
      fly: Math.sin(Math.PI * Math.min(1, p * 1.08)),
      tilt,
      settled: false,
      occluders: null,
      aim: null,
      zoom,
    };
  }

  /** A close-up whose glass covers the element: up from under the screen,
      growing as it comes; away up to the left, shrinking back. */
  function placeScreen(station: ResolvedStation, enter: number, leave: number, width: number, height: number): Placement {
    const { def, el } = station;
    const box = el.getBoundingClientRect();
    const near = Math.max(1, el.offsetWidth / GLASS_WIDE);
    const far = def.scale;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    let hx = cx;
    let hy = cy;
    let k = near;
    let fly = 0;
    let lock = 1;
    if (leave > SCREEN_HOLD) {
      const t = easeInCubic((leave - SCREEN_HOLD) / (1 - SCREEN_HOLD));
      k = Math.exp(mix(Math.log(near), Math.log(far), Math.sqrt(t)));
      hx = mix(cx, width * 0.2, t);
      hy = mix(cy, -12 * far, t);
      fly = Math.min(1, t * 3);
      lock = 1 - Math.min(1, t * 4);
    } else if (enter < 1) {
      const t = easeOutCubic(enter);
      k = Math.exp(mix(Math.log(far), Math.log(near), t * t));
      hx = mix(width * 0.86, cx, t);
      hy = mix(height + 4 * far, cy, t) - Math.sin(Math.PI * t) * height * 0.08;
      fly = 1 - t;
      lock = t * t;
    }
    const aligned = enter >= 1 && leave <= SCREEN_HOLD;
    return {
      visible: true,
      key: def.id,
      x: hx,
      y: hy + HEAD_CENTER_Y * k,
      scale: k,
      pose: "hover",
      fly,
      tilt: mix(0.22, 0, lock),
      settled: enter >= 1 && leave <= 0,
      wave: false,
      occluders: null,
      aim: null,
      hd: k > SCREEN_HD,
      lock,
      screen: { el, aligned, live: aligned && leave <= 0 },
    };
  }

  function placeStation(station: ResolvedStation, enter: number, leave: number, width: number, height: number): Placement {
    const { def, el } = station;
    if (def.screen) return placeScreen(station, enter, leave, width, height);
    const k = def.scaleFromElement ? Math.max(1, el.offsetWidth) : def.scale;
    const box = el.getBoundingClientRect();
    const x = box.left + def.ax * box.width;
    // Peek hides the body below the edge so only the eye pods show.
    const y =
      def.pose === "hover"
        ? box.top + (def.ay ?? 0.5) * box.height
        : def.pose === "peek"
          ? box.top + PEEK_DEPTH * k
          : box.top + (def.ay ?? 0) * box.height;

    let px = x;
    let py = y;
    let fly = def.pose === "hover" ? 0.15 : 0;

    if (leave > 0) {
      const t = easeInCubic(leave);
      if (def.pose === "peek") {
        py = y + PEEK_HIDE * k * t; // ducks back behind the edge
      } else if (def.exit === "down") {
        // Hops up off its spot and drops out under the screen, onto the board
        // the transit uncovers there.
        px = mix(x, x + 120, t);
        py = mix(y, height + 4 * k, t) - Math.sin(Math.PI * Math.min(1, leave * 1.6)) * 90;
        fly = Math.max(fly, Math.min(1, leave * 3));
      } else {
        px = mix(x, x - 180, t);
        py = mix(y, -18 * k, t);
        fly = Math.max(fly, Math.min(1, leave * 3));
      }
    } else if (enter < 1) {
      const t = easeOutCubic(enter);
      if (def.pose === "peek") {
        py = y + PEEK_HIDE * k * (1 - t); // rises from behind the edge
      } else if (def.pose === "sit") {
        px = mix(x + 260, x, t);
        py = mix(Math.min(y - 360, -18 * k), y, t) - Math.sin(Math.PI * enter) * 40;
        fly = Math.max(fly, 1 - t);
      } else {
        px = mix(width + 14 * k, x, t);
        py = mix(y - 140, y, t);
        fly = Math.max(fly, 1 - t);
      }
    }

    const settled = enter >= 1 && leave <= 0;
    return {
      visible: true,
      key: def.id,
      x: px,
      y: py,
      scale: k,
      pose: def.pose,
      fly,
      tilt: def.tilt,
      settled,
      wave: Boolean(def.wave),
      occluders: def.occlude ? [box] : null,
      aim: settled ? (def.aim ?? null) : null,
      halts: def.halts,
    };
  }

  /** Drops onto the start of the bar, rides its filling edge, flies off the end. */
  function placeCameo(cameo: ResolvedCameo, p: number): Placement {
    const { def } = cameo;
    const k = def.scale;
    const bar = cameo.along.getBoundingClientRect();
    const [a, b] = def.span;
    let x = mix(bar.left, bar.right, clamp((p - a) / (b - a), 0, 1));
    let y = bar.top - k;
    let fly = 0.45;
    if (p < a) {
      const t = easeOutCubic(p / a);
      x = mix(bar.left - 24 * k, bar.left, t);
      y = mix(bar.top - 36 * k, y, t);
      fly = 1 - t * 0.55;
    } else if (p > b) {
      const t = easeInCubic((p - b) / (1 - b));
      x = mix(bar.right, bar.right + 24 * k, t);
      y = mix(y, bar.top - 48 * k, t);
      fly = mix(0.45, 1, t);
    }
    return {
      visible: true,
      key: def.id,
      x,
      y,
      scale: k,
      pose: "hover",
      fly,
      settled: false,
      wave: false,
      occluders: null,
      aim: null,
    };
  }

  /* The station that takes the parcel, if this route has one. */
  const drop = stations.find((station) => station.def.parcel);

  return {
    /** Elements screen stations show through the glass. */
    screens: stations.filter((station) => station.def.screen).map((station) => station.el),
    /** Station that takes the parcel, to tell when it has settled there. */
    dropKey: drop?.def.id ?? null,
    /** The element the parcel is set down on. */
    dropElement: drop?.el ?? null,
    /** Where the parcel stands on its station, live, whether or not the
        mascot is there. */
    parcelSpot(): Spot | null {
      const parcel = drop?.def.parcel;
      if (!drop || !parcel) return null;
      const { def, el } = drop;
      const box = el.getBoundingClientRect();
      return {
        x: box.left + def.ax * box.width + parcel.dx * def.scale,
        y: box.top,
        scale: def.scale,
        done: el.querySelector(parcel.done),
      };
    },
    /** The intro stands in for the enter range of stations without one. `dt`
        (seconds) paces the flights: see `Pace`. */
    evaluate(scroll: number, width: number, height: number, intro: Intro, dt = 0): Placement {
      const goals = stations.map((station) => {
        const enter = station.enter ? progress(scroll, station.enter) : intro.shown ? intro.p : 0;
        const leave = station.leave ? progress(scroll, station.leave) : 0;
        const opening = !station.enter && Boolean(station.def.opening) && intro.shown && intro.p < 1;
        return { enter, leave, opening, wants: opening || (enter > 0 && leave < 1) };
      });
      // The later station wins while two overlap, so the hand-off moves forward.
      const wanted = goals.map((goal) => goal.wants).lastIndexOf(true);

      if (!seeded) {
        // First frame (or a rebuilt route): stand where the scroll says, no flight.
        seeded = true;
        stations.forEach((station, i) => {
          station.pace.enter = goals[i].enter;
          station.pace.leave = goals[i].leave;
        });
        holder = wanted;
      }

      // The station on stage keeps it until it is off, so a flick of the wheel
      // cannot cut a flight in half; the one that wants it waits its turn.
      if (holder >= 0 && holder !== wanted && !(stations[holder].paced && onStage(stations[holder]) && inView(stations[holder].el, height)))
        holder = -1;
      // A seam's cameo takes the stage as soon as no station wants it: it is
      // scrubbed on the bar and must not wait for a flight's long tail.
      const cameo = wanted < 0 ? cameos.find((c) => progress(scroll, c.range) > 0 && progress(scroll, c.range) < 1) : undefined;
      if (cameo) holder = -1;
      if (holder < 0) holder = wanted;

      stations.forEach((station, i) => {
        const goal = goals[i];
        const { pace } = station;
        if (!station.paced) {
          pace.enter = goal.enter;
          pace.leave = goal.leave;
        } else if (i !== holder) {
          // Off stage it stands where the scroll would put it.
          pace.leave = goal.leave >= 1 ? 1 : 0;
          pace.enter = goal.leave > 0 ? 1 : 0;
        } else {
          const away = wanted > holder;
          let enterGoal = goal.enter;
          let leaveGoal = goal.leave;
          if (away) {
            // Another station is next: finish the flight in progress and go.
            enterGoal = 1;
            leaveGoal = 1;
          }
          // Missed before it got there: back out the way it came in.
          if (leaveGoal >= 1 && pace.enter < 1 && pace.leave <= 0) {
            enterGoal = 0;
            leaveGoal = 0;
          }
          const arriving = pace.enter < 1;
          pace.enter = follow(pace.enter, pace.leave > 0 ? 1 : enterGoal, dt, ENTER_SECONDS);
          pace.leave = follow(pace.leave, arriving ? 0 : leaveGoal, dt, LEAVE_SECONDS);
        }
      });

      if (holder >= 0) {
        const station = stations[holder];
        if (goals[holder].opening && holder === wanted) return placeOpening(station, intro, width, height);
        if (onStage(station)) return placeStation(station, station.pace.enter, station.pace.leave, width, height);
      }
      if (cameo) return placeCameo(cameo, progress(scroll, cameo.range));
      return { visible: false };
    },
  };
}

export type Director = ReturnType<typeof createDirector>;
