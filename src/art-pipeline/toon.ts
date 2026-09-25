// The toon look (research plan §7.1): MeshToonMaterial with a gradient ramp and vertex colours
// so a whole model is one draw call. No outlines since 2026-09-23 (Mario Kart World has none).
import { DataTexture, MeshToonMaterial, NearestFilter, RedFormat, type Material } from 'three';
import { sunlessBackFaces } from '../track-builder/mesh/glow.ts';


let ramp: DataTexture | null = null;
/** 3-step light ramp: shadow, mid, lit. NearestFilter keeps the bands hard. */
export function toonRamp(): DataTexture {
  if (ramp) return ramp;
  const t = new DataTexture(new Uint8Array([90, 175, 255]), 3, 1, RedFormat);
  t.minFilter = t.magFilter = NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  ramp = t;
  return t;
}

let vcToon: MeshToonMaterial | null = null;
/** The one shared material for every vertex-coloured model. */
export function vertexToon(): MeshToonMaterial {
  if (!vcToon) {
    vcToon = new MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: toonRamp() });
    // what wears it and takes the sun's shadows (the podium's blocks) shows no acne on its shaded faces
    // (track-builder glow.ts); patched here, as it is made, so no user's shader changes mid-game
    sunlessBackFaces(vcToon);
  }
  return vcToon;
}

/** Is this one of the shared materials (never disposed per session)? */
export function isShared(m: Material): boolean {
  return m === vcToon || m.userData.shared === true;
}
