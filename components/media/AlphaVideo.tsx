"use client";

import { useEffect, useRef, useState } from "react";
import { getMediaAsset, type MediaAssetId } from "@/lib/media/manifest";

type Props = {
  id: MediaAssetId;
  className?: string;
  /** Hero-critical media renders its poster immediately (§11.2 rule 1). */
  priority?: boolean;
};

/**
 * Transparent-media host implementing the blueprint §11.2 loading policy.
 *
 * The poster is always painted, so the slot has correct size from first paint
 * and never shifts layout. Video sources attach only when the element nears the
 * viewport, and playback pauses when scrolled far away or when the tab is
 * hidden. A slot with no sources yet (the current pre-3D state) simply stays a
 * poster — sections do not need to know the difference.
 */
export function AlphaVideo({ id, className, priority = false }: Props) {
  const asset = getMediaAsset(id);
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attached, setAttached] = useState(false);

  const hasVideo = asset.sources.length > 0;

  /* Attach sources once the slot approaches the viewport. */
  useEffect(() => {
    if (!hasVideo || attached) return;
    const node = wrapRef.current;
    if (!node) return;

    if (priority) {
      setAttached(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setAttached(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasVideo, attached, priority]);

  /* Pause well outside the viewport and whenever the tab is hidden. */
  useEffect(() => {
    if (!attached) return;
    const video = videoRef.current;
    const node = wrapRef.current;
    if (!video || !node) return;

    let visible = true;
    const sync = () => {
      if (visible && !document.hidden) void video.play().catch(() => undefined);
      else video.pause();
    };
    /* Reveal only once decoding has produced a frame, so the crossfade from the
       poster never flashes empty. */
    const onPlaying = () => video.setAttribute("data-playing", "1");
    video.addEventListener("playing", onPlaying);

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      { rootMargin: "100px 0px" },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      observer.disconnect();
      video.removeEventListener("playing", onPlaying);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [attached]);

  return (
    <div
      className={`alphaMedia${className ? ` ${className}` : ""}`}
      ref={wrapRef}
      /* Reserve the intrinsic ratio up front so nothing reflows (§14). */
      style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
      aria-hidden={asset.decorative ? true : undefined}
    >
      <img
        className="alphaMediaPoster"
        src={asset.poster}
        width={asset.width}
        height={asset.height}
        alt={asset.decorative ? "" : (asset.alt ?? "")}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        draggable={false}
      />

      {attached && hasVideo ? (
        <video
          className="alphaMediaVideo"
          ref={videoRef}
          poster={asset.poster}
          width={asset.width}
          height={asset.height}
          muted
          loop
          playsInline
          preload="none"
        >
          {asset.sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
        </video>
      ) : null}
    </div>
  );
}
