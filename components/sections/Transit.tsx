import { homeTree } from "@/data/home";

/**
 * A stretch of scroll between two sections. It holds no content: while it
 * crosses the viewport, TransitScene moves the camera across a 3D board to
 * the section named by `to`, which also picks how the camera moves
 * (lib/transit STRETCHES) and whose number stands at the way out.
 */
export function Transit({ to }: { to: string }) {
  const node = homeTree.find((item) => item.id === to);
  return <div className="transit" data-transit={node?.index ?? ""} data-transit-to={to} aria-hidden="true" />;
}
