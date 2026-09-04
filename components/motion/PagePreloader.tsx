"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

const PRELOADER_KEY = "telemetry-preloader-seen-v8";
type ReadyWindow = Window & { __telemetryReady?: boolean };

export function PagePreloader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useLayoutEffect(() => {
    const readyWindow = window as ReadyWindow;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = window.sessionStorage.getItem(PRELOADER_KEY) === "1";

    const notifyReady = () => {
      readyWindow.__telemetryReady = true;
      window.dispatchEvent(new Event("telemetry:ready"));
    };

    if (reduced || seen || !rootRef.current) {
      setActive(false);
      requestAnimationFrame(notifyReady);
      return;
    }

    document.body.classList.add("is-preloading");
    const root = rootRef.current;
    const columns = Array.from(root.querySelectorAll<HTMLElement>(".preloaderColumn"));
    const pixels = Array.from(root.querySelectorAll<HTMLElement>(".preloaderPixel"));
    const labels = root.querySelectorAll<HTMLElement>(".preloaderLabel");
    const status = root.querySelectorAll<HTMLElement>(".preloaderStatus span");
    const marquee = root.querySelector<HTMLElement>(".preloaderMarqueeTrack");
    const count = { value: 0 };

    gsap.set(labels, { autoAlpha: 0, y: 7 });
    gsap.set(status, { autoAlpha: 0.28 });
    gsap.set(pixels, { autoAlpha: 0, scale: 0.86 });
    gsap.set(columns, { yPercent: 0 });
    if (marquee) gsap.set(marquee, { xPercent: 0 });

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        document.body.classList.remove("is-preloading");
        window.sessionStorage.setItem(PRELOADER_KEY, "1");
        notifyReady();
        setActive(false);
      },
    });

    tl.to(labels, { autoAlpha: 1, y: 0, duration: 0.34, stagger: 0.035 }, 0)
      .to(
        count,
        {
          value: 100,
          duration: 1.18,
          ease: "power2.inOut",
          onUpdate: () => {
            if (!counterRef.current) return;
            counterRef.current.textContent = String(Math.round(count.value)).padStart(3, "0");
          },
        },
        0.12,
      )
      .to(status[0], { autoAlpha: 1, duration: 0.12 }, 0.28)
      .to(status[1], { autoAlpha: 1, duration: 0.12 }, 0.48)
      .to(status[2], { autoAlpha: 1, duration: 0.12 }, 0.72)
      .to(status[3], { autoAlpha: 1, duration: 0.12 }, 0.96)
      .to(
        pixels,
        {
          autoAlpha: 1,
          scale: 1,
          duration: 0.18,
          stagger: { each: 0.008, from: "center", grid: [7, 8] },
          ease: "steps(2)",
        },
        0.86,
      )
      .to(
        pixels,
        {
          autoAlpha: 0,
          scale: 0.35,
          duration: 0.22,
          stagger: { each: 0.006, from: "edges", grid: [7, 8] },
          ease: "power2.in",
        },
        1.18,
      )
      .to(
        columns,
        {
          yPercent: (index) => (index % 2 === 0 ? -104 : 104),
          duration: 0.86,
          stagger: { each: 0.038, from: "center" },
          ease: "power4.inOut",
        },
        1.28,
      )
      .to(marquee, { xPercent: -10, duration: 0.92, ease: "power2.out" }, 1.28)
      .to(labels, { autoAlpha: 0, duration: 0.16 }, 1.46)
      .to(root, { autoAlpha: 0, duration: 0.14 }, 2.0);

    return () => {
      tl.kill();
      document.body.classList.remove("is-preloading");
    };
  }, []);

  if (!active) return null;

  return (
    <div className="preloader" ref={rootRef} aria-hidden="true">
      <div className="preloaderColumns">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="preloaderColumn" key={index} />
        ))}
      </div>

      <div className="preloaderPixels">
        {Array.from({ length: 56 }).map((_, index) => (
          <i className="preloaderPixel" key={index} />
        ))}
      </div>

      <div className="preloaderTop preloaderLabel">
        <span>TS / LAB</span>
        <span>DOWNHOLE TELEMETRY</span>
        <span>INITIALIZING SIGNAL PATH</span>
      </div>

      <div className="preloaderCounter" ref={counterRef}>000</div>

      <div className="preloaderStatus preloaderLabel">
        <span>ORIENTATION / READY</span>
        <span>FORMATION / READY</span>
        <span>TELEMETRY / READY</span>
        <span>SURFACE / READY</span>
      </div>

      <div className="preloaderMarquee preloaderLabel">
        <div className="preloaderMarqueeTrack">
          <span>MEASURE / ENCODE / TRANSMIT / DECODE / VISUALIZE / </span>
          <span>MEASURE / ENCODE / TRANSMIT / DECODE / VISUALIZE / </span>
        </div>
      </div>
    </div>
  );
}
