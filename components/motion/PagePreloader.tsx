"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { PixelMark } from "@/components/pixel/PixelMark";
import { owner } from "@/data/home";
import { paintBar } from "@/lib/ascii";

/** Session flag: the boot screen has played (the mascot intro then runs faster). */
export const PRELOADER_KEY = "telemetry-boot-seen-v10";
const BAR_LENGTH = 32;
const COVER_COLS = 16;
const COVER_ROWS = 10;
type ReadyWindow = Window & { __telemetryReady?: boolean };

const bootLines = [
  ["mount works index", "OK"],
  ["work 01   geo-tn.com", "OK"],
  ["work 02   drill monitor", "OK"],
  ["slot 03   empty", "WAIT"],
  ["slot 04   empty", "WAIT"],
  ["mascot", "READY"],
];

/**
 * Boot screen: the page status reads as a terminal load. Log lines resolve in
 * sequence while a text bar fills, then the screen breaks into pixel cells that
 * drop out in random order to uncover the page. Plays once per session; any
 * key or click skips to the uncover.
 */
export function PagePreloader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useLayoutEffect(() => {
    const readyWindow = window as ReadyWindow;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(PRELOADER_KEY) === "1";
    } catch {
      // Storage can be blocked; playing the boot again is the safe fallback.
    }

    const notifyReady = () => {
      readyWindow.__telemetryReady = true;
      window.dispatchEvent(new Event("telemetry:ready"));
    };

    const root = rootRef.current;
    if (reduced || seen || !root) {
      setActive(false);
      requestAnimationFrame(notifyReady);
      return;
    }

    document.body.classList.add("is-preloading");
    const lines = root.querySelectorAll<HTMLElement>("[data-boot-line]");
    const statuses = root.querySelectorAll<HTMLElement>("[data-boot-status]");
    const content = root.querySelector<HTMLElement>(".bootContent");
    const cells = root.querySelectorAll<HTMLElement>(".bootCover i");
    const bar = root.querySelector<HTMLElement>("[data-boot-bar]");
    const load = { value: 0 };

    gsap.set(lines, { autoAlpha: 0 });
    gsap.set(statuses, { autoAlpha: 0 });

    let released = false;
    const finish = () => {
      document.body.classList.remove("is-preloading");
      try {
        window.sessionStorage.setItem(PRELOADER_KEY, "1");
      } catch {
        // ignore
      }
      setActive(false);
    };

    const uncover = () => {
      if (released) return;
      released = true;
      tl.kill();
      notifyReady();
      gsap
        .timeline({ onComplete: finish })
        .to(content, { autoAlpha: 0, duration: 0.18, ease: "steps(3)" })
        .to(
          cells,
          { autoAlpha: 0, duration: 0.01, stagger: { each: 0.0045, from: "random" } },
          0.08,
        );
    };

    const tl = gsap.timeline({ onComplete: uncover });
    tl.to(
      load,
      {
        value: 1,
        duration: 1.9,
        ease: "steps(32)",
        onUpdate: () => {
          if (bar) paintBar(bar, load.value, BAR_LENGTH);
        },
      },
      0.15,
    );
    lines.forEach((line, index) => {
      const at = 0.12 + index * 0.3;
      tl.to(line, { autoAlpha: 1, duration: 0.01 }, at).to(statuses[index], { autoAlpha: 1, duration: 0.01 }, at + 0.2);
    });
    tl.to({}, { duration: 0.25 });

    const skip = () => uncover();
    window.addEventListener("keydown", skip, { once: true });
    root.addEventListener("pointerdown", skip, { once: true });

    return () => {
      tl.kill();
      window.removeEventListener("keydown", skip);
      root.removeEventListener("pointerdown", skip);
      document.body.classList.remove("is-preloading");
    };
  }, []);

  if (!active) return null;

  return (
    <div className="boot" ref={rootRef} aria-hidden="true">
      <div className="bootCover">
        {Array.from({ length: COVER_COLS * COVER_ROWS }).map((_, index) => (
          <i key={index} />
        ))}
      </div>

      <div className="bootContent">
        <div className="bootHead">
          <PixelMark cell={6} />
          <p>
            {owner.name} <span>/ boot</span>
          </p>
        </div>

        <ol className="bootLog">
          {bootLines.map(([label, status]) => (
            <li key={label} data-boot-line>
              <span className="bootPrompt">&gt;</span>
              <span className="bootLabel">{label}</span>
              <span className="bootDots" />
              <b data-boot-status className={status === "WAIT" ? "is-wait" : undefined}>
                {status}
              </b>
            </li>
          ))}
        </ol>

        <p className="bootBar" data-boot-bar>
          <span data-bar-fill />
          <span data-bar-rest>{"░".repeat(BAR_LENGTH)}</span>
          <span className="bootPct" data-bar-pct>
            00%
          </span>
        </p>
        <p className="bootHint">
          LOADING АЛЬФА КОД <span className="caret" /> <span className="bootSkip">PRESS ANY KEY TO SKIP</span>
        </p>
      </div>
    </div>
  );
}
