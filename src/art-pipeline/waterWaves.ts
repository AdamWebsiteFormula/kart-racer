// Real wave geometry for the sea (research brief, 26 Sept 2026: Digital Foundry's MKW tech review —
// "waves have real geometric undulation, not just a normal map, with foam on the crests"). A sum of
// Gerstner waves displaces a camera-following grid near the course; analytic normals from the same sum
// drive the lighting, Fresnel and glints (surfaces.ts), so the swell is properly lit, not painted on.
// The far sea stays the single flat quad it always was (surfaces.ts/scene.ts): the vertex shader fades
// the whole displacement out by distance from the camera, so a coarse, far-away triangle (with nowhere
// near enough vertices to show a swell anyway) simply reads flat, exactly as it does today.
import { BufferAttribute, BufferGeometry, Mesh, Vector3, type Camera, type Object3D } from 'three';

const G = 9.80665;

/** One Gerstner wave's authored knobs: unit-ish direction (need not be normalized), wavelength and amplitude in metres. */
interface WaveDef { dir: readonly [number, number]; wavelength: number; amplitude: number }

/**
 * A slow, calm swell (never choppy, per the research brief): four waves, mixed directions,
 * wavelengths 10-36 m, amplitudes 0.08-0.28 m. Speeds follow the deep-water dispersion relation
 * (c = sqrt(g*lambda / 2pi)), so the long wave visibly outruns the short one, as real swell does.
 */
const WAVE_DEFS: readonly WaveDef[] = [
  { dir: [1, 0.3], wavelength: 26, amplitude: 0.22 },
  { dir: [-0.4, 1], wavelength: 15, amplitude: 0.13 },
  { dir: [0.5, -0.8], wavelength: 34, amplitude: 0.28 },
  { dir: [-0.9, -0.35], wavelength: 10, amplitude: 0.08 },
];

/** Overall steepness (0-1): how much of each wave's own theoretical sharp-crest limit it uses. Low and gentle, not choppy. */
const STEEPNESS = 0.5;

interface WaveConst { dx: number; dz: number; k: number; omega: number; amplitude: number; q: number }

function waveConstants(defs: readonly WaveDef[]): readonly WaveConst[] {
  return defs.map((w) => {
    const len = Math.hypot(w.dir[0], w.dir[1]) || 1;
    const dx = w.dir[0] / len, dz = w.dir[1] / len;
    const k = (2 * Math.PI) / w.wavelength;
    const omega = Math.sqrt(G * k); // deep-water dispersion: omega^2 = g*k, i.e. c = sqrt(g*lambda/2pi)
    const q = STEEPNESS / (k * w.amplitude * defs.length);
    return { dx, dz, k, omega, amplitude: w.amplitude, q };
  });
}

/** The waves as built (TS mirror of the GLSL sum below, for tests and any future CPU use — e.g. a floating prop). */
export const WAVES: readonly WaveConst[] = waveConstants(WAVE_DEFS);

/** The tallest a crest reaches (sum of amplitudes): how far a "near the top" foam test should look. */
export const WAVE_MAX_HEIGHT = WAVES.reduce((s, w) => s + w.amplitude, 0);

/**
 * The world-space Y a flat sea would have at (x, z) at time `t`: the same sum the vertex shader
 * computes (GERSTNER_GLSL), in plain TS. Pure and deterministic, so a test can check it against known
 * values (a trough is never above the mean, a crest never below it) without a GPU.
 */
export function gerstnerHeight(x: number, z: number, t: number): number {
  let y = 0;
  for (const w of WAVES) {
    const phase = w.k * (w.dx * x + w.dz * z) - w.omega * t;
    y += w.amplitude * Math.sin(phase);
  }
  return y;
}

const f = (n: number): string => n.toFixed(6);

/**
 * GLSL: `lkGerstner(worldXZ, t, fade)` returns the wave's displacement (x, y, z; x/z are the
 * characteristic peaked-crest horizontal pull, scaled by `fade`) and, via `lkGerstnerNormal` right
 * after it (reads the same running sums `gN`/`gDx`/`gDz` the position function just left behind), the
 * analytic surface normal — cheaper than a second pass over the same four waves. `fade` (0..1) is the
 * distance fade (surfaces.ts): at fade 0 this returns zero displacement and a flat (0,1,0) normal, so
 * the far, coarse background quad reads exactly as it always has.
 */
export const GERSTNER_GLSL = `
vec3 lkGerstner(vec2 p, float t, float fade) {
  float dY = 0.0, dX = 0.0, dZ = 0.0;
${WAVES.map((w) => `  {
    float k = ${f(w.k)}, a = ${f(w.amplitude)} * fade, q = ${f(w.q)};
    float phase = k * (${f(w.dx)} * p.x + ${f(w.dz)} * p.y) - ${f(w.omega)} * t;
    float s = sin(phase), c = cos(phase);
    dY += a * s;
    dX += q * a * ${f(w.dx)} * c;
    dZ += q * a * ${f(w.dz)} * c;
  }`).join('\n')}
  return vec3(dX, dY, dZ);
}
/** The analytic normal at the same (p, t, fade) lkGerstner was just called with (GPU Gems ch.1's Gerstner-sum Jacobian, the standard closed form). */
vec3 lkGerstnerNormal(vec2 p, float t, float fade) {
  float nx = 0.0, nz = 0.0, ny = 1.0;
${WAVES.map((w) => `  {
    float k = ${f(w.k)}, a = ${f(w.amplitude)} * fade, q = ${f(w.q)};
    float phase = k * (${f(w.dx)} * p.x + ${f(w.dz)} * p.y) - ${f(w.omega)} * t;
    float wa = k * a, s = sin(phase), c = cos(phase);
    nx -= ${f(w.dx)} * wa * c;
    nz -= ${f(w.dz)} * wa * c;
    ny -= q * wa * s;
  }`).join('\n')}
  return normalize(vec3(nx, max(ny, 0.2), nz));
}
`;

// ---- the near-camera grid the swell actually shows on ----

/**
 * Metres square the wave grid covers, and its cell size: fine enough for a 10 m wave to read as a
 * curve, coarse enough that the vertex count stays modest (Harbour Loop's own scene, race-manager and
 * 8 karts and all, leaves only a few thousand triangles of headroom under the SOP's 400k ceiling: one
 * more prop or a busier decor pass elsewhere could use the rest). 33x33 cells, 2178 triangles.
 */
export const WAVE_GRID = Object.freeze({ size: 200, cell: 6 });

/** Where the swell fades out (metres from the camera): gone well inside the grid's own edge (half of WAVE_GRID.size, 100 m), so it meets the surrounding flat plane with no seam. */
export const WAVE_FADE = Object.freeze({ near: 55, far: 90 });

let sharedGeometry: BufferGeometry | null = null;
/**
 * A flat grid (local XZ, y = 0), WAVE_GRID.size across, snapped in place by `attachWaveFollow`. Built
 * once and shared (never disposed by a scene, like the water material itself): the same geometry
 * serves every sea race, whatever biome.
 */
export function waveGridGeometry(): BufferGeometry {
  if (sharedGeometry) return sharedGeometry;
  const n = Math.round(WAVE_GRID.size / WAVE_GRID.cell);
  const cell = WAVE_GRID.size / n;
  const verts = n + 1;
  const pos = new Float32Array(verts * verts * 3);
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const v = (j * verts + i) * 3;
      pos[v] = (i - n / 2) * cell;
      pos[v + 1] = 0;
      pos[v + 2] = (j - n / 2) * cell;
    }
  }
  const index: number[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * verts + i, b = a + 1, c = a + verts, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setIndex(index);
  // the shader displaces every vertex a fraction of a metre; a fixed generous bound beats an exact
  // (and, since the grid moves under the shader's own fade, slightly wrong) computed one
  g.boundingSphere = null;
  g.computeBoundingSphere();
  g.boundingSphere!.radius += WAVE_MAX_HEIGHT + 2;
  sharedGeometry = g;
  return g;
}

/**
 * Cell-snapped so the grid moves in whole cells only (no per-vertex "swimming" as the camera drifts
 * within one), always centred close under the camera. `updateMatrixWorld` right after moving it: three
 * computes matrixWorld once, before onBeforeRender runs on anything, so without this the new position
 * would only reach the GPU a frame late (imperceptible at gameplay speeds, but wrong on the very frame
 * a headless check screenshots).
 */
export function attachWaveFollow(mesh: Object3D): void {
  const cell = WAVE_GRID.size / Math.round(WAVE_GRID.size / WAVE_GRID.cell);
  mesh.onBeforeRender = (_renderer, _scene, camera: Camera) => {
    mesh.position.x = Math.round(camera.position.x / cell) * cell;
    mesh.position.z = Math.round(camera.position.z / cell) * cell;
    mesh.updateMatrixWorld(true);
  };
}

/** A new wave-grid mesh sharing `material` (the water's own ShaderMaterial) and the cached geometry above; `waterY` sets its resting height. renderOrder matches the flat sea plane's (-2: scene.ts). */
export function buildWaveGridMesh(material: Mesh['material'], waterY: number): Mesh {
  const mesh = new Mesh(waveGridGeometry(), material);
  mesh.name = 'ground-water-waves';
  mesh.position.y = waterY;
  // right after the flat sea plane (-2, scene.ts): that mesh's own onBeforeRender (art-pipeline
  // waterDepth.ts) is what actually captures the scene depth this frame, so it must draw first; this
  // grid then reads the very same capture, never its own (or the flat plane's) drawn pixels
  mesh.renderOrder = -1.99;
  mesh.receiveShadow = true;
  mesh.userData.sharedMaterial = true;
  attachWaveFollow(mesh);
  return mesh;
}

/** Test-only: a fresh Vector3 for a caller that wants gerstnerHeight's displacement, not just its Y. Not used at runtime (the shader does this on the GPU). */
export function gerstnerDisplacement(x: number, z: number, t: number): Vector3 {
  let dx = 0, dy = 0, dz = 0;
  for (const w of WAVES) {
    const phase = w.k * (w.dx * x + w.dz * z) - w.omega * t;
    const s = Math.sin(phase), c = Math.cos(phase);
    dy += w.amplitude * s;
    dx += w.q * w.amplitude * w.dx * c;
    dz += w.q * w.amplitude * w.dz * c;
  }
  return new Vector3(dx, dy, dz);
}
