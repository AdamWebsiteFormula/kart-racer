"""Recolor part of a driver's base-color texture, straight in the GLB (no browser): every texel of a triangle whose
three corners sit above `from` (a fraction of the model's height, rest pose) that is saturated or near-white gets the
new color, keeping its shading; brown fur and darks stay. Made for Otto's cap (Adam, 30 Sept 2026: "colored like a
beach ball"): black leather like his jacket.
  python3 scripts/models/fit/recolor.py <in.glb> <out.glb> <from 0..1> <#hex>   (needs numpy, pillow)
Use it on the raw Meshy file (float positions and uvs), before optimizing."""
import io, json, struct, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, out, frm, hexc = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
raw = open(src, 'rb').read()
jl = struct.unpack_from('<I', raw, 12)[0]
js = json.loads(raw[20:20 + jl])
bl = struct.unpack_from('<I', raw, 20 + jl)[0]
binc = bytearray(raw[28 + jl:28 + jl + bl])

def acc(i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', 0) or n * np.dtype(dt).itemsize
    buf = np.frombuffer(bytes(binc), dtype=np.uint8, count=stride * a['count'], offset=off).reshape(a['count'], stride)
    return buf[:, :n * np.dtype(dt).itemsize].copy().view(dt).reshape(a['count'], n)

prim = next(p for m in js['meshes'] for p in m['primitives'])
P, UV = acc(prim['attributes']['POSITION']), acc(prim['attributes']['TEXCOORD_0'])
I = acc(prim['indices']).reshape(-1, 3) if 'indices' in prim else np.arange(len(P)).reshape(-1, 3)
mat = js['materials'][prim['material']]
tex = js['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]
imi = tex['source']; im = js['images'][imi]; ibv = js['bufferViews'][im['bufferView']]
o = ibv.get('byteOffset', 0)
img = Image.open(io.BytesIO(bytes(binc[o:o + ibv['byteLength']]))).convert('RGB')
W, H = img.size
lo, hi = P[:, 1].min(), P[:, 1].max(); cut = lo + (hi - lo) * frm
mask = Image.new('L', (W, H), 0); d = ImageDraw.Draw(mask); tris = 0
for t in I:
    # any corner up there; lower down, only behind the head (a backwards cap's brim hangs to the nape)
    if P[t, 1].max() < cut and not (P[t, 1].max() > lo + (hi - lo) * (frm - 0.1) and P[t, 2].max() < -0.03): continue
    tris += 1
    d.polygon([(float(UV[v, 0]) * W, float(UV[v, 1]) * H) for v in t], fill=255, outline=255)
# grown 8 px so the islands' edges go too (the game's 1024 texture would blend them back in)
A = np.asarray(img).astype(np.float32) / 255; M = np.asarray(mask.filter(ImageFilter.MaxFilter(17))) > 0
r, g, b = A[..., 0], A[..., 1], A[..., 2]; mx = A.max(-1); mn = A.min(-1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
blue = (b > r + 0.15) & (b > g) & (sat > 0.35) & (mx > 0.3)  # bright blues only: the fur's cool shadows stay
red = ((r > 0.5) & (r > 2.6 * g) & (r > 2.2 * b)) | ((r > 0.6) & (r > g + 0.25) & (b > g))  # reds and pinks
take = M & (blue | red)  # the cap's blue and red; fur (browns, creams), eye whites and darks stay
col = np.array([int(hexc[i:i + 2], 16) for i in (1, 3, 5)]) / 255
lum = (0.35 + 0.65 * mx)[..., None]
A[take] = np.clip(col * lum[take] + 0.03, 0, 1)
buf = io.BytesIO(); Image.fromarray((A * 255).astype(np.uint8)).save(buf, 'PNG'); png = buf.getvalue()
# the new image at the end of the binary chunk, in a view of its own
while len(binc) % 4: binc.append(0)
js['bufferViews'].append({'buffer': 0, 'byteOffset': len(binc), 'byteLength': len(png)})
binc += png
while len(binc) % 4: binc.append(0)
im['bufferView'] = len(js['bufferViews']) - 1; im['mimeType'] = 'image/png'
js['buffers'][0]['byteLength'] = len(binc)
jb = json.dumps(js, separators=(',', ':')).encode()
while len(jb) % 4: jb += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(binc)) + struct.pack('<II', len(jb), 0x4E4F534A) + jb + struct.pack('<II', len(binc), 0x004E4942) + bytes(binc)
open(out, 'wb').write(glb)
print(f'recolored {int(take.sum())} texels on {tris} triangles -> {out}')
