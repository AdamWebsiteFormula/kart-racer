// The design bible's 32 px silhouette test (design §3: every racer and every item identifiable in a 32 px
// black silhouette): a geometry's triangles, projected on two world axes, rasterised into a square bitmap.
import type { BufferGeometry } from 'three';

export const SIZE = 32;

/** Rasterise a geometry's triangles, projected on two world axes, into a size² bitmap (1 = covered). */
export function silhouette(g: BufferGeometry, ax: 0 | 1 | 2, ay: 0 | 1 | 2, box: { min: number[]; max: number[] }, size = SIZE): Uint8Array {
  const pos = g.getAttribute('position');
  const idx = g.index!;
  const bmp = new Uint8Array(size * size);
  const span = Math.max(box.max[ax] - box.min[ax], box.max[ay] - box.min[ay]);
  const px = (v: number, a: number) => ((v - box.min[a]) / span) * size;
  const P = (i: number) => [px(pos.getComponent(i, ax), ax), size - px(pos.getComponent(i, ay), ay)];
  for (let t = 0; t < idx.count; t += 3) {
    const [a, b, c] = [P(idx.getX(t)), P(idx.getX(t + 1)), P(idx.getX(t + 2))];
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(size - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(size - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-9) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = [x + 0.5, y + 0.5];
      const w0 = (b[0] - p[0]) * (c[1] - p[1]) - (b[1] - p[1]) * (c[0] - p[0]);
      const w1 = (c[0] - p[0]) * (a[1] - p[1]) - (c[1] - p[1]) * (a[0] - p[0]);
      const w2 = (a[0] - p[0]) * (b[1] - p[1]) - (a[1] - p[1]) * (b[0] - p[0]);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) bmp[y * size + x] = 1;
    }
  }
  return bmp;
}

/** How much two bitmaps overlap: shared pixels over pixels in either. */
export const iou = (a: Uint8Array, b: Uint8Array): number => {
  let i = 0, u = 0;
  for (let k = 0; k < a.length; k++) { i += a[k] & b[k]; u += a[k] | b[k]; }
  return i / u;
};

/** A bitmap as a crisp black-on-white SVG, 4× its size (docs/silhouettes/). */
export const svg = (bmp: Uint8Array, size = SIZE): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 4}" height="${size * 4}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/>`
  + [...bmp].map((v, k) => (v ? `<rect x="${k % size}" y="${Math.floor(k / size)}" width="1" height="1"/>` : '')).join('') + '</svg>';
