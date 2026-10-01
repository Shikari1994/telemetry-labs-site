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
 * A cameo is a scrubbed pass between stations: it rides the load bar of a
 * seam as the bar fills, then flies on to the next section.
 *
 * Selectors reuse hooks the sections already expose for motion.
 */

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

/* Seams fill their bar over this scrub (MotionProvider). */
const seam = (index: number, scale: number): CameoDef => ({
  id: `seam-${index}`,
  trigger: "[data-seam]",
  index,
  start: "top 94%",
  end: "bottom 82%",
  along: ".seamBar",
  span: [0.2, 0.9],
  scale,
});

const desktop: RouteDef = {
  stations: [
    {
      // Stands on the charging pad in the middle of the hero room, seen from
      // the room camera's pitch. The intro flies it here from mid-screen.
      // It points at the poster under the cursor.
      id: "hero",
      select: "[data-room-spot]",
      pose: "sit",
      ax: 0.5,
      scale: 9,
      scaleFromElement: true,
      tilt: 0.38,
      enter: null,
      opening: true,
      leave: ["top 34%", "top -6%"],
      exit: "down",
      aim: { select: "[data-room-poster]" },
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
      // Peeks over the layer stack and watches the layers light up.
      id: "monitor",
      select: "[data-monitor]",
      pose: "peek",
      ax: 0.86,
      scale: 6,
      enter: ["top 92%", "top 62%"],
      leave: ["top 30%", "top 10%"],
      occlude: true,
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
      // Stands on the floor of the orbit window, clear of the globe, and
      // points at the tag under the cursor.
      id: "stack",
      select: "[data-orbit]",
      pose: "sit",
      ax: 0.88,
      ay: 1,
      scale: 6,
      enter: ["bottom 110%", "bottom 75%"],
      leave: ["bottom 30%", "bottom 5%"],
      aim: { select: "[data-orbit-tag]" },
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
      enter: ["top 100%", "top 72%"],
      leave: null,
      halts: true,
    },
  ],
  cameos: [seam(0, 5), seam(1, 5)],
};

const [hero, programs, , monitor, , stack, request, footer] = desktop.stations;

/* Phones: no pins, so the ring and the viewer scroll by as plain rows and
   the mascot skips them. Above the form there is only room to peek. */
const mobile: RouteDef = {
  stations: [
    hero,
    { ...programs, index: 0, ax: 0.72, scale: 4.5 },
    { ...monitor, ax: 0.8, scale: 4.5 },
    { ...stack, ax: 0.84, scale: 4.5 },
    { ...request, pose: "peek", ax: 0.8, scale: 4.5, occlude: true, parcel: { dx: -13, done: ".terminalDone" } },
    { ...footer, scale: 4.5 },
  ],
  cameos: [seam(0, 4), seam(1, 4)],
};

export const routes = { desktop, mobile } as const;
