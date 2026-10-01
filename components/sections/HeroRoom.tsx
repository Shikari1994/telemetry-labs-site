"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlphaVideo } from "@/components/media/AlphaVideo";
import { AnchorLink } from "@/components/layout/AnchorLink";
import { PixelMark } from "@/components/pixel/PixelMark";
import { works, type Work } from "@/data/home";
import { paintRoomCanvas, type PaintKind } from "@/lib/room/paint";

/**
 * The hero object: a white room built as an isometric diorama from CSS 3D
 * planes — floor, two walls with their cut caps, the floor slab — with one
 * poster per work on the walls and the charging pad in the middle, where the
 * mascot (components/mascot) lands after its opening shot.
 *
 * The room is kept sparse so the posters and the robot carry it: one CSS 3D
 * box, a server rack in the right corner whose lights blink, and a pendant
 * lamp over the pad.
 *
 * Planes are canvases painted in bitmap style at their own size
 * (lib/room/paint.ts). The camera follows the pointer by a few degrees; that
 * is a CSS variable written once per animation frame, never React state.
 */

/**
 * A poster comes alive while the cursor is on it or it has focus (on touch
 * screens, while the room is in view): its art plays the work moving.
 */
function Poster({ work, inView }: { work: Work; inView: boolean }) {
  const [near, setNear] = useState(false);
  return (
    <AnchorLink
      className="roomPoster"
      to={work.caseId}
      data-room-poster
      aria-label={`${work.title} — к кейсу`}
      onPointerEnter={(event) => event.pointerType === "mouse" && setNear(true)}
      onPointerLeave={() => setNear(false)}
      onFocus={() => setNear(true)}
      onBlur={() => setNear(false)}
    >
      <span className="roomPosterTop">
        <b>{work.index}</b>
        <span>{work.kicker}</span>
      </span>
      <span className="roomPosterArt">
        <AlphaVideo id={work.media} live={near || inView} />
      </span>
      <span className="roomPosterTitle">{work.title}</span>
      <span className="roomPosterFoot">
        <span>{work.tags.slice(0, 3).join(" / ")}</span>
        <i aria-hidden="true">↘</i>
      </span>
    </AnchorLink>
  );
}

type PaintProps = {
  kind: PaintKind;
  className?: string;
  /** Box faces: palette and base tone. */
  pal?: "light" | "floor" | "steel";
  tone?: number;
  /** Hook the mascot reads the pad by. */
  "data-room-pad"?: true;
};

const Paint = ({ kind, className = "roomPaint", pal, tone, ...hooks }: PaintProps) => (
  <canvas
    className={className}
    data-paint={kind}
    data-pal={pal}
    data-tone={tone}
    aria-hidden="true"
    {...hooks}
  />
);

type Face = { pal: "light" | "floor" | "steel"; tone: number; kind?: PaintKind; art?: ReactNode };

/**
 * A box standing in the room. Its size and position are CSS variables (in
 * floor lengths) on `className`; only the three faces the camera can see are
 * built: the top, the face toward the front (+z) and the face toward the
 * right (+x).
 */
function Box({ className, top, front, right }: { className: string; top: Face; front: Face; right: Face }) {
  const face = (name: string, f: Face) => (
    <div className={`roomBoxFace ${name}`}>
      <Paint kind={f.kind ?? "face"} pal={f.pal} tone={f.tone} />
      {f.art}
    </div>
  );
  return (
    <div className={`roomBox ${className}`} aria-hidden="true">
      {face("roomBoxTop", top)}
      {face("roomBoxFront", front)}
      {face("roomBoxRight", right)}
    </div>
  );
}

const RACK_LEDS = 7;

export function HeroRoom() {
  const stageRef = useRef<HTMLDivElement>(null);
  /* Touch screens have no hover: there the posters play while the room is in view. */
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !window.matchMedia("(pointer: coarse)").matches) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const canvases = Array.from(stage.querySelectorAll<HTMLCanvasElement>("[data-paint]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Paint now and whenever the stage changes size. */
    let paintFrame = 0;
    const paint = () => {
      cancelAnimationFrame(paintFrame);
      paintFrame = requestAnimationFrame(() =>
        canvases.forEach((canvas) => paintRoomCanvas(canvas, canvas.dataset.paint as PaintKind)),
      );
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(stage);

    const stop = () => {
      cancelAnimationFrame(paintFrame);
      observer.disconnect();
    };

    /* Pointer parallax: eased toward the pointer, written as CSS variables. */
    const pivot = stage.querySelector<HTMLElement>("[data-room-pivot]");
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (!pivot || reduced || coarse) return stop;
    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0 };
    let frame = 0;
    const loop = () => {
      now.x += (target.x - now.x) * 0.08;
      now.y += (target.y - now.y) * 0.08;
      pivot.style.setProperty("--px", now.x.toFixed(4));
      pivot.style.setProperty("--py", now.y.toFixed(4));
      frame = Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      stop();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="roomStage" ref={stageRef} data-room>
      <div className="roomPivot" data-room-pivot>
        <div className="roomSlab roomSlabFront" />
        <div className="roomSlab roomSlabSide" />

        <div className="roomFloor">
          <Paint kind="floor" />
          <Paint kind="pool" className="roomLit roomPool" />
          <Paint kind="pad" className="roomPad" data-room-pad />
          <Paint kind="shadow" className="roomShadow" />
          {/* The mascot stands here; its width is the mascot's voxel size. */}
          <span className="roomSpot" data-room-spot />
        </div>

        <div className="roomWall roomWallLeft">
          <Paint kind="wall-left" />
          <Poster work={works[0]} inView={inView} />
        </div>
        <div className="roomWall roomWallBack">
          <Paint kind="wall-back" />
          <Poster work={works[1]} inView={inView} />
        </div>

        <div className="roomCap roomCapBack" />
        <div className="roomCap roomCapLeft" />
        <div className="roomEnd roomEndBack" />
        <div className="roomEnd roomEndLeft" />

        <Box
          className="roomRack"
          top={{ pal: "steel", tone: 0.45 }}
          front={{
            pal: "steel",
            tone: 0.6,
            kind: "rack",
            art: (
              <span className="roomLeds">
                {Array.from({ length: RACK_LEDS }).map((_, index) => (
                  <i key={index} />
                ))}
              </span>
            ),
          }}
          right={{ pal: "steel", tone: 0.75 }}
        />
        <span className="roomSprite roomLamp" aria-hidden="true">
          <span className="roomLampCord" />
          <Paint kind="lamp" className="roomLampShade" />
          <Paint kind="cone" className="roomLit roomCone" />
        </span>

        {/* Without motion the realtime mascot is off; its sprite stands in. */}
        <span className="roomSprite roomStatic">
          <PixelMark cell={6} animated={false} />
        </span>
      </div>
      <span className="roomDark" data-room-dark aria-hidden="true" />
    </div>
  );
}
