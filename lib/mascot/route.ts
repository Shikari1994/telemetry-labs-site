/**
 * Where the mascot lives on the homepage, and what it does there.
 *
 * A station glues the mascot to a DOM element: it flies in while the element
 * scrolls into its `enter` range, holds a pose on it, and leaves over the
 * `leave` range. Ranges are ScrollTrigger start strings, measured on the
 * element itself or on `enterOn`/`leaveOn`, so pins and resizes are measured
 * by ScrollTrigger rather than by hand. A station inside a pinned stage
 * measures its ranges outside the pin: on the section for the way in, and on
 * the section's offer (the first thing after the pin) for the way out.
 *
 * At a station it works the section: it points at the item under the cursor
 * or in focus, keeps an eye on the section's current item (the screen in
 * front, the layer that just lit) and points it out when it changes.
 *
 * At a screen station it is the section's scene itself: a close-up whose
 * glass covers the station's element, showing the page through it.
 *
 * A cameo is a scrubbed pass between stations: it rides the load bar of a
 * seam as the bar fills, then flies on to the next section.
 *
 * Selectors reuse hooks the sections already expose for motion.
 */

import { ISLAND_CAMERA } from "@/lib/hero/island";
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
  /** CSS px per voxel. */
  scale: number;
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
  /** "down": leaves by dropping out under the screen, into the transit
      below, instead of flying up and away. */
  exit?: "down";
  /** The page powers off here (lib/motion/finale.ts): it dozes and goes dark with it. */
  halts?: boolean;
  /** Mask the element so the mascot reads as behind it. */
  occlude?: boolean;
  /** Wave once each time it settles here. */
  wave?: boolean;
  /** A close-up whose glass covers the element (as wide as the glass):
      the element shows through it once it has knocked its screen on
      (lib/mascot/director.ts, `data-screen` on the element). `scale` is
      its size on the way in and out; pose and anchor are ignored. */
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
  /** Part of the range spent on the bar; before it flies in, after it on. */
  span: [number, number];
  scale: number;
};

export type RouteDef = { stations: StationDef[]; cameos: CameoDef[] };

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
      // the current one.
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
      exit: "down",
      aim: { select: "[data-island-work]", active: "[data-island-work][data-current]" },
    },
    {
      // On top of the second cartridge; points at the cartridge or the
      // direction under the cursor.
      id: "programs",
      select: "[data-program-card]",
      index: 1,
      pose: "sit",
      ax: 0.5,
      scale: 6,
      enter: ["top 100%", "top 58%"],
      leave: ["top 30%", "top 6%"],
      aim: { select: "[data-cart], [data-service]" },
    },
    {
      // Presents the ring from the right end of its caption rule, pointing
      // out each screen as it turns to the front.
      id: "ring",
      select: ".ringInfo",
      pose: "sit",
      ax: 0.93,
      scale: 6,
      enter: ["top 75%", "top 25%"],
      enterOn: "[data-ring]",
      leave: ["top bottom+=60", "top 70%"],
      leaveOn: "#case-site [data-offer]",
      aim: { select: "[data-ring-card]", active: "[data-ring-card].is-front" },
    },
    {
      // Stands in the stage beside the layer stack, on the empty floor above
      // its left corner, and points out each layer as it lights up.
      id: "monitor",
      select: "[data-monitor]",
      pose: "sit",
      ax: 0.18,
      ay: 0.3,
      scale: 6,
      enter: ["top 92%", "top 52%"],
      leave: ["top 8%", "top -12%"],
      aim: { select: "[data-slab]", active: "[data-slab].is-on" },
    },
    {
      // Sits on the viewer window beside the title; points out each capture
      // as it comes to the front, and the channel under the cursor.
      id: "screens",
      select: "[data-viewer-win]",
      pose: "sit",
      ax: 0.95,
      scale: 6,
      enter: ["top 75%", "top 25%"],
      enterOn: "[data-viewer]",
      leave: ["top bottom+=60", "top 70%"],
      leaveOn: "#screens [data-offer]",
      aim: { select: "[data-viewer-item]", active: "[data-viewer-shot].is-front" },
    },
    {
      // The stack is shown on its own screen: it flies up close, its glass
      // over the board's slot, knocks on its temple and the board boots
      // there; it assembles on the pin's scrub behind the glass.
      id: "stack",
      select: "[data-board-screen]",
      pose: "hover",
      ax: 0.5,
      scale: 6,
      screen: true,
      enter: ["top 95%", "top 20%"],
      enterOn: "[data-board]",
      leave: ["top bottom+=60", "top 45%"],
      leaveOn: "#stack [data-offer]",
    },
    {
      // Sits on the form's corner under the section number, clear of the
      // lead, and points at the field in use; when the request is sent it
      // turns to the confirmation. Here it sets down the parcel it has
      // carried since the hero, beside itself on the window, and the parcel
      // drops into the window when the request goes.
      id: "request",
      select: ".terminal",
      pose: "sit",
      ax: 0.11,
      scale: 6,
      enter: ["top 100%", "top 62%"],
      leave: ["top 20%", "top 0%"],
      wave: true,
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
};

const [hero, programs, ring, monitor, screens, stack, request, footer] = desktop.stations;

/* Phones: the same route, smaller. The ring, the viewer and the board pin
   only their scene under the head there, so the mascot is glued to the same
   elements and comes along; it flies in as the scene comes up under the
   head (a phone's head is a screen tall on its own). Above the form there
   is only room to peek. */
const mobile: RouteDef = {
  stations: [
    hero,
    { ...programs, index: 0, ax: 0.72, scale: 4.5 },
    { ...ring, ax: 0.9, scale: 4.5, enter: ["top 100%", "top 55%"], enterOn: "[data-ring-scene]" },
    // The stack fills the stage here; it stands in the free corner under it.
    { ...monitor, ax: 0.86, ay: 0.98, scale: 4.5, leave: ["top 0%", "top -20%"] },
    // The window's top edge is right under the status bar here: it sits on
    // the channel bar under the window instead.
    {
      ...screens,
      select: ".viewerList",
      ax: 0.88,
      scale: 4.5,
      enter: ["top 100%", "top 55%"],
      enterOn: "[data-viewer-scene]",
    },
    { ...stack, scale: 4.5, enterOn: "[data-board-dock]" },
    { ...request, pose: "peek", ax: 0.8, scale: 4.5, occlude: true, parcel: { dx: -13, done: ".terminalDone" } },
    { ...footer, scale: 4.5 },
  ],
  cameos: [seam(0, 4), seam(1, 4)],
};

export const routes = { desktop, mobile } as const;
