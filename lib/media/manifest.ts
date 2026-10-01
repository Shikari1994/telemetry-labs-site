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
  /** Pixel art: render with nearest-neighbour scaling. */
  readonly pixelated?: boolean;
  /**
   * What the slot plays when a section switches it on (AlphaVideo `live`,
   * lib/media/live.ts): a recording of the work, cropped to the screen it
   * shows (source px: x, y, width, height), or a reel of its captures.
   */
  readonly live?: {
    readonly video?: MediaSource & { readonly crop: readonly [number, number, number, number] };
    readonly reel?: readonly string[];
  };
};

/**
 * Stills are generated pixel art (scripts/generate-pixel-art.py): drawn at a
 * small native size with ordered dithering, then upscaled nearest-neighbour.
 * `pixelated` tells AlphaVideo to keep every art pixel a hard square.
 */
const still = <Id extends string>(
  id: Id,
  section: string,
  width: number,
  height: number,
  alt?: string,
): MediaAsset & { id: Id; pixelated: true } => ({
  id,
  section,
  width,
  height,
  poster: `/media/posters/${id}.png`,
  sources: [],
  decorative: !alt,
  alt,
  pixelated: true,
});

/**
 * Captures of the works with a light bitmap grain (scripts/dither-screens.py),
 * at the size they are drawn on a 2x screen. They scale smoothly —
 * nearest-neighbour downscaling would drop strokes and make the text
 * unreadable.
 */
const capture = <Id extends string>(id: Id, section: string, alt: string): MediaAsset & { id: Id } => ({
  ...still(id, section, 800, 500, alt),
  pixelated: false,
});


const gtnHeroStill = capture("gtn-hero", "case-site", "geo-tn.com, первый экран: логотип и два входа — Drill Monitor и GT-Navigator");
const gtnGlobe = capture("gtn-globe", "case-site", "geo-tn.com: глобус из точек под заголовком раздела о компании");
const gtnAtlas = capture("gtn-atlas", "case-site", "geo-tn.com: атлас с городами, фактами и списком услуг вокруг глобуса");
const gtnVideo = capture("gtn-video", "case-site", "geo-tn.com: заголовок раздела Drill Monitor над видеофоном со стендом");
const gtnCatalog = capture("gtn-catalog", "case-site", "geo-tn.com: каталог продукции, строки с изделиями и кнопками «Подробнее»");
const gtnMobile = capture("gtn-mobile", "case-site", "geo-tn.com: раздел мобильной версии с тремя телефонами");
const dmDrillingStill = capture("dm-drilling", "screens", "Drill Monitor, экран бурения: KPI-плитки, toolface и блок SCC-коррекции");
const dmSurvey = capture("dm-survey", "screens", "Drill Monitor, инклинометрия: таблица замеров и 3D-траектория ствола");
const dmLogging = capture("dm-logging", "screens", "Drill Monitor, каротажный планшет: настройки шкал и кривые по глубине");
const dmFleet = capture("dm-fleet", "screens", "Drill Monitor, парк оборудования: категории, модули и карточка паспорта");
const dmMobile = capture("dm-mobile", "screens", "Drill Monitor для Android: парк, мониторинг и КНБК на трёх телефонах");

/*
 * The hero room's posters come alive under the cursor. geo-tn.com runs through
 * its own captures; Drill Monitor plays the screen recording of its drilling
 * module from the geo-tn.com build (video/module-drilling.mp4), cropped to the
 * top of the app's window.
 */
const gtnHero = {
  ...gtnHeroStill,
  live: { reel: [gtnHeroStill, gtnGlobe, gtnAtlas, gtnVideo, gtnCatalog, gtnMobile].map((asset) => asset.poster) },
};
const dmDrilling = {
  ...dmDrillingStill,
  live: {
    video: {
      type: "video/mp4",
      src: "/media/video/dm-drilling.mp4",
      bytes: 889_656,
      crop: [716, 24, 1112, 695] as const,
    },
  },
};

/** Footer: static halftone fallback under the realtime dot field. */
const footerScene = still("footer-signal", "footer", 1400, 900);

export const mediaAssets = {
  [gtnHero.id]: gtnHero,
  [gtnGlobe.id]: gtnGlobe,
  [gtnAtlas.id]: gtnAtlas,
  [gtnVideo.id]: gtnVideo,
  [gtnCatalog.id]: gtnCatalog,
  [gtnMobile.id]: gtnMobile,
  [dmDrilling.id]: dmDrilling,
  [dmSurvey.id]: dmSurvey,
  [dmLogging.id]: dmLogging,
  [dmFleet.id]: dmFleet,
  [dmMobile.id]: dmMobile,
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
