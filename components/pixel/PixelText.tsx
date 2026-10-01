/**
 * Bitmap wordmark: text set in a 5x7 dot-matrix face and emitted as one SVG
 * rect per lit pixel. Being real elements, the pixels can be choreographed
 * individually (built in random order, scattered on scroll) while the SVG
 * scales crisply to any width. Unlit cells are drawn as faint dots so the line
 * reads as a display matrix rather than floating squares.
 *
 * Only the glyphs the page needs are defined. The component is decorative:
 * callers keep the real text in the accessible heading.
 */

const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  Б: ["#####", "#....", "#....", "####.", "#...#", "#...#", "####."],
  В: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  Г: ["#####", "#....", "#....", "#....", "#....", "#....", "#...."],
  Д: [".###.", ".#.#.", ".#.#.", ".#.#.", ".#.#.", "#####", "#...#"],
  И: ["#...#", "#...#", "#..##", "#.#.#", "##..#", "#...#", "#...#"],
  Л: ["..###", ".#..#", ".#..#", ".#..#", ".#..#", ".#..#", "##..#"],
  П: ["#####", "#...#", "#...#", "#...#", "#...#", "#...#", "#...#"],
  У: ["#...#", "#...#", "#...#", ".####", "....#", "....#", "####."],
  Ф: [".###.", "#.#.#", "#.#.#", "#.#.#", ".###.", "..#..", "..#.."],
  Ь: ["#....", "#....", "#....", "####.", "#...#", "#...#", "####."],
  ".": [".", ".", ".", ".", ".", ".", "#"],
  " ": ["...", "...", "...", "...", "...", "...", "..."],
};
// Cyrillic letters that share a shape with Latin ones.
Object.assign(GLYPHS, { А: GLYPHS.A, С: GLYPHS.C, Е: GLYPHS.E, Н: GLYPHS.H, К: GLYPHS.K, М: GLYPHS.M, О: GLYPHS.O, Р: GLYPHS.P, Т: GLYPHS.T });

const ROWS = 7;

type Cell = { x: number; y: number; on: boolean };

function layout(text: string) {
  const cells: Cell[] = [];
  let cursor = 0;
  [...text.toUpperCase()].forEach((char, index, all) => {
    const glyph = GLYPHS[char] ?? GLYPHS[" "];
    const width = glyph[0].length;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < width; x += 1) {
        cells.push({ x: cursor + x, y, on: glyph[y][x] === "#" });
      }
    }
    cursor += width + (index < all.length - 1 ? 1 : 0);
  });
  return { cells, cols: cursor };
}

type Props = {
  text: string;
  className?: string;
  /** Dot-matrix background for unlit cells. */
  grid?: boolean;
};

export function PixelText({ text, className, grid = true }: Props) {
  const { cells, cols } = layout(text);
  const gap = 0.1;
  return (
    <svg
      className={`pixelText${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${cols} ${ROWS}`}
      preserveAspectRatio="xMinYMid meet"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {grid ? (
        <g className="pixelTextGrid">
          {cells
            .filter((cell) => !cell.on)
            .map((cell) => (
              <rect key={`g${cell.x}-${cell.y}`} x={cell.x + 0.4} y={cell.y + 0.4} width={0.2} height={0.2} />
            ))}
        </g>
      ) : null}
      <g className="pixelTextOn">
        {cells
          .filter((cell) => cell.on)
          .map((cell) => (
            <rect
              key={`p${cell.x}-${cell.y}`}
              data-px
              x={cell.x + gap / 2}
              y={cell.y + gap / 2}
              width={1 - gap}
              height={1 - gap}
            />
          ))}
      </g>
    </svg>
  );
}
