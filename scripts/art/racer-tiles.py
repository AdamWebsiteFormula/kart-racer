"""The Racer screen's tiles (design §12, 26 Sept 2026): each racer's face, head and shoulders, cut out of
their portrait (public/art/racers/<id>.webp: the concept art on a flat light-gray studio backdrop) so it
stands on the screen's glass tile the way Mario Kart World's roster tiles show each racer cut out.

The backdrop is one flat gray, so the matte is simple and exact enough: every pixel that is backdrop-gray
and joined to the picture's edge is backdrop; the racer is the rest (gray inside the racer stays). The
edge is taken in one pixel and feathered by its color distance from the gray, and the fringe's colors are
unmixed from the gray, so no light halo shows on a dark tile.

  ~/.cache/rascal-ear/venv/bin/python scripts/art/racer-tiles.py
(needs numpy, scipy and Pillow; writes public/art/racers/tiles/<id>.webp, RGBA)
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/art/racers"
OUT = SRC / "tiles"

# each head's middle in the portrait, as fractions across and down (ui-hud data/faces.ts HEADS)
HEADS = {
    "pip": (0.45, 0.22), "momo": (0.48, 0.30), "nova": (0.54, 0.29), "juniper": (0.44, 0.19),
    "otto": (0.50, 0.22), "sprocket": (0.49, 0.27), "boulder": (0.49, 0.28), "gus": (0.47, 0.27),
}
# the crop: this share of the portrait's width, 4:5 like the tile, its top this far above the head's middle
CROP_W, ASPECT, ABOVE = 0.56, 0.8, 0.21
BG_NEAR = 13.0   # a pixel this close to the backdrop gray (0-255, the largest channel difference) may be backdrop
FEATHER = 20.0   # the fringe's alpha rises over this much color distance


def cut(img: np.ndarray) -> np.ndarray:
    h, w, _ = img.shape
    border = np.concatenate([img[:3].reshape(-1, 3), img[-3:].reshape(-1, 3), img[:, :3].reshape(-1, 3), img[:, -3:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    d = np.abs(img - bg).max(axis=2)
    near = d < BG_NEAR
    labels, _ = ndimage.label(near)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    back = np.isin(labels, edge[edge > 0])
    fore = ~back
    fore = ndimage.binary_opening(fore, iterations=1)  # specks of noise in the backdrop
    core = ndimage.binary_erosion(fore, iterations=1)
    ring = fore & ~core | (ndimage.binary_dilation(fore, iterations=1) & ~fore)
    alpha = core.astype(np.float64)
    alpha[ring] = np.clip((d[ring] - 3.0) / FEATHER, 0.0, 1.0)
    # unmix the fringe from the backdrop: C = a F + (1 - a) B
    a = np.maximum(alpha, 1e-3)[..., None]
    col = np.where(alpha[..., None] > 0, (img - (1.0 - a) * bg) / a, 0.0)
    col = np.clip(col, 0, 255)
    return np.dstack([col, alpha * 255.0]).round().astype(np.uint8)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for rid, (hx, hy) in HEADS.items():
        img = np.asarray(Image.open(SRC / f"{rid}.webp").convert("RGB"), dtype=np.float64)
        rgba = cut(img)
        h, w = rgba.shape[:2]
        cw = round(CROP_W * w)
        ch = round(cw / ASPECT)
        x0 = int(np.clip(round(hx * w - cw / 2), 0, w - cw))
        y0 = int(np.clip(round((hy - ABOVE) * h), 0, h - ch))
        tile = Image.fromarray(rgba[y0:y0 + ch, x0:x0 + cw], "RGBA")
        out = OUT / f"{rid}.webp"
        tile.save(out, quality=90, method=6)
        print(out.relative_to(ROOT), tile.size, out.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
