// Code-built sporty wheels (Adam, 30 Sept 2026: the sleek karts' wheels are low-profile slicks on alloy rims, not
// Tripo models): one mesh, axle on X, the rim's face toward +X (the game mirrors the left wheels), one small swatch
// texture (rubber, alloy, dark barrel, the racer's accent on the centre cap and the rim's lip), written as a GLB per racer.
//   RACERS_DIR=<work dir> node scripts/models/fit/run.mjs scripts/models/fit/wheelgen.mjs [racer ...]
// Writes <RACERS_DIR>/<racer>/wheel.glb. rigged.ts fitWheel scales it to the manifest's wheel radius.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const ACCENT = {
  pip: '#ff6f4f', momo: '#f5c518', nova: '#b79cff', juniper: '#2f8a4e',
  otto: '#e8322f', sprocket: '#e02424', boulder: '#6fae3c', gus: '#d8312a',
};

export default async function ({ ev, save, R, args }) {
  const ids = args.length ? args : Object.keys(ACCENT);
  for (const id of ids) {
    const b64 = await ev(`(async () => {
      const THREE = window.THREE;
      const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
      const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
      // the swatches, 4 x 4 cells of 16 px: 0 rubber, 1 alloy, 2 dark barrel, 3 accent, 4 rubber shoulder
      const cols = ['#161618', '#c9ced6', '#34373c', '${ACCENT[id]}', '#26262a'];
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect((i % 4) * 16, Math.floor(i / 4) * 16, 16, 16); });
      const uvOf = (i) => [((i % 4) * 16 + 8) / 64, (Math.floor(i / 4) * 16 + 8) / 64]; // flipY off: v runs down the image
      const paint = (geo, i) => { geo = geo.index ? geo.toNonIndexed() : geo; const [u, v] = uvOf(i); const n = geo.attributes.position.count;
        const uv = new Float32Array(n * 2); for (let k = 0; k < n; k++) { uv[2 * k] = u; uv[2 * k + 1] = v; }
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); for (const a of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(a)) geo.deleteAttribute(a); return geo; };
      // everything is built about Y (lathes, cylinders), then turned so the axle is X and the face looks +X
      const W = 0.36, RIM = 0.8, parts = [];
      // the tire: a low sidewall (outer radius 1, bead at the rim), a flat tread with rounded shoulders
      const prof = [];
      prof.push(new THREE.Vector2(RIM, -W));
      for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI / 2; prof.push(new THREE.Vector2(0.9 + 0.1 * Math.sin(a), -W + 0.1 - 0.1 * Math.cos(a))); }
      for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI / 2; prof.push(new THREE.Vector2(0.9 + 0.1 * Math.cos(a), W - 0.1 + 0.1 * Math.sin(a))); }
      prof.push(new THREE.Vector2(RIM, W));
      parts.push(paint(new THREE.LatheGeometry(prof, 40), 0));
      // the rim's barrel inside the tire (dark) and its polished lip on the face side, with an accent pinstripe
      parts.push(paint(new THREE.CylinderGeometry(RIM, RIM, 2 * W - 0.02, 40, 1, true), 2));
      parts.push(paint(new THREE.RingGeometry(RIM - 0.07, RIM, 40).rotateX(-Math.PI / 2).translate(0, W - 0.015, 0), 1));
      parts.push(paint(new THREE.RingGeometry(RIM - 0.095, RIM - 0.07, 40).rotateX(-Math.PI / 2).translate(0, W - 0.02, 0), 3));
      // the recess behind the spokes (dark disc) and five split spokes in alloy, a little proud of it
      parts.push(paint(new THREE.CircleGeometry(RIM - 0.07, 40).rotateX(-Math.PI / 2).translate(0, W - 0.16, 0), 2));
      for (let s = 0; s < 5; s++) for (const off of [-0.075, 0.075]) {
        const a = (s / 5) * Math.PI * 2 + off, sp = new THREE.BoxGeometry(0.075, 0.06, RIM - 0.2);
        sp.translate(0, 0, (RIM - 0.2) / 2 + 0.16).rotateY(a).translate(0, W - 0.07, 0);
        parts.push(paint(sp, 1));
      }
      // the hub and its accent centre cap
      parts.push(paint(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 24).translate(0, W - 0.08, 0), 1));
      parts.push(paint(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24).translate(0, W - 0.02, 0), 3));
      // the inner face (toward the car): a dark disc so the wheel never reads hollow
      parts.push(paint(new THREE.CircleGeometry(RIM, 40).rotateX(Math.PI / 2).translate(0, -W + 0.02, 0), 2));
      const geo = mergeGeometries(parts); geo.rotateZ(-Math.PI / 2);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false;
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.2 }));
      mesh.name = 'wheel';
      const buf = await new GLTFExporter().parseAsync(mesh, { binary: true });
      let s = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    })()`);
    mkdirSync(join(R, id), { recursive: true });
    save(join(R, id, 'wheel.glb'), 'data:model/gltf-binary;base64,' + b64);
  }
}
