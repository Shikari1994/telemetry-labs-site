"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { jumpTo } from "@/lib/motion/jump";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  /** Id of the element on this page to scroll to. */
  to: string;
  children: ReactNode;
};

/**
 * In-page jump: a real `#anchor` link (works without JS), routed through the
 * shared scroller so Lenis and pinned decks land on the right spot.
 */
export function AnchorLink({ to, children, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      href={`#${to}`}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        jumpTo(to);
      }}
    >
      {children}
    </a>
  );
}
