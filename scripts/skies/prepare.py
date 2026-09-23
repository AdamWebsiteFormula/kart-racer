"""Turn painted sky panoramas (PNG from the image model) into game files.

For each <id>.png in the source folder: write public/skies/<id>.webp and print the colours the
sky dome's gradient and the fog need, measured from the painting itself so everything matches:
the horizon (the bottom band) and the top (the top band).

    python3 scripts/skies/prepare.py <folder with <id>.png files>
"""
import json
import os
import sys

from PIL import Image

src = sys.argv[1]
out_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'skies')
os.makedirs(out_dir, exist_ok=True)


def band_hex(im: Image.Image, top: float, bottom: float) -> str:
    """Average colour of a horizontal band, as #rrggbb (sRGB, like the source)."""
    w, h = im.size
    band = im.crop((0, int(h * top), w, max(int(h * top) + 1, int(h * bottom)))).resize((1, 1), Image.BOX)
    r, g, b = band.getpixel((0, 0))[:3]
    return f'#{r:02x}{g:02x}{b:02x}'


colours = {}
for name in sorted(os.listdir(src)):
    if not name.endswith('.png') or '-preview' in name:
        continue
    sky_id = name[:-4]
    im = Image.open(os.path.join(src, name)).convert('RGB')
    im.save(os.path.join(out_dir, f'{sky_id}.webp'), 'WEBP', quality=86, method=6)
    colours[sky_id] = {'horizon': band_hex(im, 0.94, 1.0), 'top': band_hex(im, 0.0, 0.08)}
    size = os.path.getsize(os.path.join(out_dir, f'{sky_id}.webp')) // 1024
    print(f'{sky_id}: {im.size[0]}x{im.size[1]}, {size} KB, horizon {colours[sky_id]["horizon"]}, top {colours[sky_id]["top"]}')

print(json.dumps(colours))
