import { homeTree } from "@/data/home";

/** Cells in the seam's load bar. */
const CELLS = 24;

/**
 * A short stretch between two sections in the page's own language: the next
 * section's number, a stepped load bar and its name on one hairline row. The
 * motion layer wipes the row in and fills the bar as it scrolls up to the
 * signal line, so the bar lands just before the bus branch lights and the
 * section head boots. Decorative; without motion it takes no space.
 */
export function Seam({ to }: { to: string }) {
  const node = homeTree.find((item) => item.id === to);
  if (!node) return null;
  return (
    <div className="seam" data-seam aria-hidden="true">
      <div className="seamRow" data-seam-row>
        <span className="seamIdx" data-seam-idx>
          {node.index}
        </span>
        <span className="seamBar">
          {Array.from({ length: CELLS }, (_, index) => (
            <i key={index} />
          ))}
        </span>
        <span className="seamName">{node.label}</span>
      </div>
    </div>
  );
}
