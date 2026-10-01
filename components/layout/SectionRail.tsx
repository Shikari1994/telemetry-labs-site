"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { homeTree } from "@/data/home";
import { paintBar } from "@/lib/ascii";
import { jumpTo } from "@/lib/motion/jump";

const BAR_LENGTH = 24;
const MINI_BAR_LENGTH = 10;

/**
 * The page's TREE: every section with its sub-topics, a text progress bar and
 * keyboard section jumps. Sub-topics of the section under the focal line
 * expand, and the sub currently in view is marked.
 *
 * Activity is measured from live geometry on scroll, so it stays right inside
 * pinned horizontal decks (their cards move sideways, not down). All updates
 * are direct class/text writes — no React state changes per scroll frame.
 */
export function SectionRail() {
  const railRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const sections = homeTree.map((node) => ({
      node,
      el: document.getElementById(node.id),
      row: rail.querySelector<HTMLElement>(`[data-tree-node="${node.id}"]`),
      subs: node.subs.map((sub) => ({
        el: document.getElementById(sub.id),
        link: rail.querySelector<HTMLElement>(`[data-tree-sub="${sub.id}"]`),
      })),
    }));
    const labelNode = rail.querySelector<HTMLElement>("[data-rail-label]");
    const indexNode = rail.querySelector<HTMLElement>("[data-rail-index]");
    const bars = rail.querySelectorAll<HTMLElement>("[data-rail-bar]");

    let active = -1;
    let activeSub: HTMLElement | null = null;
    let frame = 0;

    const update = () => {
      frame = 0;
      const focalY = window.innerHeight * 0.5;
      const focalX = window.innerWidth * 0.62;

      let next = 0;
      sections.forEach((section, index) => {
        if (section.el && section.el.getBoundingClientRect().top <= focalY) next = index;
      });

      if (next !== active) {
        sections[active]?.row?.classList.remove("is-active");
        sections[next]?.row?.classList.add("is-active");
        active = next;
        const node = sections[next].node;
        if (labelNode) labelNode.textContent = node.label;
        if (indexNode) indexNode.textContent = node.index;
      }

      let sub: HTMLElement | null = null;
      for (const candidate of sections[active].subs) {
        if (!candidate.el) continue;
        const rect = candidate.el.getBoundingClientRect();
        if (rect.top <= focalY && rect.left <= focalX) sub = candidate.link;
      }
      if (sub !== activeSub) {
        activeSub?.classList.remove("is-on");
        sub?.classList.add("is-on");
        activeSub = sub;
      }

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      bars.forEach((bar) => paintBar(bar, progress, Number(bar.dataset.railBar) || BAR_LENGTH));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (document.body.classList.contains("stack-menu-open")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], summary")) return;
      const nextIndex = Math.min(sections.length - 1, Math.max(0, active + (event.key === "ArrowDown" ? 1 : -1)));
      if (nextIndex === active) return;
      event.preventDefault();
      jumpTo(sections[nextIndex].node.id);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("keydown", onKey);
    ScrollTrigger.addEventListener("refresh", schedule);
    update();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("keydown", onKey);
      ScrollTrigger.removeEventListener("refresh", schedule);
    };
  }, []);

  const onLink = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    setOpen(false);
    jumpTo(id);
  };

  return (
    <aside className={`rail${open ? " is-open" : ""}`} ref={railRef} aria-label="Содержание страницы">
      <div className="railInner">
        <p className="railTitle">Портфолио / главная</p>

        <button
          className="railToggle"
          type="button"
          aria-expanded={open}
          aria-controls="rail-tree"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="railCurrent">
            <span className="br">└</span>
            <b data-rail-index>01</b>
            <span data-rail-label>{homeTree[0].label}</span>
          </span>
          <span className="railMiniBar" data-rail-bar={MINI_BAR_LENGTH} aria-hidden="true">
            <span data-bar-fill />
            <span data-bar-rest>{"░".repeat(MINI_BAR_LENGTH)}</span>
          </span>
          <i aria-hidden="true">{open ? "−" : "+"}</i>
        </button>

        <div className="railBody" id="rail-tree">
          <p className="railTh">TREE</p>
          <nav className="tree">
            {homeTree.map((node) => (
              <div className="treeNode" data-tree-node={node.id} key={node.id}>
                <a className="treeLink" href={`#${node.id}`} onClick={(event) => onLink(event, node.id)}>
                  <span className="br">└</span>
                  <span className="treeIdx">{node.index}</span>
                  <span className="treeLabel">{node.label}</span>
                </a>
                {node.subs.length ? (
                  <div className="treeSubs">
                    <div>
                      {node.subs.map((sub, index) => (
                        <a
                          className="treeLink treeSub"
                          href={`#${sub.id}`}
                          key={sub.id}
                          data-tree-sub={sub.id}
                          style={{ "--i": index } as CSSProperties}
                          onClick={(event) => onLink(event, sub.id)}
                        >
                          <span className="br">└</span>
                          <span className="treeLabel">{sub.label}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="railBar" data-rail-bar={BAR_LENGTH} aria-hidden="true">
            <span data-bar-fill />
            <span data-bar-rest>{"░".repeat(BAR_LENGTH)}</span>
            <span className="railPct" data-bar-pct>00%</span>
          </div>
          <p className="railHint">
            PRESS <kbd>↑</kbd> / <kbd>↓</kbd> TO SCROLL
          </p>
        </div>
      </div>
    </aside>
  );
}
