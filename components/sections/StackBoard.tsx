"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { stackZones, type StackWork } from "@/data/home";
import { COLS, ROWS, UNIT, chipCells, frameCells, packetRoutes, pointAt, tracePath, traces } from "@/lib/stack/board";

const legend: [StackWork, string][] = [
  ["site", "geo-tn.com"],
  ["monitor", "Drill Monitor"],
  ["both", "обе работы"],
];

/** Board units per second a packet travels, and the pause before it runs again. */
const PACKET_SPEED = 120;
const PACKET_REST = 0.6;
/** Squares in a packet's trail, and their spacing in board units. */
const TRAIL = 3;
const TRAIL_GAP = 4;
const PING_MS = 220;

const chipCount = stackZones.reduce((sum, zone) => sum + zone.chips.length, 0);
const ref = (n: number) => `U${String(n).padStart(2, "0")}`;
const LOG_WIDTH = 26;

const area = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) =>
  ({ gridColumn: `${x} / span ${w}`, gridRow: `${y} / span ${h}` }) as CSSProperties;

/**
 * 06: the stack of both works as one circuit board, a stretch of the same
 * voxel board the transits fly over. Each technology is a chip in a socket,
 * grouped by where it works; traces carry the data from the rig through the
 * server to the office and the field, and the shared 3D chip bridges both
 * works. A POST log under the board lists each chip as it seats.
 *
 * The board is laid out in a screen slot shaped like the mascot's glass
 * (11 × 8). On desktop the mascot flies up close over the slot, knocks on
 * its temple and the board boots behind its glass (components/mascot,
 * `data-screen` on the slot); without it (phones, no WebGL, reduced motion)
 * the slot is a plain window.
 *
 * MotionProvider owns the assembly: it pins the head and the window on
 * desktop and, on one scrub, tilts the board in, drops the chips into their
 * sockets in the data's order and lights the traces between seated chips
 * (`is-building`, `is-ready`). This component only runs what is not on the
 * scrub: the note of the chip under the cursor, and packets running the
 * routes once the board is ready, on the GSAP ticker while it is on screen.
 * Under reduced motion or without JavaScript every chip is seated and still;
 * phones read the board as a list by zone.
 */
export function StackBoard({ head }: { head: ReactNode }) {
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const board = boardRef.current;
    const plane = board?.querySelector<HTMLElement>("[data-board-plane]");
    const note = board?.querySelector<HTMLElement>("[data-board-note]");
    if (!board || !plane || !note) return;
    gsap.registerPlugin(ScrollTrigger);

    const chips = new Map(
      gsap.utils.toArray<HTMLElement>("[data-chip]", board).map((chip) => [chip.dataset.chip!, chip]),
    );
    const paths = gsap.utils.toArray<SVGPathElement>("[data-trace]", board);
    const idle = note.textContent ?? "";
    let hot: HTMLElement | null = null;

    /* The chip under the cursor lights with its traces; its note prints. */
    const setHot = (chip: HTMLElement | null) => {
      if (chip === hot) return;
      hot?.classList.remove("is-hot");
      chip?.classList.add("is-hot");
      const label = chip?.dataset.chip;
      paths.forEach((path) =>
        path.classList.toggle("is-hot", !!label && (path.dataset.from === label || path.dataset.to === label)),
      );
      note.textContent = chip ? `> ${label} — ${chip.querySelector("[data-chip-note]")?.textContent ?? ""}` : idle;
      hot = chip;
    };
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      setHot((event.target as Element).closest<HTMLElement>("[data-chip]"));
    };
    const onLeave = () => setHot(null);
    plane.addEventListener("pointerover", onOver);
    plane.addEventListener("pointerleave", onLeave);

    const cleanup = () => {
      plane.removeEventListener("pointerover", onOver);
      plane.removeEventListener("pointerleave", onLeave);
      setHot(null);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return cleanup;

    /* Packets: each route runs its packet end to end, rests, and runs again,
       the routes out of step. A chip blinks as a packet passes under it. */
    const groups = gsap.utils.toArray<SVGGElement>("[data-packet]", board);
    const runs = packetRoutes.map((route, index) => ({
      route,
      at: -index * 0.45 * route.total,
      squares: Array.from(groups[index]?.children ?? []) as SVGRectElement[],
    }));
    const pings = new Map<HTMLElement, number>();

    const tick = (time: number, deltaMs: number) => {
      const ready = board.classList.contains("is-ready");
      groups.forEach((group) => group.classList.toggle("is-on", ready));
      if (!ready) return;
      const dt = Math.min(deltaMs, 50) / 1000;
      const now = time * 1000;
      runs.forEach((run) => {
        const before = run.at;
        run.at += PACKET_SPEED * dt;
        if (run.at > run.route.total + PACKET_SPEED * PACKET_REST) run.at = 0;
        run.squares.forEach((square, k) => {
          const d = run.at - k * TRAIL_GAP;
          const visible = d >= 0 && d <= run.route.total;
          square.style.visibility = visible ? "visible" : "hidden";
          if (!visible) return;
          const [x, y] = pointAt(run.route, d);
          square.setAttribute("x", (x - 1.8).toFixed(1));
          square.setAttribute("y", (y - 1.8).toFixed(1));
        });
        run.route.stops.forEach((stop) => {
          if (before < stop.at && run.at >= stop.at) {
            const chip = chips.get(stop.chip);
            if (chip) pings.set(chip, now + PING_MS);
          }
        });
      });
      pings.forEach((until, chip) => {
        const on = now < until;
        chip.classList.toggle("is-ping", on);
        if (!on) pings.delete(chip);
      });
    };

    let running = false;
    const setRunning = (next: boolean) => {
      if (next === running) return;
      running = next;
      if (running) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    };
    const trigger = ScrollTrigger.create({
      trigger: board,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => setRunning(self.isActive),
    });
    setRunning(trigger.isActive);

    return () => {
      setRunning(false);
      trigger.kill();
      pings.forEach((_, chip) => chip.classList.remove("is-ping"));
      cleanup();
    };
  }, []);

  let n = 0;
  return (
    <div className="board" ref={boardRef} data-board>
      <div className="boardPin" data-board-pin>
        {head}
        <div className="boardDock">
          <div className="tuiWin boardScreen" data-board-screen>
            <p className="tuiWinBar" aria-hidden="true">
              <span>STACK / {chipCount}</span>
            </p>
            <div className="boardScreenView">
              <p className="boardLegend">
                {legend.map(([work, label]) => (
                  <span data-work={work} key={work}>
                    <i aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </p>
              <div className="boardStage">
                <div className="boardView">
                  <div
                    className="boardPlane"
                    data-board-plane
                    style={{ "--cols": COLS, "--rows": ROWS } as CSSProperties}
                  >
                    <i className="boardEdge boardEdgeFront" aria-hidden="true" />
                    <i className="boardEdge boardEdgeRight" aria-hidden="true" />
                    <svg className="boardTraces" viewBox={`0 0 ${COLS * UNIT} ${ROWS * UNIT}`} aria-hidden="true">
                      {traces.map((trace) => (
                        <path
                          key={trace.id}
                          className="boardTrace"
                          d={tracePath(trace.points)}
                          data-trace
                          data-from={trace.from}
                          data-to={trace.to}
                        />
                      ))}
                      {traces.flatMap((trace) =>
                        [trace.points[0], trace.points[trace.points.length - 1]].map(([x, y], end) => (
                          <rect
                            key={`${trace.id}-${end}`}
                            className="boardVia"
                            x={x - 1.6}
                            y={y - 1.6}
                            width={3.2}
                            height={3.2}
                          />
                        )),
                      )}
                      {packetRoutes.map((_, index) => (
                        <g className="boardPacket" data-packet key={index}>
                          {Array.from({ length: TRAIL }, (_, k) => (
                            <rect
                              key={k}
                              width={3.6}
                              height={3.6}
                              style={{ visibility: "hidden", opacity: 1 - k * 0.3 }}
                            />
                          ))}
                        </g>
                      ))}
                    </svg>

                    <p className="boardFrame is-work" style={area(frameCells.monitor)} aria-hidden="true">
                      <span>DRILL MONITOR</span>
                    </p>
                    <ul className="boardZones" aria-label="Технологии обеих работ">
                      {stackZones.map((zone) => (
                        <li className="boardZone" data-work={zone.work} key={zone.id}>
                          <p className="boardFrame" style={area(frameCells[zone.id])}>
                            <span>{zone.label}</span>
                          </p>
                          <ul className="boardChips">
                            {zone.chips.map((chip) => {
                              n += 1;
                              return (
                                <li
                                  className="boardChip"
                                  key={chip.label}
                                  data-chip={chip.label}
                                  style={{ ...area({ ...chipCells[chip.label], h: 2 }), "--n": n } as CSSProperties}
                                >
                                  <span className="chipRef" aria-hidden="true">
                                    {ref(n)}
                                  </span>
                                  <span className="chipBody">
                                    <span className="chipPins" aria-hidden="true" />
                                    <span className="chipTop">
                                      <b>{chip.label}</b>
                                    </span>
                                    <span className="chipFront" aria-hidden="true" />
                                    <span className="chipRight" aria-hidden="true" />
                                  </span>
                                  <span className="chipNote" data-chip-note>
                                    {chip.note}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="boardLog" aria-hidden="true">
                  <ol className="boardLogLines">
                    <li className="is-head">&gt; POST · {chipCount} CHIPS</li>
                    {stackZones
                      .flatMap((zone) => zone.chips)
                      .map((chip, index) => (
                        <li key={chip.label} data-log-line>
                          {ref(index + 1)} {`${chip.label} `.padEnd(LOG_WIDTH, ".")} <em>OK</em>
                        </li>
                      ))}
                    <li data-log-ready>
                      &gt; {chipCount}/{chipCount} OK · LINK UP
                      <i className="caret" />
                    </li>
                  </ol>
                  {/* Mouse only: phones list every note under its chip. */}
                  <p className="boardLogNote" data-board-note>
                    &gt; Наведите курсор на микросхему, чтобы узнать, что она делает
                  </p>
                </div>
              </div>
            </div>
            <i className="boardStatic" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
