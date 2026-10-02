/**
 * Where the mascot lives on the homepage, and what it does there.
 *
 * Once the intro has played it is always on screen. Between stations it sits
 * on its perch, the page's progress bar in the TREE panel (hanging under the
 * TREE bar where that panel folds into one), which stays on screen as the
 * page scrolls; every flight starts where it is and ends where it goes.
 *
 * A station glues the mascot to a DOM element: it flies over from its perch
 * while the element scrolls into its `enter` range, holds a pose on it, and
 * flies back to its perch over the `leave` range. Ranges are ScrollTrigger start strings, measured on the
 * element itself or on `enterOn`/`leaveOn`, so pins and resizes are measured
 * by ScrollTrigger rather than by hand. A station inside a pinned stage
 * measures its ranges outside the pin: on the section for the way in, and on
 * the section's offer (the first thing after the pin) for the way out.
 *
 * In the hero and at the request it works the section: it points at the
 * item under the cursor or in focus, keeps an eye on the section's current
 * item and points it out when it changes.
 *
 * Inside the works' own sections it does not stand in front of the content
 * pointing: it plays a part in it or hides behind it (an `act`,
 * lib/mascot/acts.ts): it stamps the cartridges into the deck, plays
 * hide-and-seek round the ring's screen, climbs the layer stack as it
 * lights, and turns the viewer's captures over.
 *
 * At a screen station it is the section's scene itself: a close-up whose
 * glass covers the station's element, showing the page through it.
 *
 * A cameo is a scrubbed pass between stations: it hops off its perch onto
 * the load bar of a seam, rides it as the bar fills, then hops back.
 *
 * Selectors reuse hooks the sections already expose for motion.
 */

import { ISLAND_CAMERA } from "@/lib/hero/island";
import type { ActName } from "@/lib/mascot/acts";
import { SIGNAL_LINE } from "@/lib/motion/bus";

export type Pose = "hover" | "sit" | "peek";

export type AimDef = {
  /** Items pointed at while hovered or focused. */
  select: string;
  /** The section's current item; the last match wins. */
  active?: string;
};

export type StationDef = {
  id: string;
  select: string;
  /** Which match of `select`; defaults to the first. */
  index?: number;
  pose: Pose;
  /** Anchor inside the element's box, 0..1 (may reach past it). For peek
      `ay` is ignored (the top edge); for sit it defaults to the top edge. */
  ax: number;
  ay?: number;
  /** CSS px per voxel; without it, its perch's size. */
  scale?: number;
  /** Take the voxel size from the element's layout width instead, so CSS
      can size the mascot together with the scene it stands in. */
  scaleFromElement?: boolean;
  /** Camera pitch (radians) to match the scene it stands in. */
  tilt?: number;
  /** null: arrives with the page intro instead of by scroll. */
  enter: [string, string] | null;
  /** Measure `enter` on this element instead of the station's own. */
  enterOn?: string;
  /** The intro opens on a full-length shot mid-screen and flies it in from there. */
  opening?: boolean;
  /** null: stays until the end of the page. */
  leave: [string, string] | null;
  /** Measure `leave` on this element instead of the station's own. */
  leaveOn?: string;
  /** The page powers off here (lib/motion/finale.ts): it dozes and goes dark with it. */
  halts?: boolean;
  /** Mask the element so the mascot reads as behind it. */
  occlude?: boolean;
  /** Plays a part in the section instead of holding a pose on the element
      (lib/mascot/acts.ts); the element is the section's scene it reads.
      `scale` is its size (seek: the most it grows to). */
  act?: ActName;
  /** A peek that climbs up onto the edge once this shows up in the element. */
  rise?: string;
  /** Wave once each time it settles here. */
  wave?: boolean;
  /** A close-up whose glass covers the element (as wide as the glass):
      the element shows through it once it has knocked its screen on
      (lib/mascot/director.ts, `data-screen` on the element). It grows
      from its perch's size on the way; pose, anchor and scale are ignored. */
  screen?: boolean;
  aim?: AimDef;
  /** Where it sets the parcel down (lib/mascot/parcel.ts): on the element's
      top edge, `dx` voxels from its own anchor, until `done` shows up in
      the element and the parcel is sent into it. */
  parcel?: { dx: number; done: string };
};

export type CameoDef = {
  id: string;
  /** Scroll range owner, and which match of it. */
  trigger: string;
  index?: number;
  start: string;
  end: string;
  /** The bar it rides, inside the trigger. */
  along: string;
  /** Part of the range spent riding the bar; before it, it waits at the
      bar's start, after it at the end. */
  span: [number, number];
  scale: number;
};

/** Where it waits between stations. */
export type PerchDef = {
  select: string;
  /** Anchor along the element, 0..1. */
  ax: number;
  /** sit: on the element's top edge; hover: hanging under its bottom edge. */
  pose: "sit" | "hover";
  scale: number;
  aim?: AimDef;
};

export type RouteDef = {
  stations: StationDef[];
  cameos: CameoDef[];
  /** The first of these laid out on the page is its perch. */
  perch: PerchDef[];
};

/* Seams fill their bar over this scrub (MotionProvider): it lands just before the signal line. */
const seam = (index: number, scale: number): CameoDef => ({
  id: `seam-${index}`,
  trigger: "[data-seam]",
  index,
  start: "top 94%",
  end: `bottom ${SIGNAL_LINE * 100 + 4}%`,
  along: ".seamBar",
  span: [0.2, 0.9],
  scale,
});

const desktop: RouteDef = {
  stations: [
    {
      // Stands on the socket of the hero island, seen from the island
      // camera's pitch. The intro flies it here from mid-screen. It points
      // at the work's screen under the cursor and points out each change of
      // the current one. It leaves with the scroll, as the first transit
      // comes up, and the transit takes it from its perch.
      id: "hero",
      select: "[data-island-spot]",
      pose: "sit",
      ax: 0.5,
      scale: 9,
      scaleFromElement: true,
      tilt: ISLAND_CAMERA.pitch,
      enter: null,
      opening: true,
      leave: ["top 34%", "top -6%"],
      aim: { select: "[data-island-work]", active: "[data-island-work][data-current]" },
    },
    {
      // Stamps the works' cartridges into the deck, one jump per step, then
      // pops up out of the first free slot (seen from the deck's camera).
      id: "programs",
      select: "[data-deck-view]",
      act: "load",
      pose: "sit",
      ax: 0.5,
      scale: 5,
      tilt: 0.4,
      enter: ["top 75%", "top 25%"],
      enterOn: "[data-deck]",
      leave: ["top bottom+=60", "top 70%"],
      leaveOn: "#works + [data-seam]",
    },
    {
      // Hide-and-seek round the ring's front screen, a side per capture.
      id: "ring",
      select: "[data-ring-scene]",
      act: "seek",
      pose: "sit",
      ax: 0.5,
      scale: 6,
      enter: ["top 75%", "top 25%"],
      enterOn: "[data-ring]",
      leave: ["top bottom+=60", "top 70%"],
      leaveOn: "#case-site [data-offer]",
    },
    {
      // Rides the layer stack, a layer up each time one lights.
      id: "monitor",
      select: "[data-monitor]",
      act: "lift",
      pose: "sit",
      ax: 0.5,
      scale: 3.8,
      enter: ["top 92%", "top 52%"],
      leave: ["top 8%", "top -12%"],
    },
    {
      // Turns the captures over: peeks over the front one, rides it out.
      id: "screens",
      select: "[data-viewer-scene]",
      act: "flip",
      pose: "peek",
      ax: 0.5,
      scale: 5,
      enter: ["top 75%", "top 25%"],
      enterOn: "[data-viewer]",
      leave: ["top bottom+=60", "top 70%"],
      leaveOn: "#screens [data-offer]",
    },
    {
      // The stack is shown on its own screen: it flies up close, its glass
      // over the board's slot, knocks on its temple and the board boots
      // there; it assembles on the pin's scrub behind the glass.
      id: "stack",
      select: "[data-board-screen]",
      pose: "hover",
      ax: 0.5,
      screen: true,
      enter: ["top 95%", "top 20%"],
      enterOn: "[data-board]",
      leave: ["top bottom+=60", "top 45%"],
      leaveOn: "#stack [data-offer]",
    },
    {
      // Peeks over the form's corner under the section number, clear of the
      // lead, and watches the field in use. Here it sets down the parcel it
      // has carried since the hero, beside itself on the window; when the
      // request is sent it climbs up onto the window, the parcel drops in
      // and it waves.
      id: "request",
      select: ".terminal",
      pose: "peek",
      ax: 0.11,
      scale: 6,
      enter: ["top 100%", "top 62%"],
      leave: ["top 20%", "top 0%"],
      occlude: true,
      rise: ".terminalDone",
      aim: { select: ".terminalForm :is(input, select, button)", active: ".terminalDone" },
      parcel: { dx: 13, done: ".terminalDone" },
    },
    {
      // Docks on the charging pad on the last screen, falls asleep there and
      // powers off with the page; wakes with a start when it powers back on.
      id: "footer",
      select: "[data-footer-dock]",
      pose: "sit",
      ax: 0.5,
      scale: 6,
      enter: ["top 100%", "top 50%"],
      leave: null,
      halts: true,
    },
  ],
  cameos: [seam(0, 5), seam(1, 5)],
  perch: [
    // On the progress bar, right of its percentage, clear of the tree's
    // labels; it sits there quietly, looking about.
    { select: ".railBar", ax: 0.9, pose: "sit", scale: 4 },
    // Below 1025px the panel folds into the TREE bar under the header.
    { select: ".railToggle", ax: 0.9, pose: "hover", scale: 3.5 },
  ],
};

const [hero, programs, ring, monitor, screens, stack, request, footer] = desktop.stations;

/* Phones: the same route, smaller. The deck, the ring, the viewer and the board pin
   only their scene under the head there, so the mascot is glued to the same
   elements and comes along; it flies in as the scene comes up under the
   head (a phone's head is a screen tall on its own). */
const mobile: RouteDef = {
  stations: [
    hero,
    // The channels follow the pinned deck there: it leaves as they come up.
    { ...programs, scale: 4, enter: ["top 100%", "top 55%"], enterOn: "[data-deck-scene]", leaveOn: "[data-deck-channels]" },
    { ...ring, scale: 4.5, enter: ["top 100%", "top 55%"], enterOn: "[data-ring-scene]" },
    { ...monitor, scale: 2.6, leave: ["top 0%", "top -20%"] },
    { ...screens, scale: 3.6, enter: ["top 100%", "top 55%"], enterOn: "[data-viewer-scene]" },
    { ...stack, enterOn: "[data-board-dock]" },
    { ...request, ax: 0.8, scale: 4.5, parcel: { dx: -13, done: ".terminalDone" } },
    { ...footer, scale: 4.5 },
  ],
  cameos: [seam(0, 4), seam(1, 4)],
  perch: [{ select: ".railToggle", ax: 0.88, pose: "hover", scale: 3 }],
};

export const routes = { desktop, mobile } as const;
