import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Cover resolution; the frame's aspect decides how square the cells look. */
  cols?: number;
  rows?: number;
};

/**
 * Media frame with a bitmap cover. The cover is a grid of opaque cells that the
 * motion layer knocks out in random order, so images arrive the way a raster
 * loads rather than by fading. Without the motion layer (no JS, reduced motion)
 * the cover is never shown — see `.pxCover` in globals.css.
 */
export function PixelReveal({ children, className, cols = 12, rows = 8 }: Props) {
  return (
    <div className={`pxFrame${className ? ` ${className}` : ""}`} data-px-frame>
      {children}
      <span
        className="pxCover"
        aria-hidden="true"
        data-px-cover
        style={{ "--px-cols": cols, "--px-rows": rows } as CSSProperties}
      >
        {Array.from({ length: cols * rows }).map((_, index) => (
          <i key={index} />
        ))}
      </span>
      <span className="pxCorner pxCornerA" aria-hidden="true" />
      <span className="pxCorner pxCornerB" aria-hidden="true" />
    </div>
  );
}
