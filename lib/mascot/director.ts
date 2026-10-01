import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clamp, easeInCubic, easeInOut, easeOutCubic, mix } from "@/lib/mascot/math";
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
 * A station marked `opening` opens the page: the intro first holds the whole
 * mascot in the middle of the viewport, about half its height (the voxel
 * model is too coarse for a close-up), then flies it in an arc down onto its
 * spot, shrinking as it goes.
 *
 * While it holds a station the placement carries the station's aim, which
 * the mascot resolves against the cursor and the section's current item.
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
    };

type Range = { start: number; end: number };

/** Opening shot: hidden until shown, then 0 holds the opening shot … 1 landed. */
export type Intro = { shown: boolean; p: number };

/** Model height from the ground point to the antenna tip, and the height of
    its middle, in voxels; the arms spread a little wider than this. */
const ROBOT_TALL = 28;
const ROBOT_MID = 14;
const ROBOT_WIDE = 16;

/** CSS px per voxel for the opening shot: the whole robot, half the viewport tall. */
export function openingScale(width: number, height: number) {
  return Math.min((height * 0.5) / ROBOT_TALL, (width * 0.6) / ROBOT_WIDE);
}

type ResolvedStation = { def: StationDef; el: HTMLElement; enter: ScrollTrigger | null; leave: ScrollTrigger | null };
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
      },
    ];
  });

  const cameos: ResolvedCameo[] = route.cameos.flatMap((def) => {
    const trigger = document.querySelectorAll<HTMLElement>(def.trigger)[def.index ?? 0];
    const along = trigger?.querySelector<HTMLElement>(def.along);
    if (!trigger || !along) return [];
    return [{ def, range: measure(trigger, [def.start, def.end]), along }];
  });

  function placeOpening(station: ResolvedStation, p: number, width: number, height: number): Placement {
    const spot = placeStation(station, 1, 0, width, height);
    if (!spot.visible) return spot;
    const ko = openingScale(width, height);
    // The size falls away first (the pull-back), then the glide catches up.
    const k = Math.exp(mix(Math.log(ko), Math.log(spot.scale), easeOutCubic(clamp(p * 1.25, 0, 1))));
    const s = easeInOut(p);
    const headX = mix(width / 2, spot.x, s);
    const headY0 = height / 2 - (HEAD_CENTER_Y - ROBOT_MID) * ko;
    const headY = mix(headY0, spot.y - HEAD_CENTER_Y * spot.scale, s) - Math.sin(Math.PI * s) * height * 0.16;
    return {
      ...spot,
      x: headX,
      y: headY + HEAD_CENTER_Y * k,
      scale: k,
      pose: "hover",
      fly: Math.sin(Math.PI * Math.min(1, p * 1.08)),
      tilt: mix(0.04, spot.tilt ?? 0.22, s),
      settled: false,
      occluders: null,
      aim: null,
    };
  }

  function placeStation(station: ResolvedStation, enter: number, leave: number, width: number, height: number): Placement {
    const { def, el } = station;
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
    /** The intro stands in for the enter range of stations without one. */
    evaluate(scroll: number, width: number, height: number, intro: Intro): Placement {
      // The later station wins while two overlap, so the hand-off moves forward.
      for (let i = stations.length - 1; i >= 0; i -= 1) {
        const station = stations[i];
        if (!station.enter && station.def.opening && intro.shown && intro.p < 1) {
          return placeOpening(station, intro.p, width, height);
        }
        const enter = station.enter ? progress(scroll, station.enter) : intro.shown ? intro.p : 0;
        const leave = station.leave ? progress(scroll, station.leave) : 0;
        if (enter > 0 && leave < 1) return placeStation(station, enter, leave, width, height);
      }
      for (const cameo of cameos) {
        const p = progress(scroll, cameo.range);
        if (p > 0 && p < 1) return placeCameo(cameo, p);
      }
      return { visible: false };
    },
  };
}

export type Director = ReturnType<typeof createDirector>;
