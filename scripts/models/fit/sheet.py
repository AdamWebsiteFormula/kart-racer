# Stack images into one review sheet: python sheet.py out.jpg a.jpg b.jpg ... (each scaled to 1600 wide, max 2400 tall total)
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
ims = [i.resize((1600, int(i.height * 1600 / i.width))) for i in ims]
H = sum(i.height for i in ims); k = min(1.0, 2400 / H)
ims = [i.resize((int(i.width * k), int(i.height * k))) for i in ims]
sheet = Image.new('RGB', (max(i.width for i in ims), sum(i.height for i in ims)), 'white'); y = 0
for i in ims: sheet.paste(i, (0, y)); y += i.height
sheet.save(out, quality=85)
