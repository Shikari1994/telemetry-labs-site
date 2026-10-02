import type { MediaAsset } from "@/lib/media/manifest";

/*
 * A poster that comes alive (MediaAsset.live): while it is on, a canvas over
 * the still plays the work moving, a recording or a reel of its captures,
 * through the same light grain the captures were given offline
 * (scripts/dither-screens.py): a little desaturated, whites rolled toward the
 * page's cream, 16 levels a channel on a 4×4 Bayer. Coming on and going off,
 * and each cut of a reel, is an ordered dissolve in two-pixel cells, so it
 * reads as the page's bitmap stepping rather than a fade.
 *
 * It only draws while on or changing; going off stops the loop and pauses the
 * recording.
 */

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const LEVELS = 15;
const SATURATION = 0.88;
const DIM = 0.88;
const CREAM = [250 / 250, 249 / 250, 245 / 250];

/** Seconds: a dissolve, and how long each still of a reel holds. */
const DISSOLVE = 0.45;
const HOLD = 1.5;

function grain(src: Uint8ClampedArray, dst: Uint8ClampedArray, width: number) {
  for (let i = 0, p = 0; i < src.length; i += 4, p += 1) {
    const x = p % width;
    const y = (p - x) / width;
    const th = B4[((y & 3) << 2) | (x & 3)];
    const r = src[i] / 255;
    const g = src[i + 1] / 255;
    const b = src[i + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    for (let c = 0; c < 3; c += 1) {
      const v = (lum + ((c === 0 ? r : c === 1 ? g : b) - lum) * SATURATION) * DIM * CREAM[c];
      dst[i + c] = (Math.floor(Math.min(1, Math.max(0, v)) * LEVELS + th) / LEVELS) * 255;
    }
    dst[i + 3] = 255;
  }
}

/** Shows `b` over `a` where the ordered threshold is under `t` (two-pixel cells). */
function dissolve(a: Uint8ClampedArray, b: Uint8ClampedArray, dst: Uint8ClampedArray, width: number, t: number) {
  if (t >= 1) return dst.set(b);
  if (t <= 0) return dst.set(a);
  for (let i = 0, p = 0; i < dst.length; i += 4, p += 1) {
    const x = p % width;
    const y = (p - x) / width;
    const from = B4[(((y >> 1) & 3) << 2) | ((x >> 1) & 3)] < t ? b : a;
    dst[i] = from[i];
    dst[i + 1] = from[i + 1];
    dst[i + 2] = from[i + 2];
    dst[i + 3] = 255;
  }
}

export type LiveFeed = { start: () => void; stop: () => void; dispose: () => void };

/**
 * `canvas` sits over the still; `tag` gets the reel position or the
 * recording's time; `url` resolves a manifest path (the base path).
 */
export function createLiveFeed(
  canvas: HTMLCanvasElement,
  tag: HTMLElement | null,
  asset: MediaAsset,
  reel: readonly string[],
  url: (path: string) => string,
): LiveFeed | null {
  const live = asset.live;
  const ctx = canvas.getContext("2d");
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!live || !ctx || !sctx) return null;

  // At the captures' own size, like the still under it, so going live never
  // costs detail; the browser scales it down to the slot as it does the still.
  const width = asset.width;
  const height = Math.round((width * asset.height) / asset.width);
  canvas.width = scratch.width = width;
  canvas.height = scratch.height = height;
  const out = ctx.createImageData(width, height);
  const size = width * height * 4;

  /* Grain a drawn source into a buffer. */
  const take = (draw: () => void, into: Uint8ClampedArray) => {
    sctx.clearRect(0, 0, width, height);
    draw();
    grain(sctx.getImageData(0, 0, width, height).data, into, width);
    return into;
  };
  const load = (src: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  /* What it dissolves from and back to: the still itself. */
  let still: Uint8ClampedArray | null = null;
  void load(url(asset.poster)).then((img) => {
    if (img) still = take(() => sctx.drawImage(img, 0, 0, width, height), new Uint8ClampedArray(size));
  });

  /* A reel: every capture grained once, then cut between. */
  const frames: (Uint8ClampedArray | null)[] = reel.map(() => null);
  reel.forEach((src, index) =>
    void load(url(src)).then((img) => {
      if (img) frames[index] = take(() => sctx.drawImage(img, 0, 0, width, height), new Uint8ClampedArray(size));
    }),
  );

  /* A recording: grained frame by frame while it plays, cropped to the screen it shows. */
  let video: HTMLVideoElement | null = null;
  const current = new Uint8ClampedArray(size);
  let lastTime = -1;
  const ensureVideo = () => {
    if (video || !live.video) return video;
    video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url(live.video.src);
    return video;
  };

  let on = false;
  let level = 0; // 0 still … 1 live
  let index = 0;
  let cut = 1; // dissolve to frame `index`, 0..1
  let held = 0;
  let prev: Uint8ClampedArray | null = null;
  let raf = 0;
  let last = 0;
  let shownTag = "";

  const setTag = (text: string) => {
    if (!tag || text === shownTag) return;
    shownTag = text;
    tag.textContent = text;
  };
  const pad = (n: number) => String(n).padStart(2, "0");

  const frame = (now: number) => {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    level = Math.min(1, Math.max(0, level + (on ? dt : -dt) / DISSOLVE));

    let feed: Uint8ClampedArray | null = null;
    if (video) {
      if (video.readyState >= 2 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const [cx, cy, cw, ch] = live.video!.crop;
        take(() => sctx.drawImage(video!, cx, cy, cw, ch, 0, 0, width, height), current);
        setTag(`▶ ${pad(Math.floor(lastTime / 60))}:${pad(Math.floor(lastTime % 60))}`);
      }
      feed = lastTime >= 0 ? current : null;
    } else if (frames.length) {
      held += dt;
      if (on && cut >= 1 && held > HOLD) {
        const next = (index + 1) % frames.length;
        if (frames[next]) {
          prev = frames[index];
          index = next;
          cut = 0;
          held = 0;
        }
      }
      cut = Math.min(1, cut + dt / DISSOLVE);
      const target = frames[index];
      if (target && prev && cut < 1) {
        dissolve(prev, target, current, width, cut);
        feed = current;
      } else feed = target;
      setTag(`▶ ${pad(index + 1)}/${pad(frames.length)}`);
    }

    if (feed && still) dissolve(still, feed, out.data, width, level);
    else if (feed) out.data.set(feed);
    if (feed || still) ctx.putImageData(out, 0, 0);

    if (!on && level <= 0) {
      canvas.dataset.live = "off";
      video?.pause();
      raf = 0;
      last = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      // A reel opens on its own still, so it cuts to the next one at once.
      if (!on) held = HOLD;
      on = true;
      canvas.dataset.live = "on";
      void ensureVideo()?.play().catch(() => undefined);
      if (!raf) raf = requestAnimationFrame(frame);
    },
    stop() {
      on = false;
    },
    dispose() {
      cancelAnimationFrame(raf);
      video?.pause();
      video?.removeAttribute("src");
      video?.load();
    },
  };
}
