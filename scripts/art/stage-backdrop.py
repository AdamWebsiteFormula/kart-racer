"""The Racer and Kart screens' backdrop (design §12, 26 Sept 2026): our own world out of focus behind the menu, as
Mario Kart World's select screens blur its world behind theirs. The source is a still of Harbor Loop's course
intro 1.4 s in (the high sweep toward the volcano: sea both sides, the road, the sky), taken silently with
scripts/headless/snap.mjs (the UI hidden, kart.introAt(1.4)). It is shrunk, blurred hard, and a little more
saturated, so it reads bright and airy behind the glass tiles; tiny (a few KB), the stage stretches it.

  ~/.cache/rascal-ear/venv/bin/python scripts/art/stage-backdrop.py <still.jpg>
(writes public/art/menus/stage.webp)
"""
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]


def main(src: str) -> None:
    im = Image.open(src).convert("RGB").resize((640, 360), Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(11))
    im = ImageEnhance.Color(im).enhance(1.35)
    im = ImageEnhance.Contrast(im).enhance(1.12)
    im = ImageEnhance.Brightness(im).enhance(0.93)
    out = ROOT / "public/art/menus/stage.webp"
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, quality=82, method=6)
    print(out.relative_to(ROOT), out.stat().st_size, "bytes")


if __name__ == "__main__":
    main(sys.argv[1])
