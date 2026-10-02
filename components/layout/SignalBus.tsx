"use client";

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { homeTree } from "@/data/home";
import { SIGNAL_LINE, setBusLauncher, type BusTrip } from "@/lib/motion/bus";
import { scrambleElement } from "@/lib/motion/scramble";

const SVG_NS = "http://www.w3.org/2000/svg";
/** Passive lanes running beside the data trunk, and their spacing (px). */
const LANES = 3;
const PITCH = 6;
/** Trunk distance from the narrative column's left edge (px). */
const TRUNK_INSET = 12;
/** 45° jog where a branch leaves the trunk (px). */
const JOG = 6;
/** Pad size at the end of a branch (px). */
const PAD = 5;
/** Seconds the packet spends running along the target's branch. */
const BRANCH_RUN = 0.42;
/** Frames of packet history drawn as its tail. */
const TAIL_FRAMES = 4;

type Pt = [number, number];

type Branch = {
  id: string;
  /** Trunk junction first, pad last. */
  points: Pt[];
  lit: SVGPathElement;
  pad: SVGRectElement;
  ring: SVGRectElement;
  via: SVGRectElement;
  on: boolean;
};

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  parent?.appendChild(node);
  return node;
}

const d = (points: Pt[]) => points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join(" ");

function cumulative(points: Pt[]) {
  const out = [0];
  for (let i = 1; i < points.length; i += 1) {
    out.push(out[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return out;
}

function pointAt(points: Pt[], cum: number[], s: number): Pt {
  const at = Math.min(cum[cum.length - 1], Math.max(0, s));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < at) i += 1;
  const span = cum[i] - cum[i - 1] || 1;
  const t = (at - cum[i - 1]) / span;
  const [ax, ay] = points[i - 1];
  const [bx, by] = points[i];
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

/** The stretch of a polyline between two arc lengths, corners included. */
function subPath(points: Pt[], cum: number[], from: number, to: number) {
  const out: Pt[] = [pointAt(points, cum, from)];
  for (let i = 1; i < points.length - 1; i += 1) if (cum[i] > from && cum[i] < to) out.push(points[i]);
  out.push(pointAt(points, cum, to));
  return d(out);
}

/** Restart a one-shot CSS animation class. */
function pulse(node: Element, name: string) {
  node.classList.remove(name);
  void node.getBoundingClientRect();
  node.classList.add(name);
}

/**
 * The homepage as a circuit board. A bus of traces runs down the gutter
 * between the TREE rail and the narrative; every section's top edge is a
 * branch off the data trunk, ending in a pad. Everything above the signal
 * line is powered, so scrolling pushes a signal front down the board and each
 * branch lights as the front reaches it (the section head boots right after,
 * on the same line). An in-page jump sends a packet along the trunk in step
 * with the scroll, flashing every junction it passes, and into the target's
 * branch.
 *
 * From 1025px it runs in the gutter beside the rail; narrower, where the
 * rail is a status bar, in the page's left margin with as many lanes as fit.
 * Geometry is read from the live layout on every ScrollTrigger refresh, so
 * pins and resizes are accounted for; per-frame work is attribute writes, no
 * React state.
 */
export function SignalBus() {
  const ref = useRef<SVGSVGElement>(null);
  const clipId = `bus-power-${useId().replace(/[^\w-]/g, "")}`;

  useEffect(() => {
    const root = ref.current;
    const frame = root?.parentElement;
    const flow = frame?.querySelector<HTMLElement>("[data-home-flow]");
    if (!root || !frame || !flow) return;
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    // Rebuilt across 1025px, where the rail column comes and goes.
    mm.add({ wide: "(min-width: 1025px)", narrow: "(max-width: 1024px)", reduced: "(prefers-reduced-motion: reduce)" }, (context) => {
      const { reduced } = context.conditions as { reduced: boolean };

      /* Static scaffold: groups are rebuilt on refresh, these stay. */
      const defs = svg("defs", {}, root);
      const clip = svg("clipPath", { id: clipId }, defs);
      const power = svg("rect", { x: -1000, y: 0, width: 99999, height: 0 }, clip);
      const dim = svg("g", { class: "busDim" }, root);
      const lit = svg("g", { class: "busLit", "clip-path": `url(#${clipId})` }, root);
      const branchLayer = svg("g", { class: "busBranches" }, root);
      const spark = svg("g", { class: "busSpark" }, root);
      const packet = svg("g", { class: "busPacket" }, root);
      const tail = svg("path", { class: "busTail" }, packet);
      const glow = svg("rect", { class: "busPacketGlow", width: 11, height: 11, x: -5.5, y: -5.5 }, packet);
      const head = svg("rect", { class: "busPacketHead", width: 5, height: 5, x: -2.5, y: -2.5 }, packet);

      let frameTop = 0;
      let height = 0;
      let trunkX = 0;
      let branches: Branch[] = [];
      let header: SVGRectElement | null = null;
      let holdId: string | null = null;
      let flight: gsap.core.Timeline | null = null;

      const layout = () => {
        const frameRect = frame.getBoundingClientRect();
        const flowRect = flow.getBoundingClientRect();
        frameTop = frameRect.top + window.scrollY;
        height = frame.offsetHeight;
        root.setAttribute("width", String(frameRect.width));
        root.setAttribute("height", String(height));
        root.setAttribute("viewBox", `0 0 ${frameRect.width} ${height}`);

        const left = flowRect.left - frameRect.left;
        const right = flowRect.right - frameRect.left;
        // A phone's margin is narrow: the trunk takes its middle, the lanes
        // close up and only those that fit (with their jog) are drawn.
        trunkX = Math.round(left - Math.min(TRUNK_INSET, left / 2)) + 0.5;
        const pitch = trunkX > 4 * PITCH ? PITCH : PITCH / 2;
        const laneCount = Math.max(0, Math.min(LANES, Math.floor((trunkX - 1) / pitch) - 1));

        const sections = homeTree
          .filter((node) => node.id !== "top")
          .map((node) => {
            const el = document.getElementById(node.id);
            return el ? { id: node.id, y: Math.round(el.getBoundingClientRect().top - frameRect.top) + 0.5 } : null;
          })
          .filter((item): item is { id: string; y: number } => item !== null);

        dim.replaceChildren();
        lit.replaceChildren();
        branchLayer.replaceChildren();

        /* Passive lanes jog sideways as one group between sections, like a
           routed bus; the trunk runs straight. */
        const jogs = sections.slice(1).map((section, index) => (sections[index].y + section.y) / 2);
        const lanes: Pt[][] = [];
        for (let k = 1; k <= laneCount; k += 1) {
          let shift = 0;
          const points: Pt[] = [[trunkX - k * pitch, 0]];
          jogs.forEach((y, index) => {
            const next = index % 2 === 0 ? -pitch : 0;
            points.push([trunkX - k * pitch + shift, Math.round(y) - pitch / 2]);
            points.push([trunkX - k * pitch + next, Math.round(y) + pitch / 2]);
            shift = next;
          });
          points.push([trunkX - k * pitch + shift, height]);
          lanes.push(points);
        }
        const trunk: Pt[] = [
          [trunkX, 0],
          [trunkX, height],
        ];
        for (const target of [dim, lit]) {
          lanes.forEach((points) => svg("path", { class: "busLane", d: d(points) }, target));
          svg("path", { class: "busTrunk", d: d(trunk) }, target);
        }

        /* Edge connector where the bus leaves the works index band. */
        [trunk, ...lanes].forEach((points) =>
          svg("rect", { class: "busHeaderPin", x: points[0][0] - 2, y: -2, width: 4, height: 4 }, dim),
        );
        header = svg("rect", { class: "busPad busHeader", x: trunkX - 3, y: -3, width: 6, height: 6 }, branchLayer);

        branches = sections.map((section) => {
          const end = right - PAD;
          const points: Pt[] =
            section.y < JOG + 2
              ? [
                  [trunkX, section.y],
                  [end, section.y],
                ]
              : [
                  [trunkX, section.y - JOG],
                  [trunkX + JOG, section.y],
                  [end, section.y],
                ];
          svg("path", { class: "busBranch", d: d(points) }, branchLayer);
          const litPath = svg("path", { class: "busBranchLit", d: d(points), pathLength: 1 }, branchLayer);
          const [jx, jy] = points[0];
          const via = svg("rect", { class: "busVia", x: jx - 1.5, y: jy - 1.5, width: 3, height: 3 }, branchLayer);
          const padBox = { x: end, y: section.y - PAD / 2, width: PAD, height: PAD };
          const ring = svg("rect", { class: "busRing", ...padBox }, branchLayer);
          const pad = svg("rect", { class: "busPad", ...padBox }, branchLayer);
          return { id: section.id, points, lit: litPath, pad, ring, via, on: false };
        });

        /* Spark: the signal front on the trunk. */
        spark.replaceChildren();
        svg("rect", { class: "busSparkGlow", x: trunkX - 4, y: -14, width: 8, height: 22 }, spark);
        svg("rect", { class: "busSparkCore", x: trunkX - 1.5, y: -9, width: 3, height: 12 }, spark);
        svg("rect", { class: "busSparkBit", x: trunkX - 1, y: -16, width: 2, height: 2 }, spark);
        svg("rect", { class: "busSparkBit", x: trunkX - 1, y: -22, width: 2, height: 2 }, spark);
      };

      const setBranch = (branch: Branch, on: boolean) => {
        if (branch.on === on) return;
        branch.on = on;
        branch.lit.classList.toggle("is-on", on);
        branch.pad.classList.toggle("is-on", on);
        branch.via.classList.toggle("is-on", on);
      };

      const update = () => {
        const front = window.scrollY + window.innerHeight * SIGNAL_LINE - frameTop;
        power.setAttribute("height", String(Math.max(0, Math.min(height, front))));
        const inside = front > 0 && front < height;
        spark.setAttribute("transform", `translate(0 ${Math.round(front)})`);
        spark.style.visibility = inside ? "visible" : "hidden";
        branches.forEach((branch) => {
          if (branch.id !== holdId) setBranch(branch, front >= branch.points[branch.points.length - 1][1]);
        });
      };

      const refresh = () => {
        layout();
        update();
      };

      if (reduced) {
        layout();
        power.setAttribute("height", String(height));
        spark.style.visibility = "hidden";
        branches.forEach((branch) => setBranch(branch, true));
        ScrollTrigger.addEventListener("refresh", layout);
        return () => {
          ScrollTrigger.removeEventListener("refresh", layout);
          root.replaceChildren();
        };
      }

      /* Packet ------------------------------------------------------------ */
      const launch = (trip: BusTrip) => {
        flight?.kill();
        if (holdId) {
          const held = branches.find((branch) => branch.id === holdId);
          holdId = null;
          if (held) setBranch(held, true);
        }

        const vh = window.innerHeight * SIGNAL_LINE;
        const startY = Math.max(0, Math.min(height, trip.fromY + vh - frameTop));
        const branch = branches.find((item) => item.id === trip.target);
        let points: Pt[];
        if (trip.target === "top") points = [[trunkX, startY], [trunkX, 0]];
        else if (branch) points = [[trunkX, startY], ...branch.points];
        // A card inside a section: ride to where the signal line will rest.
        else points = [[trunkX, startY], [trunkX, Math.max(0, Math.min(height, trip.toY + vh - frameTop))]];

        const cum = cumulative(points);
        const trunkRun = cum[1];
        const total = cum[cum.length - 1];
        const junctions = branches.filter((item) => item !== branch).map((item) => ({ item, y: item.points[0][1] }));
        const history: number[] = [];
        const state = { s: 0 };
        let lastY = startY;

        if (branch) {
          holdId = branch.id;
          setBranch(branch, false);
        }

        const render = () => {
          const [x, y] = pointAt(points, cum, state.s);
          head.setAttribute("transform", `translate(${x} ${y})`);
          glow.setAttribute("transform", `translate(${x} ${y})`);
          history.push(state.s);
          if (history.length > TAIL_FRAMES) history.shift();
          tail.setAttribute("d", subPath(points, cum, history[0], state.s));
          if (state.s <= trunkRun) {
            const lo = Math.min(lastY, y);
            const hi = Math.max(lastY, y);
            junctions.forEach(({ item, y: jy }) => {
              if (jy > lo && jy <= hi) pulse(item.via, "is-via");
            });
            lastY = y;
          }
        };

        const arrive = () => {
          if (branch) {
            holdId = null;
            setBranch(branch, true);
            pulse(branch.pad, "is-hit");
            pulse(branch.ring, "is-hit");
            const label = document.getElementById(branch.id)?.querySelector<HTMLElement>("[data-block-head] [data-scramble]");
            if (label) scrambleElement(label, 520);
          } else if (trip.target === "top" && header) {
            pulse(header, "is-hit");
          }
        };

        packet.classList.add("is-flying");
        render();
        flight = gsap
          .timeline({
            onComplete: () => {
              packet.classList.remove("is-flying");
              flight = null;
            },
          })
          .to(state, { s: trunkRun, duration: trip.duration, delay: trip.delay ?? 0, ease: trip.ease, onUpdate: render });
        if (total > trunkRun) flight.to(state, { s: total, duration: BRANCH_RUN, ease: "power2.in", onUpdate: render });
        flight.add(arrive).to({}, { duration: 0.12 });
      };

      refresh();
      const tracker = ScrollTrigger.create({ start: 0, end: "max", onUpdate: update, refreshPriority: -10 });
      ScrollTrigger.addEventListener("refresh", refresh);
      setBusLauncher(launch);

      return () => {
        setBusLauncher(null);
        flight?.kill();
        tracker.kill();
        ScrollTrigger.removeEventListener("refresh", refresh);
        root.replaceChildren();
      };
    });

    return () => mm.revert();
  }, [clipId]);

  return <svg className="bus" ref={ref} aria-hidden="true" focusable="false" />;
}
