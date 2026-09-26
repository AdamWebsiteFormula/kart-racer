// @vitest-environment jsdom
// The detail map's stand-in (detail.ts detailTexture) in a page: WebGL2 fixes a texture's size at its
// first upload, so the flat stand-in must already be the size the relief will be.
import { describe, expect, it } from 'vitest';
import { DETAIL_SIZE, detailTexture } from './detail.ts';

describe('detail map stand-in', () => {
  it('is DETAIL_SIZE square before the albedo arrives, the size the relief is drawn at (Firefox kept a 4 x 4 one flat, 26 Sept 2026)', () => {
    const t = detailTexture(new Promise(() => undefined)); // an albedo still loading
    const img = t.image as HTMLCanvasElement;
    expect(img.width).toBe(DETAIL_SIZE);
    expect(img.height).toBe(DETAIL_SIZE);
  });
});
