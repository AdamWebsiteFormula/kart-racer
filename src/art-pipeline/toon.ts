// The toon look (research plan §7.1): MeshToonMaterial with a gradient ramp and vertex colours
// so a whole model is one draw call. No outlines since 2026-09-23 (Mario Kart World has none).
import {
  AdditiveBlending, DataTexture, MeshBasicMaterial, MeshToonMaterial, NearestFilter, RedFormat,
  type Material,
} from 'three';


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
  if (!vcToon) vcToon = new MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: toonRamp() });
  return vcToon;
}

let flame: MeshBasicMaterial | null = null;
/** The one shared boost-flame material: unlit vertex colours added onto what is behind, no depth write. */
export function flameMaterial(): MeshBasicMaterial {
  if (!flame) flame = new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false });
  return flame;
}

/** Is this one of the shared materials (never disposed per session)? */
export function isShared(m: Material): boolean {
  return m === vcToon || m === flame;
}
