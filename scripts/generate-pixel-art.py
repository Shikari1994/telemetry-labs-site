"""
Pixel-art poster generator for the homepage media slots.

Every image is drawn procedurally at a small native resolution with a limited
warm palette and ordered (Bayer) dithering, then upscaled with nearest-neighbour
so each art pixel stays a crisp square. Output goes to public/media/posters and
is referenced only through lib/media/manifest.ts.

Run:  python scripts/generate-pixel-art.py
Deps: Pillow, numpy
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "media" / "posters"
OUT.mkdir(parents=True, exist_ok=True)

RNG = np.random.default_rng(1994)


def hexrgb(value: str) -> np.ndarray:
    value = value.lstrip("#")
    return np.array([int(value[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)


C = {
    "void": "#0f0f0e",
    "bg": "#141413",
    "panel": "#1e1d1b",
    "d1": "#2a2825",
    "d2": "#3d3a35",
    "g1": "#5e5d59",
    "g2": "#87867f",
    "g3": "#b0aea5",
    "paper": "#e3dacc",
    "ink": "#faf9f5",
    "accent": "#e2733f",
    "deep": "#b4532a",
    "amber": "#f2a65a",
    "sun": "#f6c98a",
    "rust": "#8e4536",
    "plum": "#5a3440",
    "dusk": "#2c2231",
    "night": "#1a1620",
    "cyan": "#89ddff",
    "lime": "#c3e88d",
}
P = {k: hexrgb(v) for k, v in C.items()}

# 8x8 Bayer matrix, normalised to (0, 1).
_B2 = np.array([[0, 2], [3, 1]])
_B4 = np.block([[4 * _B2, 4 * _B2 + 2], [4 * _B2 + 3, 4 * _B2 + 1]])
_B8 = np.block([[4 * _B4, 4 * _B4 + 2], [4 * _B4 + 3, 4 * _B4 + 1]])
BAYER = (_B8 + 0.5) / 64.0


def bayer(h: int, w: int) -> np.ndarray:
    return np.tile(BAYER, (h // 8 + 1, w // 8 + 1))[:h, :w]


def noise(h: int, w: int, cell: int, seed_shift: int = 0) -> np.ndarray:
    """Smooth value noise in [0, 1]."""
    gh, gw = h // cell + 2, w // cell + 2
    grid = RNG.random((gh, gw)).astype(np.float32)
    img = Image.fromarray(grid, mode="F").resize((gw * cell, gh * cell), Image.BICUBIC)
    arr = np.asarray(img)[:h, :w]
    arr = (arr - arr.min()) / max(1e-6, arr.max() - arr.min())
    return arr


def ramp(t: np.ndarray, stops: list[str], dither: np.ndarray) -> np.ndarray:
    """Dithered multi-stop gradient. t in [0, 1]."""
    cols = np.stack([P[s] for s in stops]).astype(np.int16)
    n = len(stops) - 1
    pos = np.clip(t, 0, 1) * n
    idx = np.clip(np.floor(pos).astype(int), 0, n - 1)
    frac = pos - idx
    pick = np.where(frac > dither, idx + 1, idx)
    return cols[pick].astype(np.uint8)


def canvas(h: int, w: int, color: str = "bg") -> np.ndarray:
    img = np.empty((h, w, 3), dtype=np.uint8)
    img[:] = P[color]
    return img


def put(img: np.ndarray, x: int, y: int, color: str) -> None:
    h, w, _ = img.shape
    if 0 <= x < w and 0 <= y < h:
        img[y, x] = P[color]


def rect(img: np.ndarray, x0: int, y0: int, x1: int, y1: int, color: str) -> None:
    h, w, _ = img.shape
    img[max(0, y0) : min(h, y1), max(0, x0) : min(w, x1)] = P[color]


def line(img: np.ndarray, x0: int, y0: int, x1: int, y1: int, color: str) -> None:
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        put(img, x0, y0, color)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def disc(img: np.ndarray, cx: float, cy: float, r: float, color: str) -> None:
    h, w, _ = img.shape
    yy, xx = np.mgrid[0:h, 0:w]
    img[(xx - cx) ** 2 + (yy - cy) ** 2 <= r * r] = P[color]


def ring_dither(img, cx, cy, r, width, color, density, mask=None):
    h, w, _ = img.shape
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    band = np.abs(d - r) < width
    hit = band & (bayer(h, w) < density)
    if mask is not None:
        hit &= mask
    img[hit] = P[color]


def save(img: np.ndarray, name: str, scale: int) -> None:
    im = Image.fromarray(img, "RGB")
    im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    im = im.quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    im.save(OUT / name, optimize=True)
    print(f"{name}: {im.width}x{im.height}")


# ---------------------------------------------------------------------------
# Hero: dusk rig and the well path through the section, native 384x240.
# ---------------------------------------------------------------------------
def industry() -> None:
    W, H = 384, 240
    horizon = 84
    img = canvas(H, W)
    D = bayer(H, W)
    yy, xx = np.mgrid[0:H, 0:W]

    # Sky.
    sky_t = (yy / horizon) ** 1.35 + (noise(H, W, 24) - 0.5) * 0.08
    sky = ramp(sky_t, ["night", "dusk", "plum", "rust", "accent", "amber", "sun"], D)
    img[yy < horizon] = sky[yy < horizon]

    # Cloud streaks.
    streak = noise(H, W, 12)
    streak_rows = (np.sin(yy * 0.55 + xx * 0.012) > 0.62) & (streak > 0.55) & (yy > 18) & (yy < horizon - 14)
    img[streak_rows & (D < 0.55)] = P["plum"]
    streak_hi = (np.sin(yy * 0.55 + xx * 0.012 + 0.9) > 0.8) & (streak > 0.62) & (yy > 40) & (yy < horizon - 6)
    img[streak_hi & (D < 0.45)] = P["amber"]

    # Stars in the upper sky.
    stars = (RNG.random((H, W)) > 0.9965) & (yy < 30)
    img[stars] = P["g3"]

    # Sun resting on the horizon.
    sx, sy, sr = 300, horizon - 1, 17
    d = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2)
    halo = (d < sr + 9) & (yy < horizon) & (D < np.clip((sr + 9 - d) / 9, 0, 1) * 0.7)
    img[halo] = P["sun"]
    img[(d < sr) & (yy < horizon)] = P["sun"]
    img[(d < sr - 5) & (yy < horizon)] = P["ink"]
    # sun bands, like a retro sunset
    for band_y in (horizon - 4, horizon - 8, horizon - 11):
        rect(img, sx - sr - 1, band_y, sx + sr + 1, band_y + 1, "accent")

    # Distant ridge.
    ridge = horizon - 3 - (noise(1, W, 40)[0] * 9 + np.sin(np.arange(W) * 0.05) * 2).astype(int)
    for x in range(W):
        img[ridge[x] : horizon, x] = P["plum"] if x % 2 else P["dusk"]
        img[ridge[x] + 2 : horizon, x] = P["dusk"]

    # Ground and strata.
    base = [horizon, 104, 128, 150, 178, 206, H]
    layers = [
        ("d2", "rust", "fine"),
        ("d1", "d2", "streak"),
        ("panel", "d1", "lamina"),
        ("rust", "d2", "speck"),
        ("deep", "rust", "reservoir"),
        ("void", "panel", "fine"),
    ]
    bounds = []
    for i, b in enumerate(base):
        if i in (0, len(base) - 1):
            bounds.append(np.full(W, b))
        else:
            wave = np.sin(np.arange(W) * (0.018 + i * 0.004) + i * 1.7) * (2 + i * 0.6)
            wave += (noise(1, W, 30)[0] - 0.5) * 5
            bounds.append((b + wave).astype(int))
    tex_noise = noise(H, W, 5)
    for i, (c1, c2, kind) in enumerate(layers):
        top, bot = bounds[i], bounds[i + 1]
        mask = (yy >= top[None, :]) & (yy < bot[None, :])
        if kind == "fine":
            t = tex_noise * 0.55
        elif kind == "streak":
            t = (np.sin(yy * 1.3 + tex_noise * 5) * 0.5 + 0.5) * 0.45
        elif kind == "lamina":
            t = ((yy % 3) == 0) * 0.6 + tex_noise * 0.2
        elif kind == "speck":
            t = (RNG.random((H, W)) > 0.82) * 0.9 + tex_noise * 0.25
        else:
            t = tex_noise * 0.6 + (np.sin(xx * 0.08 + yy * 0.4) * 0.5 + 0.5) * 0.25
        layer = ramp(t, [c1, c2], D)
        img[mask] = layer[mask]
        # boundary hairline
        for x in range(W):
            y = bot[x]
            if 0 <= y < H and i < len(layers) - 1:
                img[y, x] = P["void"] if (x % 3) else P["d1"]
    rect(img, 0, horizon, W, horizon + 1, "g1")

    # Rig.
    rx, top_y, base_w = 104, 20, 30
    for y in range(top_y, horizon):
        t = (y - top_y) / (horizon - top_y)
        half = int(2 + t * base_w / 2)
        put(img, rx - half, y, "void")
        put(img, rx + half, y, "void")
        if (y - top_y) % 8 == 0:
            line(img, rx - half, y, rx + half, y, "void")
        if (y - top_y) % 8 == 4:
            nxt = min(horizon - 1, y + 8)
            t2 = (nxt - top_y) / (horizon - top_y)
            half2 = int(2 + t2 * base_w / 2)
            line(img, rx - half, y - 4, rx + half2, nxt - 4, "void")
            line(img, rx + half, y - 4, rx - half2, nxt - 4, "void")
    rect(img, rx - 4, top_y - 5, rx + 5, top_y, "void")
    put(img, rx, top_y - 7, "accent")
    put(img, rx, top_y - 6, "void")
    # Rig floor, mud pumps, cabin with lit windows.
    rect(img, rx - 24, horizon - 7, rx + 26, horizon - 4, "void")
    rect(img, rx + 30, horizon - 12, rx + 58, horizon, "void")
    for wx in range(rx + 33, rx + 56, 5):
        rect(img, wx, horizon - 9, wx + 2, horizon - 7, "amber")
    rect(img, rx - 52, horizon - 9, rx - 30, horizon, "void")
    rect(img, rx - 48, horizon - 14, rx - 40, horizon - 9, "void")
    put(img, rx - 44, horizon - 16, "accent")
    rect(img, 22, horizon - 6, 40, horizon, "void")
    rect(img, 44, horizon - 4, 52, horizon, "void")

    # Well path: vertical, build section, lateral through the reservoir.
    path = []
    kop, lat_y, radius = 132, 190, 58
    for y in range(horizon, kop):
        path.append((rx, y))
    for a in np.linspace(0, math.pi / 2, 140):
        x = rx + radius - radius * math.cos(a)
        y = kop + radius * math.sin(a) * ((lat_y - kop) / radius)
        path.append((int(round(x)), int(round(y))))
    for x in range(rx + radius, 348):
        drift = int(round(math.sin((x - rx) * 0.03) * 1.2))
        path.append((x, lat_y + drift))
    # Casing outline first, bore on top, so neighbouring points never erase
    # each other along the horizontal lateral.
    for x, y in path:
        for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            put(img, x + ox, y + oy, "void")
    for x, y in path:
        put(img, x, y, "paper")
    # Mud pulses travelling uphole.
    for i, (x, y) in enumerate(path[::9]):
        if i % 2 == 0:
            put(img, x, y, "accent")

    # BHA at the toe of the lateral.
    bx, by = 348, lat_y
    rect(img, bx - 22, by - 2, bx, by + 3, "g2")
    rect(img, bx - 22, by - 2, bx, by - 1, "g3")
    rect(img, bx - 16, by - 2, bx - 12, by + 3, "accent")
    rect(img, bx - 7, by - 2, bx - 5, by + 3, "paper")
    rect(img, bx, by - 1, bx + 3, by + 2, "g3")
    put(img, bx + 3, by, "ink")
    # Signal field around the tool.
    reservoir_mask = yy > horizon + 4
    for r, dens in ((9, 0.55), (15, 0.35), (22, 0.2), (30, 0.1)):
        ring_dither(img, bx - 10, by, r, 0.9, "amber", dens, reservoir_mask)

    save(img, "industry-scene.png", 4)


# ---------------------------------------------------------------------------
# Program 01: downhole tool string, native 240x150.
# ---------------------------------------------------------------------------
def program_downhole() -> None:
    W, H = 240, 150
    img = canvas(H, W)
    D = bayer(H, W)
    yy, xx = np.mgrid[0:H, 0:W]

    rock_t = noise(H, W, 7) * 0.7 + (np.sin(yy * 0.9 + noise(H, W, 20) * 6) * 0.5 + 0.5) * 0.3
    img[:] = ramp(rock_t, ["void", "panel", "d1", "rust"], D * 0.9 + 0.05)

    # Borehole.
    top, bot = 52, 98
    hole = (yy >= top) & (yy < bot)
    img[hole] = ramp(np.abs(yy - (top + bot) / 2) / ((bot - top) / 2) * 0.7, ["void", "bg", "panel"], D)[hole]
    rect(img, 0, top - 1, W, top, "d2")
    rect(img, 0, bot, W, bot + 1, "d2")

    # Signal rings from the pulser, dithered through the rock.
    rock = ~hole
    for r, dens in ((26, 0.6), (38, 0.4), (52, 0.24), (68, 0.12)):
        ring_dither(img, 150, 75, r, 1.0, "accent", dens, rock)

    # Tool string with cylindrical shading.
    ty0, ty1 = 62, 88
    shade_t = (yy - ty0) / (ty1 - ty0)
    body = ramp(np.clip(shade_t, 0, 1), ["g2", "paper", "ink", "g3", "g1", "d2"], D)
    tool = (yy >= ty0) & (yy < ty1) & (xx >= 8) & (xx < 206)
    img[tool] = body[tool]

    joints = [8, 52, 98, 150, 206]
    for jx in joints[1:-1]:
        rect(img, jx - 1, ty0, jx + 2, ty1, "d2")
        rect(img, jx - 3, ty0 + 2, jx - 1, ty1 - 2, "g1")

    # Inclinometer bay: sensor dots.
    for i in range(6):
        rect(img, 18 + i * 5, 72, 20 + i * 5, 74, "d2" if i % 2 else "accent")
    # Gamma window.
    rect(img, 62, 66, 88, 70, "accent")
    rect(img, 62, 80, 88, 84, "deep")
    # Resistivity antennas.
    for ax in (106, 118, 130, 142):
        rect(img, ax, ty0, ax + 2, ty1, "deep")
    # Pulser fins.
    for fx in (160, 172, 184, 196):
        rect(img, fx, ty0 - 3, fx + 4, ty0, "g2")
        rect(img, fx, ty1, fx + 4, ty1 + 3, "g1")
    rect(img, 160, 72, 200, 76, "accent")

    # Drill bit.
    for i in range(16):
        h = int(13 - i * 0.7)
        rect(img, 206 + i, 75 - h, 207 + i, 75 + h, "g2" if i % 3 else "g3")
    for i in range(0, 16, 3):
        put(img, 206 + i, 75 - int(13 - i * 0.7) - 1, "accent")
        put(img, 206 + i, 75 + int(13 - i * 0.7), "accent")
    put(img, 222, 75, "ink")

    # Cuttings flowing back in the annulus.
    for _ in range(60):
        x = int(RNG.integers(0, 206))
        y = int(RNG.choice([RNG.integers(top + 1, ty0 - 1), RNG.integers(ty1 + 1, bot - 1)]))
        put(img, x, y, "d2" if RNG.random() > 0.3 else "rust")

    save(img, "program-downhole.png", 4)


# ---------------------------------------------------------------------------
# Footer fallback: halftone signal field, native 350x225 cells drawn as dots.
# ---------------------------------------------------------------------------
def footer() -> None:
    W, H, cell = 1400, 900, 14
    img = canvas(H, W)
    gw, gh = W // cell, H // cell
    im = Image.fromarray(img, "RGB")
    from PIL import ImageDraw

    draw = ImageDraw.Draw(im)
    for gy in range(gh):
        for gx in range(gw):
            u, v = gx / gw, gy / gh
            s = 0.0
            for off, freq, amp, w in ((0.0, 9.0, 0.07, 0.9), (1.7, 7.0, 0.06, 0.55), (3.4, 11.0, 0.05, 0.4)):
                y = 0.55 + math.sin(u * freq + off) * amp + math.sin(u * freq * 0.5 + off) * amp * 0.6
                s += max(0.0, 1 - abs(v - y) / 0.06) * w
            s = min(1.0, s)
            sparkle = 0.12 if RNG.random() > 0.985 else 0.0
            r = (s * 0.42 + sparkle) * cell
            if r < 0.9:
                continue
            cx, cy = gx * cell + cell / 2, gy * cell + cell / 2
            col = tuple(int(c) for c in (P["accent"] if s > 0.95 else P["g2"] if s > 0.3 else P["g1"]))
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    im = im.quantize(colors=16)
    im.save(OUT / "footer-signal.png", optimize=True)
    print("footer-signal.png")


if __name__ == "__main__":
    industry()
    program_downhole()
    footer()
