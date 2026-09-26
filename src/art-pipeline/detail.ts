// Detail maps for the PBR look (look.ts): a painted surface's own fine relief, read from its albedo's
// luminance once, at load. Red and green hold the relief's slope (a tangent-space normal's x and y,
// 0.5 flat: x along the texture's u, y along its v as three samples it), blue its height (the
// luminance, for cavities and roughness). The PBR surfaces sample them in world space on the ground
// and the road (surfaces.ts), mirrored like the albedo, so no seam shows and the normal flips with it.
import { CanvasTexture, MirroredRepeatWrapping, Texture, LinearMipmapLinearFilter, LinearFilter } from 'three';

/** How far a detail map's slopes reach: the 90th percentile of the relief's slope comes out at this (a normal's x or y). */
export const DETAIL_SLOPE = 0.55;

/**
 * The detail map of a `w` × `h` luminance field (0..1, row 0 at the top, as a canvas holds it): a
 * Sobel slope on the field mirrored at its edges (as MirroredRepeatWrapping continues it), scaled so
 * its 90th percentile is DETAIL_SLOPE, as RGBA bytes. Pure: no canvas.
 */
export function detailPixels(lum: Float32Array, w: number, h: number): Uint8ClampedArray {
  // the field with a one-pixel border mirrored in (as MirroredRepeatWrapping continues it: -1 is 0, w is w - 1)
  const W = w + 2, pad = new Float32Array(W * (h + 2));
  for (let y = -1; y <= h; y++) {
    const my = y < 0 ? 0 : y >= h ? h - 1 : y;
    for (let x = -1; x <= w; x++) pad[(y + 1) * W + x + 1] = lum[my * w + (x < 0 ? 0 : x >= w ? w - 1 : x)];
  }
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h), mags: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y + 1) * W + x + 1;
      const a = pad[o - W - 1], b = pad[o - W], c = pad[o - W + 1], d = pad[o - 1], f = pad[o + 1], g = pad[o + W - 1], k = pad[o + W], l = pad[o + W + 1];
      const sx = (c + 2 * f + l) - (a + 2 * d + g), sy = (g + 2 * k + l) - (a + 2 * b + c);
      gx[y * w + x] = sx; gy[y * w + x] = sy;
      if (((x * 7 + y * 13) & 15) === 0) mags.push(Math.hypot(sx, sy));
    }
  }
  mags.sort((p, q) => p - q);
  const p90 = mags[Math.floor(mags.length * 0.9)] || 1;
  const s = DETAIL_SLOPE / p90;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    // a height field's normal leans away from its rise: x against the rise along u (the canvas's x); v runs
    // up the canvas as three samples it (a texture's rows are flipped), so y goes with the rise down the rows
    let nx = -gx[i] * s, ny = gy[i] * s;
    const m = Math.hypot(nx, ny);
    if (m > 0.95) { nx *= 0.95 / m; ny *= 0.95 / m; }
    out[i * 4] = Math.round(127.5 + 127.5 * nx);
    out[i * 4 + 1] = Math.round(127.5 + 127.5 * ny);
    out[i * 4 + 2] = Math.round(255 * lum[i]);
    out[i * 4 + 3] = 255;
  }
  return out;
}

/** Luminance (Rec. 709 on the stored sRGB bytes: relief follows what the eye sees) of RGBA bytes. */
export function luminance(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255;
  return out;
}

/** Side of a detail map, pixels: the relief is fine grain; half the albedo's 1024 is plenty and quarter the work. */
export const DETAIL_SIZE = 512;

/**
 * A detail map texture for an albedo that is still loading: flat until `loaded` gives the image, then
 * its relief (drawn once through a canvas). Mirrored like the albedo; mipmapped, so the relief smooths
 * out with distance instead of shimmering. No page (tests): stays flat. The flat stand-in is already
 * DETAIL_SIZE square: WebGL2 fixes a texture's size at its first upload (three's texStorage2D), so a
 * 4 x 4 stand-in drawn before the albedo arrived could never take the relief (Firefox: "texSubImage:
 * Offset+size must be <= the size of the existing specified image", the ground and road flat for the
 * whole session; 26 Sept 2026).
 */
export function detailTexture(loaded: Promise<Texture> | null): Texture {
  const flat = typeof document === 'undefined' ? null : document.createElement('canvas');
  let t: Texture;
  if (flat) {
    flat.width = flat.height = DETAIL_SIZE;
    const g = flat.getContext('2d');
    if (g) { g.fillStyle = 'rgb(128, 128, 128)'; g.fillRect(0, 0, DETAIL_SIZE, DETAIL_SIZE); }
    t = new CanvasTexture(flat);
  } else t = new Texture();
  t.wrapS = t.wrapT = MirroredRepeatWrapping;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.anisotropy = 8;
  t.userData.shared = true;
  void loaded?.then((albedo) => {
    const img = albedo.image as CanvasImageSource | undefined;
    if (!img || typeof document === 'undefined') return;
    const c = document.createElement('canvas');
    c.width = c.height = DETAIL_SIZE;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return;
    g.drawImage(img, 0, 0, DETAIL_SIZE, DETAIL_SIZE);
    const px = g.getImageData(0, 0, DETAIL_SIZE, DETAIL_SIZE);
    px.data.set(detailPixels(luminance(px.data, DETAIL_SIZE, DETAIL_SIZE), DETAIL_SIZE, DETAIL_SIZE));
    g.putImageData(px, 0, 0);
    t.image = c;
    t.needsUpdate = true;
  }).catch(() => undefined);
  return t;
}
