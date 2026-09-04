/**
 * Media asset manifest — blueprint §11.2.
 *
 * Single source of truth mapping a logical media id to its codec variants,
 * intrinsic dimensions, poster and byte size. Sections reference assets by id
 * only; they never hardcode paths. This keeps the 3D/alpha-video pipeline a
 * data concern instead of a layout concern, so replacing a placeholder poster
 * with the final render never touches section markup or scroll choreography.
 *
 * `sources` empty  -> poster-only slot (current state, before 3D delivery).
 * `sources` filled -> AlphaVideo attaches the video on intersection.
 */

export type MediaSource = {
  /** MIME type incl. codecs, e.g. 'video/webm; codecs="vp9"'. */
  readonly type: string;
  readonly src: string;
  /** Transfer size in bytes; budget check in §14 asserts <= 2 MB. */
  readonly bytes: number;
};

export type MediaAsset = {
  readonly id: string;
  /** Which homepage section owns this slot. */
  readonly section: string;
  readonly width: number;
  readonly height: number;
  /** Still frame. Always present so a slot never collapses. */
  readonly poster: string;
  /** Ordered by preference; the browser picks the first it can decode. */
  readonly sources: readonly MediaSource[];
  /** Decorative media stays out of the accessibility tree (§16). */
  readonly decorative: boolean;
  /** Text equivalent, required when `decorative` is false. */
  readonly alt?: string;
};

/** Hero: the central telemetry probe. Highest priority media on the page. */
const heroProbe: MediaAsset = {
  id: "hero-probe",
  section: "hero",
  width: 1200,
  height: 1500,
  poster: "/media/posters/hero-probe.svg",
  sources: [],
  decorative: true,
};

/** Final CTA: cursor-reactive signal-path scene (§6 row 14). */
const footerScene: MediaAsset = {
  id: "footer-signal",
  section: "footer",
  width: 1400,
  height: 900,
  poster: "/media/posters/footer-signal.svg",
  sources: [],
  decorative: true,
};

export const mediaAssets = {
  [heroProbe.id]: heroProbe,
  [footerScene.id]: footerScene,
} as const satisfies Record<string, MediaAsset>;

export type MediaAssetId = keyof typeof mediaAssets;

export function getMediaAsset(id: MediaAssetId): MediaAsset {
  return mediaAssets[id];
}

/** §14 budget: a single alpha video should stay at or below 2 MB. */
export const SINGLE_VIDEO_BYTE_BUDGET = 2 * 1024 * 1024;

/** Assets breaching the transfer budget, for the CI asset-size check (§14). */
export function findOversizedAssets(): { id: string; type: string; bytes: number }[] {
  return Object.values(mediaAssets).flatMap((asset) =>
    asset.sources
      .filter((source) => source.bytes > SINGLE_VIDEO_BYTE_BUDGET)
      .map((source) => ({ id: asset.id, type: source.type, bytes: source.bytes })),
  );
}
