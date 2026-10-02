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
 * It only draws while on or changing, on screen, and only frames that differ;
 * going off or off screen stops the loop and pauses the recording.
 */

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const LEVELS = 15;
const SATURATION = 0.88;
const DIM = 0.88;
const [CREAM_R, CREAM_G, CREAM_B] = [250 / 250, 249 / 250, 245 / 250];

/** Seconds: a dissolve, and how long each still of a reel holds. */
const DISSOLVE = 0.45;
const HOLD = 1.5;

/* Both run over every pixel of a capture (800 × 500) on the main thread, a
   video frame at a time: rows and columns are walked rather than divided out
   of the index, and the arithmetic is kept as it was so the output is the
   same to the byte. */
function grain(src: Uint8ClampedArray, dst: Uint8ClampedArray, width: number) {
  const height = src.length / 4 / width;
  for (let y = 0, i = 0; y < height; y += 1) {
    const row = (y & 3) << 2;
    for (let x = 0; x < width; x += 1, i += 4) {
      const th = B4[row | (x & 3)];
      const r = src[i] / 255;
      const g = src[i + 1] / 255;
      const b = src[i + 2] / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const vr = (lum + (r - lum) * SATURATION) * DIM * CREAM_R;
      const vg = (lum + (g - lum) * SATURATION) * DIM * CREAM_G;
      const vb = (lum + (b - lum) * SATURATION) * DIM * CREAM_B;
      dst[i] = (Math.floor(Math.min(1, Math.max(0, vr)) * LEVELS + th) / LEVELS) * 255;
      dst[i + 1] = (Math.floor(Math.min(1, Math.max(0, vg)) * LEVELS + th) / LEVELS) * 255;
      dst[i + 2] = (Math.floor(Math.min(1, Math.max(0, vb)) * LEVELS + th) / LEVELS) * 255;
      dst[i + 3] = 255;
    }
  }
}

const words = (px: Uint8ClampedArray) => new Uint32Array(px.buffer, px.byteOffset, px.length >> 2);

/** Shows `b` over `a` where the ordered threshold is under `t` (two-pixel cells).
    Grained buffers are opaque, so a pixel moves as one 32-bit word. */
function dissolve(a: Uint8ClampedArray, b: Uint8ClampedArray, dst: Uint8ClampedArray, width: number, t: number) {
  if (t >= 1) return dst.set(b);
  if (t <= 0) return dst.set(a);
  const [a32, b32, d32] = [words(a), words(b), words(dst)];
  const height = d32.length / width;
  const pick = B4.map((threshold) => threshold < t);
  for (let y = 0, p = 0; y < height; y += 1) {
    const row = ((y >> 1) & 3) << 2;
    for (let x = 0; x < width; x += 1, p += 1) d32[p] = pick[row | ((x >> 1) & 3)] ? b32[p] : a32[p];
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
  let hasFrame = false;
  /* A frame is cropped and scaled by createImageBitmap, off the main thread;
     drawn straight from the <video> the browser reads it back and resamples
     it on the main thread, several times the cost. Its pixels match to a
     unit, which the grain all but erases. A grabbed frame shows on the next
     tick. Without it (or should it fail) the frame is drawn directly. */
  let bitmaps = typeof createImageBitmap === "function";
  let grabbing = false;
  let grabbed = false;
  const showTime = (time: number) => setTag(`▶ ${pad(Math.floor(time / 60))}:${pad(Math.floor(time % 60))}`);
  /** Takes the playing frame into `current`; true when it is there already. */
  const grab = (from: HTMLVideoElement) => {
    const time = from.currentTime;
    const [cx, cy, cw, ch] = live.video!.crop;
    lastTime = time;
    if (!bitmaps) {
      take(() => sctx.drawImage(from, cx, cy, cw, ch, 0, 0, width, height), current);
      hasFrame = true;
      showTime(time);
      return true;
    }
    grabbing = true;
    createImageBitmap(from, cx, cy, cw, ch, { resizeWidth: width, resizeHeight: height, resizeQuality: "low" })
      .then((bitmap) => {
        take(() => sctx.drawImage(bitmap, 0, 0), current);
        bitmap.close();
        hasFrame = grabbed = true;
        showTime(time);
      })
      .catch(() => {
        bitmaps = false;
        lastTime = -1;
      })
      .finally(() => (grabbing = false));
    return false;
  };
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
  /* What the canvas holds now, so a frame that would draw the same is skipped. */
  let shown: { feed: Uint8ClampedArray | null; still: Uint8ClampedArray | null; level: number } = { feed: null, still: null, level: -1 };
  /* Off screen it neither draws nor plays; it picks up where it was on the way back. */
  let visible = true;
  const resume = () => {
    if (visible && (on || level > 0) && !raf) raf = requestAnimationFrame(frame);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      if (on) void video?.play().catch(() => undefined);
      resume();
      return;
    }
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    video?.pause();
  });
  observer.observe(canvas);

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
    // `current` was written this frame (a new video frame, a cut dissolving).
    let fresh = false;
    if (video) {
      if (grabbed) {
        grabbed = false;
        fresh = true;
      }
      if (!grabbing && video.readyState >= 2 && video.currentTime !== lastTime && grab(video)) fresh = true;
      feed = hasFrame ? current : null;
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
        fresh = true;
      } else feed = target;
      setTag(`▶ ${pad(index + 1)}/${pad(frames.length)}`);
    }

    if ((feed || still) && (fresh || feed !== shown.feed || still !== shown.still || level !== shown.level)) {
      if (feed && still) dissolve(still, feed, out.data, width, level);
      else if (feed) out.data.set(feed);
      ctx.putImageData(out, 0, 0);
      shown = { feed, still, level };
    }

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
      const recording = ensureVideo();
      if (visible) void recording?.play().catch(() => undefined);
      resume();
    },
    stop() {
      on = false;
    },
    dispose() {
      observer.disconnect();
      cancelAnimationFrame(raf);
      video?.pause();
      video?.removeAttribute("src");
      video?.load();
    },
  };
}
