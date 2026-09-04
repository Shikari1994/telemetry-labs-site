"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";

/**
 * Route-transition cover (blueprint §17).
 *
 * Reuses the preloader's column-wipe language in a shortened form, so internal
 * navigation reads as the same visual system rather than a second idiom.
 *
 * Contract points that matter:
 *   - navigation starts at a minimal cover threshold, not after the full
 *     decorative cycle, so the wipe never delays the route
 *   - browser back/forward is left alone (no cover), matching §17 rule 6
 *   - reduced motion performs a plain navigation
 */
const COLUMNS = 8;
/** Cover is considered sufficient here; navigation fires at this point. */
const COVER_THRESHOLD_MS = 260;

export function PageTransition() {
  const layerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const animating = useRef(false);

  /* Uncover whenever the committed route changes. */
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const columns = layer.querySelectorAll<HTMLElement>(".pageTransitionColumn");
    if (!animating.current) {
      gsap.set(layer, { autoAlpha: 0 });
      gsap.set(columns, { yPercent: 100 });
      return;
    }
    animating.current = false;
    gsap.to(columns, {
      yPercent: -100,
      duration: 0.42,
      stagger: { each: 0.028, from: "start" },
      ease: "power3.inOut",
      onComplete: () => {
        gsap.set(layer, { autoAlpha: 0 });
        gsap.set(columns, { yPercent: 100 });
      },
    });
  }, [pathname]);

  const navigate = useCallback(
    (href: string) => {
      const layer = layerRef.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!layer || reduced) {
        router.push(href);
        return;
      }

      animating.current = true;
      const columns = layer.querySelectorAll<HTMLElement>(".pageTransitionColumn");
      gsap.set(layer, { autoAlpha: 1 });
      gsap.fromTo(
        columns,
        { yPercent: 100 },
        { yPercent: 0, duration: 0.4, stagger: { each: 0.028, from: "start" }, ease: "power3.inOut" },
      );
      // Route change is not gated on the decorative tail finishing.
      window.setTimeout(() => router.push(href), COVER_THRESHOLD_MS);
    },
    [router],
  );

  /* Intercept same-origin internal links marked for transition. */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download") || anchor.dataset.noTransition === "true") return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // in-page anchors

      event.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  return (
    <div className="pageTransition" ref={layerRef} aria-hidden="true">
      {Array.from({ length: COLUMNS }).map((_, index) => (
        <div className="pageTransitionColumn" key={index} />
      ))}
    </div>
  );
}
