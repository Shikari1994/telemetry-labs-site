"use client";

import { useEffect, useRef } from "react";

/**
 * The brand sprite: the mascot robot — a monitor head with its face on the
 * screen and an antenna, a boxy body with charge cells, mitts, and the
 * thruster ring it floats on. Drawn cell by cell on a canvas so every art
 * pixel stays a hard square at any device pixel ratio.
 *
 * Animation runs at sprite cadence (~8 fps), not display refresh, and stops
 * when the mark is offscreen, the tab is hidden or reduced motion is set.
 */

const SPRITE = [
  "........a....",
  "........g....",
  ".bbbbbbbbbbb.",
  "bqqqqqqqqqqqb",
  "bqqqqqqqqqqqb",
  "bqqqqqqqqqqqb",
  "bqqqqqqqqqqqb",
  "bqqqqqqqqqqqb",
  ".ddddddddddd.",
  "......g......",
  "..sdddddddds.",
  "..sbcbbbgbbs.",
  "..lbcbbbgbbl.",
  "...ddddddd...",
  "....asasa....",
  ".....fff.....",
];

/* Faces, as [column, row] pixels lit on the screen (rows 4..7). */
const FACE = {
  neutral: [[3, 4], [4, 4], [8, 4], [9, 4], [3, 5], [4, 5], [8, 5], [9, 5], [5, 7], [6, 7], [7, 7]],
  blink: [[3, 5], [4, 5], [8, 5], [9, 5], [5, 7], [6, 7], [7, 7]],
  happy: [[3, 4], [9, 4], [2, 5], [4, 5], [8, 5], [10, 5], [4, 6], [8, 6], [5, 7], [6, 7], [7, 7]],
} as const;

const COLORS: Record<string, string> = {
  a: "#f2a65a",
  f: "#f6c98a",
  g: "#5e5d59",
  s: "#87867f",
  l: "#b0aea5",
  q: "#1c2519",
  b: "#e2733f",
  d: "#b4532a",
  c: "#c3e88d",
};

export const PIXEL_MARK_COLS = SPRITE[0].length;
export const PIXEL_MARK_ROWS = SPRITE.length;

type Props = {
  /** Size of one art pixel in CSS px. */
  cell?: number;
  className?: string;
  animated?: boolean;
};

function draw(ctx: CanvasRenderingContext2D, cell: number, tick: number) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // A six-second loop: two blinks, then a happy beat.
  const t = tick % 48;
  const face = t >= 32 && t < 40 ? FACE.happy : t < 2 || (t >= 20 && t < 22) ? FACE.blink : FACE.neutral;
  // The ring spins and the beam flickers every frame.
  const spin = tick % 2 === 1;

  SPRITE.forEach((row, y) => {
    [...row].forEach((key, x) => {
      if (key === ".") return;
      let color = COLORS[key];
      if (key === "a" && y === 14) color = spin ? COLORS.s : COLORS.a;
      if (key === "s" && y === 14) color = spin ? COLORS.a : COLORS.s;
      if (key === "f" && x !== 6 && tick % 3 === 0) return;
      if (key === "c" && y === 12 && tick % 8 >= 6) color = COLORS.g;
      ctx.fillStyle = color;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    });
  });
  ctx.fillStyle = COLORS.c;
  for (const [x, y] of face) ctx.fillRect(x * cell, y * cell, cell, cell);
}

export function PixelMark({ cell = 4, className, animated = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const px = cell * dpr;
    canvas.width = PIXEL_MARK_COLS * px;
    canvas.height = PIXEL_MARK_ROWS * px;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    draw(ctx, px, 2);
    if (!animated || reduced) return;

    let tick = 0;
    let last = 0;
    let frame = 0;
    let visible = true;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < 125) return;
      last = now;
      tick += 1;
      draw(ctx, px, tick);
    };
    frame = requestAnimationFrame(loop);

    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [cell, animated]);

  return (
    <canvas
      ref={canvasRef}
      className={`pixelMark${className ? ` ${className}` : ""}`}
      style={{ width: PIXEL_MARK_COLS * cell, height: PIXEL_MARK_ROWS * cell }}
      aria-hidden="true"
    />
  );
}
