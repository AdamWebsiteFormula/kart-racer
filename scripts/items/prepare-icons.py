"""Shrinks the AI-painted item art (transparent PNGs named <itemId>.png) into the HUD icons
public/art/items/<itemId>.webp: trimmed to the painted pixels, centred on a square with a
little air, 256 px, WebP with alpha.

    python3 scripts/items/prepare-icons.py <folder of pngs>
"""
import os
import sys

from PIL import Image

SIZE = 256
PAD = 0.06  # air around the art, as a fraction of the side

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'art', 'items')
os.makedirs(out, exist_ok=True)
for name in sorted(os.listdir(src)):
    if not name.endswith('.png'):
        continue
    im = Image.open(os.path.join(src, name)).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if box:
        im = im.crop(box)
    side = int(max(im.size) * (1 + 2 * PAD))
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
    dest = os.path.join(out, name[:-4] + '.webp')
    sq.save(dest, 'WEBP', quality=88, method=6)
    print(f'{name[:-4]}: {os.path.getsize(dest) // 1024} KB')
