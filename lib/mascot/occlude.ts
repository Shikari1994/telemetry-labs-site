/**
 * What the mascot is behind: convex polygons in viewport px that are cut out
 * of its drawing (lib/mascot/renderer.ts stamps them into the stencil), so it
 * reads as standing behind a card, a screen or a layer of the page.
 *
 * A flat element is its box. A 3D-turned one (the 04 layer stack) carries
 * zero-size corner marks (`data-corner`): the browser projects each through
 * the element's transforms and perspective, and the hull of them is its
 * silhouette.
 */

export type Point = { x: number; y: number };
export type Poly = Point[];

type Box = { left: number; top: number; right: number; bottom: number };

export function boxPoly(box: Box): Poly {
  return [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.right, y: box.bottom },
    { x: box.left, y: box.bottom },
  ];
}

/** Where a zero-size mark lands on screen. */
export function markAt(el: Element): Point {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** Convex hull, monotone chain; clockwise on screen. */
export function hull(points: Point[]): Poly {
  if (points.length < 3) return points.slice();
  const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Point[]) => {
    const out: Point[] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half(sorted.reverse())];
}

/** The element's silhouette: the hull of its corner marks, else its box. */
export function silhouette(el: Element): Poly {
  const marks = el.querySelectorAll("[data-corner]");
  if (marks.length >= 3) return hull(Array.from(marks, markAt));
  return boxPoly(el.getBoundingClientRect());
}

/** A convex polygon cut to a box (Sutherland–Hodgman), for content clipped
    by its window. */
export function clipPoly(poly: Poly, box: Box): Poly {
  const edges: [(p: Point) => boolean, (a: Point, b: Point) => Point][] = [
    [(p) => p.x >= box.left, (a, b) => at(a, b, (box.left - a.x) / (b.x - a.x))],
    [(p) => p.x <= box.right, (a, b) => at(a, b, (box.right - a.x) / (b.x - a.x))],
    [(p) => p.y >= box.top, (a, b) => at(a, b, (box.top - a.y) / (b.y - a.y))],
    [(p) => p.y <= box.bottom, (a, b) => at(a, b, (box.bottom - a.y) / (b.y - a.y))],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const input = out;
    out = [];
    input.forEach((p, i) => {
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(p)) {
        if (!inside(prev)) out.push(cut(prev, p));
        out.push(p);
      } else if (inside(prev)) out.push(cut(prev, p));
    });
    if (!out.length) return out;
  }
  return out;
}

const at = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Polygons as triangle fans in clip space, for the renderer. */
export function toClip(polys: Poly[], width: number, height: number): Float32Array[] {
  return polys
    .filter((poly) => poly.length >= 3)
    .map((poly) => {
      const out = new Float32Array(poly.length * 2);
      poly.forEach((p, i) => {
        out[i * 2] = (p.x / width) * 2 - 1;
        out[i * 2 + 1] = 1 - (p.y / height) * 2;
      });
      return out;
    });
}
