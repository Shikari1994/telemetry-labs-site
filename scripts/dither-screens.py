"""
Screenshots of the works, given a light bitmap grain.

The works keep their own visual style on their own sites; here only their
content is shown, and it has to stay readable. Each capture in scripts/screens/
is cropped to 16:10 and area-averaged to 800x500 (the size it is drawn at on a
2x screen, so nothing is upscaled and the text keeps its strokes), a little
desaturated, its whites rolled off toward the page's cream so a light page does
not glare on the dark ground, and posterised per channel with a fine ordered
(Bayer) grain. The colours stay; only the grain shows.

Output goes to public/media/posters and is referenced only through
lib/media/manifest.ts.

Run:  python scripts/dither-screens.py
Deps: Pillow, numpy
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "screens"
OUT = ROOT.parent / "public" / "media" / "posters"
OUT.mkdir(parents=True, exist_ok=True)

NATIVE = (800, 500)
LEVELS = 16  # per channel
SATURATION = 0.88
DIM = 0.88
CREAM = np.array([250, 249, 245], dtype=np.float32) / 250.0


_B2 = np.array([[0, 2], [3, 1]])
_B4 = np.block([[4 * _B2, 4 * _B2 + 2], [4 * _B2 + 3, 4 * _B2 + 1]])
BAYER = (_B4 + 0.5) / 16.0


def crop_16x10(im: Image.Image, box: tuple[int, int, int, int] | None) -> Image.Image:
    if box:
        im = im.crop(box)
    w, h = im.size
    if w / h > 1.6:
        nw = round(h * 1.6)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w / 1.6)
        im = im.crop((0, 0, w, nh))
    return im


def dither(im: Image.Image) -> Image.Image:
    small = im.convert("RGB").resize(NATIVE, Image.BOX)
    rgb = np.asarray(small, dtype=np.float32) / 255.0

    lum = (rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[..., None]
    rgb = np.clip((lum + (rgb - lum) * SATURATION) * DIM * CREAM, 0, 1)

    h, w, _ = rgb.shape
    threshold = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w, None]
    out = np.floor(rgb * (LEVELS - 1) + threshold) / (LEVELS - 1)

    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGB")


def phones(names: list[str]) -> Image.Image:
    """Three phone captures side by side on a dark 16:10 board."""
    board = Image.new("RGB", (1600, 1000), (15, 15, 14))
    height = 920
    shots = []
    for name in names:
        shot = Image.open(SRC / name).convert("RGBA")
        width = round(shot.width * height / shot.height)
        shots.append(shot.resize((width, height), Image.LANCZOS))
    gap = 70
    total = sum(s.width for s in shots) + gap * (len(shots) - 1)
    x = (board.width - total) // 2
    for shot in shots:
        board.paste(shot, (x, (board.height - height) // 2), shot)
        x += shot.width + gap
    return board


# name, source, crop box in source pixels (None = whole frame)
JOBS: list[tuple[str, str, tuple[int, int, int, int] | None]] = [
    ("gtn-hero", "gtn-hero.jpg", None),
    ("gtn-globe", "gtn-globe.jpg", None),
    ("gtn-atlas", "gtn-atlas.jpg", None),
    ("gtn-video", "gtn-video.jpg", None),
    ("gtn-catalog", "gtn-catalog.jpg", None),
    ("gtn-mobile", "gtn-mobile.jpg", None),
    ("dm-drilling", "dm-drilling.webp", (108, 14, 1048, 602)),
    ("dm-survey", "dm-survey.jpg", (0, 58, 614, 442)),
    ("dm-logging", "dm-logging.jpg", (0, 58, 614, 442)),
    ("dm-fleet", "dm-fleet.jpg", (0, 58, 614, 442)),
]


def main() -> None:
    for name, source, box in JOBS:
        im = crop_16x10(Image.open(SRC / source), box)
        dither(im).save(OUT / f"{name}.png", optimize=True)
        print(f"{name}.png")
    board = phones(["dm-app-park.webp", "dm-app-drilling.webp", "dm-app-bha.webp"])
    dither(board).save(OUT / "dm-mobile.png", optimize=True)
    print("dm-mobile.png")


if __name__ == "__main__":
    main()
