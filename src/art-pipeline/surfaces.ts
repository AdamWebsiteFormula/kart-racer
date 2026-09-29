// The big flat surfaces: stylized water that drifts and sparkles, and painted ground and road
// textures (AI-made, public/textures). Everything here is shared across races and never disposed
// by a scene. WATER_CLOCK is the one time uniform every water material reads; the game ticks it.
import {
  CanvasTexture, Color, MeshStandardMaterial, MeshToonMaterial, MirroredRepeatWrapping, RepeatWrapping, ShaderMaterial, SRGBColorSpace, TextureLoader,
  Texture, UniformsLib, UniformsUtils, Vector3, type Material, type Object3D, type WebGLProgramParametersWithUniforms,
} from 'three';
import { toonRamp } from './toon.ts';
import { detailTexture } from './detail.ts';
import { isPbr, litWorld, look, PBR, worldEnvironment } from './look.ts';
import { WATER_DEPTH, WATER_DEPTH_GLSL, waterDepthHook, waterDepthUniforms } from './waterDepth.ts';
import { buildWaveGridMesh, gerstnerRide, GERSTNER_GLSL, SEA_TIDE, WAVE_FADE, waveFade, WAVE_MAX_HEIGHT } from './waterWaves.ts';
import { RIPPLE_GLSL, rippleTexture } from './waterRipples.ts';
import { LAKE_POINTS, type LakeHook } from '../track-builder/mesh/shiftStage.ts';

/** Seconds, advanced by the game loop; every water surface animates from it. */
export const WATER_CLOCK = { value: 0 };

/**
 * How wet the road is, 0..1 (the game sets it each frame from the Final Lap Shift's storm, track-builder
 * shiftStage.ts `wet`; 0 everywhere else). The PBR road (roadDetail) darkens and turns glossy with it: a
 * wet surface is darker (water fills its pores) and smoother (a film of water over the grain): Sébastien
 * Lagarde, "Water drop 3b: physically based wet surfaces" (seblagarde.wordpress.com, 2013); Mario Kart
 * World's rain leaves the road "darkened with a high-gloss" sheen (art-pipeline SOP, 26 Sept 2026).
 */
export const ROAD_WET = { value: 0 };

/**
 * Real wave geometry (research brief, 26 Sept 2026: Digital Foundry's MKW tech review — "waves have
 * real geometric undulation... with foam on the crests"), on the near-camera grid only (waterWaves.ts
 * `buildWaveGridMesh`; scene.ts adds it beside the flat far plane this same material also draws): a
 * sum of Gerstner waves (`GERSTNER_GLSL`) displaces `position` before anything else reads it, so the
 * fog, the fragment shader's `vWorld` (hence the depth-based shoreline/foam: the swell genuinely moves
 * the waterline up and down the sand) and `vCrest` (whitecaps) all follow the same displaced surface —
 * the analytic normal itself is evaluated fresh per fragment (WATER_FRAG below), not interpolated from
 * here (review, 26 Sept 2026, finding 3: "facets in the sky reflection... evaluate the Gerstner normal
 * per fragment from world xz... instead of interpolating vertex normals"). `fade` (1 near the camera, 0
 * by WAVE_FADE.far) zeroes it near the grid's own far edge, so it meets the flat plane with no seam,
 * and reduces the flat plane's own few, huge vertices (too sparse to show a swell at all) to exactly
 * their old, flat selves; `uTideFade` (Lighthouse Loop's flood tide, art-pipeline waterWaves.ts SEA_TIDE)
 * shrinks it further once the tide is in, 1 everywhere else.
 */
const WATER_VERT = `
uniform float time;
uniform float uTideFade;
varying vec3 vWorld;
varying float vCrest;
#include <fog_pars_vertex>
${GERSTNER_GLSL}
void main() {
  vec4 rest = modelMatrix * vec4(position, 1.0);
  float fade = (1.0 - smoothstep(${WAVE_FADE.near.toFixed(1)}, ${WAVE_FADE.far.toFixed(1)}, length(rest.xz - cameraPosition.xz))) * uTideFade;
  vec3 disp = lkGerstner(rest.xz, time, fade);
  vec4 w = rest + vec4(disp, 0.0);
  vWorld = w.xyz;
  vCrest = clamp(disp.y / ${WAVE_MAX_HEIGHT.toFixed(4)}, -1.0, 1.0);
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

/**
 * The sea's look knobs (surfaces.ts WATER_FRAG), tuned on stills from the chase, shore, pier and intro
 * cameras (scripts/headless/sea-look.mjs) against Mario Kart World footage (art-pipeline SOP, 26 Sept
 * 2026): how much the swell's height and the ripples' own height lift crests and deepen troughs, how
 * much the sun shades each facet, the most of the sky a facet reflects (Fresnel's cap), and the glint's
 * base roughness (Blinn-Phong m² : 2 / (n + 2)), anti-aliasing gain, far roughening, gain and ceiling
 * (over 1 it blooms), and how much of the shallow colour the Low tier's patches reach.
 */
export const SEA_LOOK = Object.freeze({
  swellCrest: 0.7, rippleCrest: 0.55, crestLift: 0.4, troughDeepen: 0.25, sunShade: 0.3,
  reflectMax: 0.62, skyFloor: 0.06, glintElevation: 0.45,
  glintM2: 0.0035, glintAA: 0.3, glintFar: 0.02, glintGain: 0.009, glintMax: 4,
  lowPatches: 0.8,
});

/**
 * MKW-style sea (research brief, 26 Sept 2026): the shoal floor and anything standing in it (a pier
 * post, a boat hull, a rock) show through crystal-clear shallow water, fading to blue with depth
 * (waterDepth.ts's `lkSceneDropBelow`/`lkWaterAlpha`/`lkWaterColorMix`, read from the scene depth
 * captured just before this material draws: art-pipeline waterDepth.ts, scene.ts renderOrder -2);
 * white foam at the shoreline (`lkWaterFoam`), broken by scrolling noise, with faint bands lapping
 * toward the shore, and whitecaps on the swell's highest crests.
 *
 * Waves you can see from the chase camera (Adam, 26 Sept 2026: "The water still looks solid and blue
 * and does not look like it has waves"; research in the art-pipeline SOP, 26 Sept 2026: Mario Kart
 * World's sea shows a ripple pattern at every distance, lighter crests over darker troughs, the sky in
 * every facet, and sun glints on the ripple tops that twinkle near the kart and become a broad sheen
 * far off): the swell's own normal (waterWaves.ts, near the course) tipped by four scrolling ripple
 * layers (waterRipples.ts: one generated, mipmapped tiling map, sampled in world space so nothing swims
 * as the camera turns); the body colour lifts on crests and deepens in troughs; the sky is reflected
 * through Schlick's Fresnel (the painted sky's own map in the PBR look, `uSkyEnv`, else this sea's
 * horizon-to-zenith gradient), capped at `REFLECT_MAX` so the far sea keeps its blue instead of
 * turning into the pale horizon: facets tipped toward the eye reflect the high, blue sky and those
 * tipped away the bright horizon, which is what makes waves read at a grazing angle; the sun's glint is
 * a Blinn-Phong lobe on the same normal, widened where the normal changes faster than the pixels can
 * hold it (specular anti-aliasing: Kaplanyan et al., "Filtering Distributions of Normals for Shading
 * Antialiasing", HPG 2016; Filament's `normalFiltering`) and with distance, so near glints are sharp
 * flecks and far ones a sheen, never a crawl of single pixels. `uHasDepth` 0 (the performance
 * governor's Low tier draws straight to the canvas, or anything about the copy is missing) keeps all
 * of that but the see-through, the depth tint and the shore foam: an opaque sea of slow deep and shallow
 * patches, never a torn or half-drawn frame.
 */
const WATER_FRAG = `
uniform float time; uniform float uTideFade; uniform vec3 deep; uniform vec3 shallow; uniform vec3 sparkle; uniform vec3 horizon; uniform vec3 zenith;
uniform vec3 sunDir; uniform vec3 glintDir; uniform float night;
uniform sampler2D uSkyEnv; uniform float uHasEnv;
varying vec3 vWorld;
varying float vCrest;
#include <fog_pars_fragment>
#include <cube_uv_reflection_fragment>
${WATER_DEPTH_GLSL}
${GERSTNER_GLSL}
${RIPPLE_GLSL}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// the sky seen along dir: the painted sky's own map (the PBR look), else this sea's own gradient from
// its horizon up to its zenith; a facet tipped so far that its reflection looks down sees the far water,
// so below the horizon it fades from the horizon to the sea's own deep tone (never the map's land shade)
vec3 lkSky(vec3 dir, float rough) {
  vec3 up = mix(horizon, zenith, sqrt(clamp(dir.y, 0.0, 1.0)));
#ifdef ENVMAP_TYPE_CUBE_UV
  if (uHasEnv > 0.5) up = textureCubeUV(uSkyEnv, normalize(vec3(dir.x, max(dir.y, ${SEA_LOOK.skyFloor.toFixed(3)}), dir.z)), rough).rgb;
#endif
  return mix(up, deep, clamp(-dir.y * 4.0, 0.0, 1.0));
}
void main() {
  vec3 toEye = cameraPosition - vWorld;
  float viewDist = length(toEye.xz);
  vec3 viewDir = normalize(toEye);
  bool haveDepth = uHasDepth > 0.5;
  float dep = lkSceneDropBelow();

  // the water's own colour: shallow turquoise to deep blue by the depth of whatever the captured scene
  // depth finds under it; without one, slow drifting patches of deep and shallow water (opaque)
  vec3 body;
  if (haveDepth) body = mix(shallow, deep, lkWaterColorMix(dep));
  else {
    vec2 p = vWorld.xz * 0.06;
    float n = noise(p + vec2(time * 0.04, time * 0.025)) * 0.6 + noise(p * 2.3 - vec2(time * 0.03, -time * 0.05)) * 0.4;
    body = mix(deep, shallow, smoothstep(0.3, 0.8, n) * ${SEA_LOOK.lowPatches.toFixed(2)});
  }

  // the surface: the swell's analytic normal (fresh per fragment from vWorld: review 26 Sept 2026,
  // finding 3; faded with distance as the vertex shader fades the swell itself) tipped by the ripples
  float fade = (1.0 - smoothstep(${WAVE_FADE.near.toFixed(1)}, ${WAVE_FADE.far.toFixed(1)}, length(vWorld.xz - cameraPosition.xz))) * uTideFade;
  vec3 gNormal = lkGerstnerNormal(vWorld.xz, time, fade);
  vec3 rip = lkRipples(vWorld.xz, time, viewDist);
  vec3 nrm = normalize(gNormal + vec3(-rip.x, 0.0, -rip.y));
  float ndv = clamp(dot(nrm, viewDir), 0.0, 1.0);

  // lighter crests (the sun through their thin tops) over darker troughs, from the swell and the ripples
  float crest = clamp(vCrest * ${SEA_LOOK.swellCrest.toFixed(2)} + rip.z * ${SEA_LOOK.rippleCrest.toFixed(2)}, -1.0, 1.0);
  body = mix(body, shallow * 1.2 + vec3(0.02, 0.05, 0.04), max(crest, 0.0) * ${SEA_LOOK.crestLift.toFixed(2)});
  body *= 1.0 - max(-crest, 0.0) * ${SEA_LOOK.troughDeepen.toFixed(2)};
  body *= ${(1 - SEA_LOOK.sunShade).toFixed(2)} + ${SEA_LOOK.sunShade.toFixed(2)} * max(dot(nrm, sunDir), 0.0);

  // the sky in every facet: Schlick's Fresnel, capped so the far sea keeps its blue
  float farK = smoothstep(30.0, 320.0, viewDist);
  vec3 sky = lkSky(reflect(-viewDir, nrm), mix(0.05, 0.3, farK));
  float F = (0.02 + 0.98 * pow(1.0 - ndv, 5.0)) * ${SEA_LOOK.reflectMax.toFixed(2)};
  vec3 c = mix(body, sky, F);

  // the sun's glint: a Blinn-Phong lobe on the same normal, widened by how fast the normal turns across
  // this pixel's neighbours and by distance, so it is sharp flecks near the kart and a sheen far off
  vec3 du = dFdx(nrm), dv = dFdy(nrm);
  float m2 = ${SEA_LOOK.glintM2.toFixed(4)} + min(${SEA_LOOK.glintAA.toFixed(2)} * (dot(du, du) + dot(dv, dv)), 0.2) + farK * ${SEA_LOOK.glintFar.toFixed(3)};
  float shin = 2.0 / m2 - 2.0;
  float glint = pow(max(dot(nrm, normalize(glintDir + viewDir)), 0.0), shin) * (shin + 2.0) * ${SEA_LOOK.glintGain.toFixed(4)};
  glint = min(glint, ${SEA_LOOK.glintMax.toFixed(1)}) * (1.0 - night * 0.55);
  c += sparkle * glint;

  float alpha = 1.0;
  if (haveDepth) {
    // what the surface reflects is not seen through it (Fresnel), and a glint shows on the clearest shallows
    alpha = max(mix(lkWaterAlpha(dep), 1.0, F), min(glint, 1.0));
    // foam: a soft line at the shoreline (and round posts, hulls and rocks: wherever the depth under the
    // surface is small), broken by scrolling noise, plus faint bands lapping toward it
    float foamBase = lkWaterFoam(dep);
    float breakup = noise(vWorld.xz * 0.8 + vec2(time * 0.18, time * 0.12)) * 0.6 + 0.4;
    float foam = foamBase * smoothstep(0.2, 0.85, breakup);
    float bandRange = ${(WATER_DEPTH.foamWidth * 3.2).toFixed(3)};
    if (dep > 0.0 && dep < bandRange) {
      float phase = fract(dep * 0.5 - time * 0.2);
      foam = max(foam, smoothstep(0.8, 1.0, phase) * (1.0 - dep / bandRange) * 0.5);
    }
    // whitecaps: lacy foam on the ripple crests of the swell's highest crests only (MKW-like: white on
    // the crests, never a solid white sheet or a milky blob where the swell peaks)
    float whitecap = smoothstep(0.55, 0.9, vCrest) * smoothstep(0.05, 0.55, rip.z + breakup - 0.6);
    foam = clamp(max(foam, whitecap * 0.7), 0.0, 1.0) * (1.0 - night * 0.3);
    c = mix(c, mix(vec3(1.0), vec3(0.82, 0.9, 1.0), night), foam);
    // foam floats on the surface: it hides what is under it
    alpha = max(alpha, foam * 0.9);
  }

  gl_FragColor = vec4(c, alpha);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;


/** The PMREM layout of the painted sky's map (look.ts SkyEnvironment, PBR.envSize): three's own cubeUV sizes for it, which a ShaderMaterial must define itself. */
function cubeUvDefines(size = PBR.envSize): Record<string, string> {
  const height = 4 * size, maxMip = Math.log2(height) - 2;
  return {
    ENVMAP_TYPE_CUBE_UV: '', CUBEUV_TEXEL_WIDTH: (1 / (3 * Math.max(2 ** maxMip, 7 * 16))).toPrecision(8),
    CUBEUV_TEXEL_HEIGHT: (1 / height).toPrecision(8), CUBEUV_MAX_MIP: `${maxMip.toFixed(1)}`,
  };
}

/** Binds the painted sky's map for the sea's reflections when there is one of the size its defines expect (the PBR look), else its own gradient. */
function bindSky(m: ShaderMaterial): void {
  const env = worldEnvironment();
  const h = (env?.image as { height?: number } | undefined)?.height;
  m.uniforms.uSkyEnv.value = env;
  m.uniforms.uHasEnv.value = env && h === 4 * PBR.envSize ? 1 : 0;
}

const WATERS: Readonly<Record<string, { deep: string; shallow: string; sparkle: string; horizon: string; zenith: string; night?: boolean }>> = Object.freeze({
  harbour: { deep: '#1b7fc0', shallow: '#46c2e6', sparkle: '#fff6dc', horizon: '#bfe8f7', zenith: '#3f96e2' },
  boardwalk: { deep: '#0a1440', shallow: '#1d3f86', sparkle: '#9fe6ff', horizon: '#6a3a9a', zenith: '#161a5c', night: true },
});

const waterCache = new Map<string, ShaderMaterial>();
const DEFAULT_SUN: readonly [number, number, number] = [0.4, 0.8, 0.3];
/**
 * The water for a biome (harbour blue by default), shared by every race on it. `sunDirection` (the
 * track's own env.sunDirection, track-builder scene.ts) sets the sun glint's direction every call —
 * not baked in once — since a mirrored race (mirror.ts) flips its x on the very same biome.
 */
export function waterMaterial(biome: string, sunDirection?: readonly [number, number, number]): ShaderMaterial {
  // a stale tide from a previous race (Harbour's own, or anyone's before it) must never leak into this
  // one: every scene build calls this once (scene.ts), cache hit or not, so this always runs first
  SEA_TIDE.rise.value = 0;
  const key = WATERS[biome] ? biome : 'harbour';
  let m = waterCache.get(key);
  if (!m) {
    const w = WATERS[key];
    m = new ShaderMaterial({
      vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, fog: true, transparent: true, depthWrite: true,
      defines: cubeUvDefines(),
      uniforms: UniformsUtils.merge([UniformsLib.fog, waterDepthUniforms(), {
        time: { value: 0 }, deep: { value: new Color(w.deep) }, shallow: { value: new Color(w.shallow) },
        sparkle: { value: new Color(w.sparkle) }, horizon: { value: new Color(w.horizon) }, zenith: { value: new Color(w.zenith) },
        sunDir: { value: new Vector3(...DEFAULT_SUN).normalize() }, glintDir: { value: new Vector3(0, 1, 0) }, night: { value: w.night ? 1 : 0 },
        uSkyEnv: { value: null }, uHasEnv: { value: 0 },
      }]),
    });
    m.uniforms.time = WATER_CLOCK; // one clock for every water surface
    m.uniforms.uTideFade = SEA_TIDE.scale; // 1 with no tide; shrinks as Harbour's own flood comes in
    m.uniforms.uRipple = { value: rippleTexture() }; // shared, never cloned per material
    m.userData.shared = true;
    // track-builder's scene.ts calls these generically (any material may want a hand in its mesh, or
    // a companion mesh added beside it), without importing anything from art-pipeline; the flat sea
    // draws first (renderOrder -2), so its hook copies the scene depth and binds the sky map for both
    m.userData.attachDepth = (mesh: Object3D) => {
      const depth = waterDepthHook(m!);
      mesh.onBeforeRender = (renderer, scene, camera) => { depth(renderer, scene, camera); bindSky(m!); };
    };
    m.userData.waveGrid = (waterY: number) => buildWaveGridMesh(m!, waterY);
    // a generic hook (track-builder never imports art-pipeline): the sea as the shader draws it at
    // (x, z) for a floating decor instance (a boat) to ride each frame, seen from a camera at (eyeX,
    // eyeZ): the same Gerstner sum on the same clock (WATER_CLOCK), faded with distance from the camera
    // as the vertex shader fades it, times the tide scale uTideFade reads, plus the tide's own rise (a
    // boat floats, it does not merely shrink: review, 26 Sept 2026, finding 2)
    m.userData.floatRide = (x: number, z: number, eyeX: number, eyeZ: number) => {
      const r = gerstnerRide(x, z, WATER_CLOCK.value), s = waveFade(Math.hypot(x - eyeX, z - eyeZ)) * SEA_TIDE.scale.value;
      return { y: r.y * s + SEA_TIDE.rise.value, slopeX: r.slopeX * s, slopeZ: r.slopeZ * s };
    };
    waterCache.set(key, m);
  }
  const [sx, sy, sz] = sunDirection ?? DEFAULT_SUN;
  (m.uniforms.sunDir.value as Vector3).set(sx, sy, sz).normalize();
  glintDirection(m.uniforms.sunDir.value as Vector3, m.uniforms.glintDir.value as Vector3);
  return m;
}

/**
 * The sun's glint comes from the sun's own bearing but never from higher than SEA_LOOK.glintElevation
 * (radians) over the horizon: the courses' suns stand 45-60° up, so their true reflection lies under
 * the chase camera, out of sight; lowered, the glitter runs down the middle distance toward the sun, as
 * Mario Kart World's does ("a concentrated band of shimmering white sun glints aligned toward the light
 * source", art-pipeline SOP 26 Sept 2026). The sky's own reflection keeps the true sun.
 */
export function glintDirection(sun: Vector3, out: Vector3): Vector3 {
  const flat = Math.hypot(sun.x, sun.z), up = Math.min(Math.atan2(sun.y, flat), SEA_LOOK.glintElevation);
  if (flat < 1e-6) return out.set(0, 1, 0);
  return out.set((sun.x / flat) * Math.cos(up), Math.sin(up), (sun.z / flat) * Math.cos(up));
}

/** Painted ground per biome (public/textures/<name>.webp) and how many metres one tile covers. */
const GROUNDS: Readonly<Record<string, { file: string; metres: number }>> = Object.freeze({
  meadow: { file: 'grass', metres: 14 },
  canyon: { file: 'sand', metres: 16 },
  frost: { file: 'snow', metres: 16 },
});

const texCache = new Map<string, Texture>();
/** Each painted texture's load, for what is made from its pixels (the PBR look's detail maps: detail.ts). */
const texLoads = new Map<string, Promise<Texture>>();
function texture(file: string): Texture {
  let t = texCache.get(file);
  if (!t) {
    // no page (headless tests): an empty texture, nothing to load
    let loaded: (tex: Texture) => void = () => undefined;
    if (typeof document !== 'undefined') texLoads.set(file, new Promise<Texture>((r) => { loaded = r; }));
    t = typeof document === 'undefined' ? new Texture() : new TextureLoader().load(`${import.meta.env?.BASE_URL ?? '/'}textures/${file}.webp`, (tex) => loaded(tex));
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = MirroredRepeatWrapping;
    t.anisotropy = 8;
    t.userData.shared = true;
    texCache.set(file, t);
  }
  return t;
}

const detailCache = new Map<string, Texture>();
/** A painted texture's relief (detail.ts), made from its pixels once they are in: the PBR look's fine normals. Shared. */
export function detailMap(file: string): Texture {
  let d = detailCache.get(file);
  if (!d) {
    texture(file);
    d = detailTexture(texLoads.get(file) ?? null);
    detailCache.set(file, d);
  }
  return d;
}

/**
 * How far the ground, the land and the road keep some of their painted relief before the surface
 * goes dead flat (the view-space distance `lkBend`'s caller fades it over). The ask that found this
 * (Adam, 25 Sept 2026: "the lawn ... goes back to flat paint") measured it gone by 60 m on the ground
 * and 40 m on the road — well short of a long straight or a wide view, and long before the scene's
 * own fog even starts (140 m, main.ts), so there was a dead band of flat, unhazed colour in between.
 * Atmospheric haze (look.ts HAZE) now carries the far distance; these just keep the near-to-mid ground
 * honest so the two hand off with nothing flat showing between them.
 */
export const GROUND_RELIEF_FAR: readonly [number, number] = [50, 320];
export const ROAD_RELIEF_FAR: readonly [number, number] = [30, 170];

/**
 * GLSL the PBR look's surfaces share: a detail map's relief at a (mirrored) tile position
 * as a tangent-space normal (x along world +X, y along world +Z; `flip` -1 where v runs along -Z), and a
 * view-space normal bent by such a relief laid flat in the world. A face far from level takes less of
 * it (a cliff keeps its own shading) and never a NaN.
 */
const LOOK_GLSL = `
vec2 lkSlope(sampler2D map, vec2 uv) {
  vec2 s = (texture2D(map, uv).rg - 0.50196) * 2.0;
  return s * (1.0 - 2.0 * mod(floor(uv), 2.0));
}
vec3 lkBend(vec3 n, vec2 slope, float flip) {
  vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  slope *= smoothstep(0.45, 0.8, dot(n, up));
  vec3 tx = (viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz, tz = (viewMatrix * vec4(0.0, 0.0, flip, 0.0)).xyz;
  vec3 t = tx - n * dot(n, tx), b = tz - n * dot(n, tz);
  float lt = length(t), lb = length(b);
  t = lt > 1e-4 ? t / lt : vec3(0.0);
  b = lb > 1e-4 ? b / lb : vec3(0.0);
  return normalize(t * slope.x + b * slope.y + n * sqrt(max(1e-4, 1.0 - dot(slope, slope))));
}`;

/**
 * Frostbite's snow (detail review, 24 Sept 2026: "flat pure white"): soft blue hollows, wind ripples
 * and a glint of sparkle near the camera, in world space on the ground plane and on the land under
 * the road alike, so the two meet with no seam. Same draw calls, same textures.
 */
const SNOW_PARS = `varying vec3 vSnowW;
float snowHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float snowNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(snowHash(i), snowHash(i + vec2(1.0, 0.0)), u.x), mix(snowHash(i + vec2(0.0, 1.0)), snowHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;
const SNOW_FRAG = `{
  vec2 w = vSnowW.xz;
  float view = length(cameraPosition.xz - w);
  // soft blue hollows and drifts, two sizes
  float n = snowNoise(w * 0.028) * 0.65 + snowNoise(w * 0.085 + 7.0) * 0.35;
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.58, 0.71, 0.97), smoothstep(0.4, 0.72, n) * 0.85);
  // wind ripples: thin cool shadow lines across the wind, bent by the drifts, fading with distance
  float ripple = sin(dot(w, vec2(0.83, 0.55)) * 1.25 + snowNoise(w * 0.05) * 6.0);
  diffuseColor.rgb *= 1.0 - 0.22 * smoothstep(0.55, 0.97, ripple) * (1.0 - smoothstep(30.0, 110.0, view)) * vec3(1.0, 0.7, 0.3);
  // sparkle: a few ice glints near the camera, bright enough for the bloom
  vec2 cell = floor(w * 2.2), f = fract(w * 2.2) - 0.5;
  float glint = step(0.986, snowHash(cell)) * (1.0 - smoothstep(0.04, 0.1, length(f))) * (1.0 - smoothstep(12.0, 40.0, view));
  totalEmissiveRadiance += vec3(0.85, 0.93, 1.0) * glint * 1.4;
}`;
/**
 * Frostbite's lake along the crossing its Final Lap Shift opens (the stage sets it per race: track-builder
 * mesh/shiftStage.ts frozenLake): painted on the snow, ground and land alike, no draw of its own. Open
 * water with drifting floes until the shift, then ice spreading out from the crossing behind a bright
 * front (reduced motion: faded in). Its shore keeps clear of every open road's course limit.
 */
export const FROST_LAKE: LakeHook = { path: { value: new Float32Array(4 * LAKE_POINTS) }, count: { value: 0 }, front: { value: -1 }, fade: { value: 0 } };

const LAKE_PARS = `uniform vec4 uLake[${LAKE_POINTS}];
uniform float uLakeN;
uniform float uLakeFront;
uniform float uLakeFade;
uniform float uLakeClock;`;
const LAKE_FRAG = `if (uLakeN > 1.5) {
  vec2 w = vSnowW.xz;
  float sd = 1e5, dm = 1e5;
  for (int i = 0; i < ${LAKE_POINTS - 1}; i++) {
    if (float(i) + 1.5 > uLakeN) break;
    vec4 a = uLake[i], b = uLake[i + 1];
    if (a.z <= 0.0 && b.z <= 0.0) continue;
    vec2 ab = b.xy - a.xy;
    float h = clamp(dot(w - a.xy, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    float d = length(w - a.xy - ab * h);
    sd = min(sd, d - mix(a.z, b.z, h));
    dm = min(dm, d);
  }
  // a ragged shore
  sd += (snowNoise(w * 0.07) - 0.5) * 7.0 + (snowNoise(w * 0.21) - 0.5) * 2.0;
  if (sd < 0.0) {
    float ice = max(step(dm, uLakeFront), uLakeFade);
    // open water, deep and dark out in the middle, with floes of old ice drifting on it
    vec3 water = mix(vec3(0.17, 0.38, 0.5), vec3(0.05, 0.16, 0.28), smoothstep(0.0, 10.0, -sd));
    vec2 fl = w * 0.11 + vec2(uLakeClock * 0.02, uLakeClock * 0.013);
    float floe = smoothstep(0.6, 0.64, snowNoise(fl) * 0.7 + snowNoise(fl * 2.7) * 0.3);
    water = mix(water, vec3(0.86, 0.93, 0.98), floe);
    // ice: pale blue with white cracks
    float cn = snowNoise(w * 0.16);
    float crack = 1.0 - smoothstep(0.0, 0.05 + fwidth(cn) * 1.5, abs(cn - 0.5));
    vec3 iceC = mix(vec3(0.74, 0.88, 0.98), vec3(0.6, 0.79, 0.95), snowNoise(w * 0.05));
    iceC = mix(iceC, vec3(0.97, 0.99, 1.0), crack * 0.8);
    float shore = smoothstep(-1.4, 0.0, sd);
    diffuseColor.rgb = mix(mix(water, iceC, ice), vec3(0.95, 0.97, 1.0), shore * 0.6);
    // the frost's front: a bright band racing out across the water
    float band = uLakeFront > 0.0 && uLakeFade < 0.5 ? 1.0 - smoothstep(0.0, 2.4, abs(dm - uLakeFront)) : 0.0;
    totalEmissiveRadiance += vec3(0.7, 0.85, 1.0) * band * 1.3 * (1.0 - shore);
    // glints on the new ice
    totalEmissiveRadiance += vec3(0.8, 0.9, 1.0) * ice * step(0.985, snowHash(floor(w * 1.7))) * 0.9;
  }
}`;

/** Add the snow (and Frostbite's lake) to a toon material's shader (it needs `transformed` and `totalEmissiveRadiance`). */
function snowShader(shader: { vertexShader: string; fragmentShader: string; uniforms?: Record<string, { value: unknown }> }): void {
  if (shader.uniforms) Object.assign(shader.uniforms, { uLake: FROST_LAKE.path, uLakeN: FROST_LAKE.count, uLakeFront: FROST_LAKE.front, uLakeFade: FROST_LAKE.fade, uLakeClock: WATER_CLOCK });
  shader.vertexShader = `varying vec3 vSnowW;\n${shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSnowW = (modelMatrix * vec4(transformed, 1.0)).xyz;')}`;
  shader.fragmentShader = `${SNOW_PARS}\n${LAKE_PARS}\n${shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SNOW_FRAG}\n${LAKE_FRAG}`)}`;
}

/**
 * The PBR look's ground (look.ts), per biome: how its top varies across the land in world space (two
 * noise octaves, `size` metres the big one: `lush` and `dry` multiply the texture, `vary` how much), how
 * rough it is, how strong its relief (the texture's own, detail.ts), how much richer its colour (`sat`),
 * its share of the sky's light (`env`) and how much of its sheen it keeps (`spec`: a lawn's sheen of the
 * sun and a pale sky washed it out toward the sun). A beach, dirt and snow take theirs from COASTS. None
 * for a biome that has no ground of its own.
 */
export interface GroundLook { lush: string; dry: string; vary: number; size: number; rough: number; relief: number; sat: number; env: number; spec: number }
const GROUND_LOOKS: Readonly<Record<string, GroundLook>> = Object.freeze({
  harbour: { lush: '#b2d69a', dry: '#f6f1c8', vary: 0.6, size: 30, rough: 0.96, relief: 0.8, sat: 1.1, env: 0.26, spec: 0.3 },
  meadow: { lush: '#b0d496', dry: '#f6efc2', vary: 0.64, size: 34, rough: 0.96, relief: 0.8, sat: 1.1, env: 0.26, spec: 0.3 },
  canyon: { lush: '#ffd8c2', dry: '#fff2dc', vary: 0.4, size: 60, rough: 0.93, relief: 0.7, sat: 1.05, env: 0.34, spec: 0.6 },
  frost: { lush: '#ffffff', dry: '#ffffff', vary: 0, size: 60, rough: 0.8, relief: 0.5, sat: 1, env: 0.45, spec: 1 },
  boardwalk: { lush: '#ffffff', dry: '#ffffff', vary: 0, size: 60, rough: 0.85, relief: 0.6, sat: 1, env: 0.4, spec: 0.8 },
});

/** GLSL: `c` made `k` times as colourful about its own grey (never below black). */
const SATURATE = 'vec3 lkSaturate(vec3 c, float k) { return max(mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, k), 0.0); }';

/** The ground look of a biome (a lawn's by default). */
export const groundLook = (biome: string): GroundLook => GROUND_LOOKS[biome] ?? GROUND_LOOKS.meadow;

/**
 * GLSL for either stage: value noise, and the ground's variation across the land (GROUND_LOOKS) at world
 * `w`, as a tint to multiply by with `vary` of it. The ground, the land and the tufts on it (grass.ts)
 * read the same, so a tuft is the shade of the lawn under it.
 */
export const NOISE_GLSL = `
float lkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lkNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(lkHash(i), lkHash(i + vec2(1.0, 0.0)), u.x), mix(lkHash(i + vec2(0.0, 1.0)), lkHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 lkGroundTint(vec2 w, vec3 lush, vec3 dry, float size, float vary) {
  float n = lkNoise(w / size) * 0.62 + lkNoise(w * (3.7 / size) + 11.3) * 0.38;
  return mix(vec3(1.0), mix(lush, dry, smoothstep(0.3, 0.7, n)), vary);
}
${SATURATE}`;

const groundCache = new Map<string, Material>();
/**
 * The ground under a track: water for the sea tracks, a painted texture for the land ones, or
 * undefined to keep the scene's flat toon colour. `size` is the ground plane's side in metres.
 * In the PBR look (look.ts) the painted ground is a rough MeshStandardMaterial that varies across the
 * land and carries the texture's own relief.
 */
export function groundMaterial(biome: string, kind: string, size: number, sunDirection?: readonly [number, number, number]): Material | undefined {
  if (kind === 'water') return waterMaterial(biome, sunDirection);
  const g = GROUNDS[biome];
  if (!g || kind !== 'plane') return undefined;
  const key = `${biome}:${size}:${look()}`;
  let m = groundCache.get(key);
  if (!m) {
    // every ground plane is the same size, so the shared texture carries the repeat itself
    const t = texture(g.file);
    t.repeat.set(size / g.metres, size / g.metres);
    if (isPbr()) m = pbrGround(biome, t, g.file);
    else {
      m = new MeshToonMaterial({ color: 0xffffff, map: t, gradientMap: toonRamp() });
      if (biome === 'frost') {
        m.onBeforeCompile = snowShader;
        m.customProgramCacheKey = () => 'ground-snow';
      }
    }
    m.userData.shared = true;
    groundCache.set(key, m);
  }
  return m;
}

/** The PBR look's ground plane: its texture varied across the land, rough, with its own relief (sampled as the texture is, so they match). */
function pbrGround(biome: string, map: Texture, file: string): MeshStandardMaterial {
  const gl = groundLook(biome);
  const m = new MeshStandardMaterial({ color: 0xffffff, map, roughness: gl.rough, metalness: 0 });
  const uniforms = { uRelief: { value: detailMap(file) }, uLush: { value: new Color(gl.lush) }, uDry: { value: new Color(gl.dry) } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 vLkW;\n${shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vLkW = (modelMatrix * vec4(transformed, 1.0)).xyz;')}`;
    shader.fragmentShader = `uniform sampler2D uRelief; uniform vec3 uLush; uniform vec3 uDry; varying vec3 vLkW;\n${NOISE_GLSL}\n${LOOK_GLSL}\n${shader.fragmentShader}`
      .replace('#include <map_fragment>', `#include <map_fragment>
  diffuseColor.rgb = lkSaturate(diffuseColor.rgb * lkGroundTint(vLkW.xz, uLush, uDry, ${gl.size.toFixed(1)}, ${gl.vary.toFixed(2)}), ${gl.sat.toFixed(2)});`)
      // the plane's v runs along -Z (PlaneGeometry turned flat)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  normal = lkBend(normal, lkSlope(uRelief, vMapUv) * ${gl.relief.toFixed(2)} * (1.0 - smoothstep(${GROUND_RELIEF_FAR[0].toFixed(1)}, ${GROUND_RELIEF_FAR[1].toFixed(1)}, length(vViewPosition))), -1.0);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  reflectedLight.directSpecular *= ${gl.spec.toFixed(2)};
  reflectedLight.indirectSpecular *= ${gl.spec.toFixed(2)};`);
    if (biome === 'frost') snowShader(shader);
  };
  m.customProgramCacheKey = () => `ground-pbr-${biome}`;
  m.userData.lookEnv = gl.env;
  return litWorld(m);
}

/** Start loading every painted surface now, so no race opens on a black ground while one arrives. */
export function preloadSurfaces(): void {
  for (const g of Object.values(GROUNDS)) texture(g.file);
  texture('asphalt');
}

/** The road's fine grain (a neutral grey, so each biome's road colour shows through), repeating along the track. */
export function roadGrain(): Texture {
  const t = texture('asphalt');
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/**
 * How each biome's road has worn (critique of 24 Sept 2026: "flat, uniform grey with no specular or
 * wear"). `wear`: the two darker, polished bands where the karts run; `cracks` and `patches`: fine
 * cracks and repaired rectangles; `sheen` and `shine`: the sun's glint (strength, tightness);
 * `sand`/`frost`: the biome creeping in from the edges; `seams`: panel joints across a sky road;
 * `wet`: a wet deck's sheen of the night sky at low angles, in `wetTint`.
 */
export interface RoadLook {
  wear: number; cracks: number; patches: number; sheen: number; shine: number;
  sand?: string; frost?: number; seams?: number; wet?: number; wetTint?: string;
  /** a neon edge's light spilling onto the deck beside it (Boardwalk) */
  spill?: string;
  /**
   * The large features a player reads from the chase camera (27 Sept 2026, review item 4: "the road is
   * one flat color"; Mario Kart World's roads carry rubbered racing lines, patched and resealed
   * asphalt, tar seams and sand spilling over the edge: youtube.com/watch?v=ngiIINHSiJc 2:15, 2:24,
   * 2:46; Moo Moo Meadows AFN7RL6qEZI 0:40, Desert Hills jBK-cunGXlk 0:35, DK Pass Il2hmsFCM88 0:35).
   * `tone`: long stretches (60 to 150 m) a shade apart, ± this share; `reseal`: the share of 44 m
   * stretches holding a resealed section (the whole width, a half or a lane) in `resealTint`, or an
   * older paler patch, each with a tar seam round it; `seal`: tar-sealed cracks wandering along the lane
   * joints, this dark; `dust`/`dustWidth`/`dustAmount`: the biome's dust or dirt blown onto the road's
   * edges; `puddles`: dark damp spots (Windmill Run), or with `puddleTint` (a multiplier) and `puddleGloss`
   * (the PBR look's roughness there: kept rough, or they catch the sun as white blotches) Frostbite's packed,
   * polished patches (faint: never to be read as the sim's ice); `line`: how much darker
   * the rubbered racing line is (the PBR look), `lineTint` its colour (Frostbite's packed, icy snow).
   */
  tone?: number; reseal?: number; resealTint?: readonly [number, number, number]; resealGloss?: number; seal?: number;
  dust?: string; dustWidth?: number; dustAmount?: number; puddles?: number; puddleTint?: readonly [number, number, number]; puddleGloss?: number;
  line?: number; lineTint?: string;
  /**
   * Each place's own road (28 Sept 2026; the second fresh-eyes review, item 3: "five of six tracks run on the same gray
   * highway with lane dashes, so a farm, a desert and a snowy pass look alike underfoot"; Mario Kart World's road
   * belongs to its place: its desert course's sand drifted over the road, youtube.com/watch?v=OSU-aguh1AY 2:26; its
   * farm road rutted and tire-streaked, 1:29:15). `drift`/`driftAmount`/`driftTint`: sand blown across the road in
   * drifts slanting with the wind, the whole road filmed with it (`driftTint`), swept clearer along the karts' line
   * (Mesa Rush's red dust); `snow`: a dusting of snow over the road, thick in drifts and banked at the edges, packed
   * smooth and gray-blue into the karts' wheel tracks, never over the sim's ice, which reads clearer and glossier
   * (Frostbite Pass); `gutter`/`gutterTint`: metres of cobbled gutter along each edge, and `bricks`/`brickTint`: the
   * share of 160 m stretches holding a brick-paved square across the road (Lighthouse Loop's seaside town).
   */
  drift?: string; driftAmount?: number; driftTint?: number; snow?: number;
  gutter?: number; gutterTint?: string; bricks?: number; brickTint?: string;
  /** a clean sky road (Skyline Circuit): this gold laid over the asphalt's grain, `gildAmount` of the way, polished (the PBR look's roughness `gildGloss`) */
  gild?: string; gildAmount?: number; gildGloss?: number;
  /** how much of the surface's own fine relief shows in the PBR look's normal (1; a clean sky road less) */
  grain?: number;
}
export const ROAD_LOOKS: Readonly<Record<string, RoadLook>> = Object.freeze({
  // a seaside town's street: lighter, sun-bleached asphalt, a cobbled gutter along each curb, now and then a brick-paved square
  harbour: { wear: 1, cracks: 0.45, patches: 0.6, sheen: 0.16, shine: 22, tone: 0.06, reseal: 0.35, resealTint: [0.8, 0.8, 0.84], seal: 0.4, dust: '#e2d6b4', dustWidth: 1.0, dustAmount: 0.45, line: 0.24, gutter: 0.55, gutterTint: '#b3a794', bricks: 0.55, brickTint: '#b0604a' },
  // a country lane: warm, patched and patched again, cracked, no lines, the farm's dirt on its edges and in its tire tracks
  meadow: { wear: 0.9, cracks: 0.9, patches: 1, sheen: 0.12, shine: 16, tone: 0.1, reseal: 0.8, resealTint: [0.8, 0.76, 0.72], seal: 0.6, dust: '#a88a60', dustWidth: 2.6, dustAmount: 0.8, puddles: 1, puddleGloss: 0.84, line: 0.26, lineTint: '#8a6a48' },
  // a desert road under red dust: filmed all over, drifted across in the wind, swept darker where the karts run
  canyon: { wear: 0.85, cracks: 0.8, patches: 0.2, sheen: 0.08, shine: 12, sand: '#e39a62', tone: 0.08, reseal: 0.2, resealTint: [0.82, 0.74, 0.7], seal: 0.35, line: 0.34, drift: '#e9a46c', driftAmount: 0.85, driftTint: 0.18 },
  // a mountain pass under snow: dusted, banked at the edges, packed into the wheel tracks; the ice clear and glossy
  frost: { wear: 0.7, cracks: 0.25, patches: 0, sheen: 0.32, shine: 42, frost: 0.55, tone: 0.05, line: 0.22, lineTint: '#9fb4d6', snow: 1 },
  // a clean golden sky road: gilded panels, no wear to speak of
  skyline: { wear: 0.35, cracks: 0, patches: 0, sheen: 0.36, shine: 34, seams: 1, tone: 0.03, line: 0.1, lineTint: '#d9a83e', gild: '#e8c46e', gildAmount: 0.55, gildGloss: 0.52, grain: 0.35 },
  boardwalk: { wear: 0.45, cracks: 0, patches: 0, sheen: 0.4, shine: 70, wet: 0.75, wetTint: '#8a6cff', spill: '#2fd8ff', tone: 0.05, line: 0.2 },
});

const WEAR_PARS = `varying vec3 vWearW;
uniform vec3 uSand; uniform vec3 uWetTint; uniform vec3 uSpill; uniform vec3 uResealTint; uniform vec3 uDust; uniform vec3 uPuddleTint;
uniform vec3 uDrift; uniform vec3 uGutter; uniform vec3 uBrick; uniform vec3 uGild;
#ifndef STANDARD
varying vec2 vLane;
#endif
float rwHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rwNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(rwHash(i), rwHash(i + vec2(1.0, 0.0)), u.x), mix(rwHash(i + vec2(0.0, 1.0)), rwHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// distance to the nearest cell wall of a jittered grid (0 on a crack)
float rwCrack(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(rwHash(i + g), rwHash(i + g + 17.3));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return d2 - d1;
}
#ifdef PUDDLES
// a damp spot on the road at world xz (x: metres across from the middle, hw: the half-width), 0..1, anti-aliased
float rwPuddle(vec2 w, float x, float hw) {
  vec2 q = w + (vec2(rwNoise(w * 0.21 + 3.3), rwNoise(w * 0.21 + 9.1)) - 0.5) * 3.0;
  float p = rwNoise(q * 0.42 + 1.3) * 0.6 + rwNoise(q * 1.1 + 7.7) * 0.4;
  p += 0.07 * (1.0 - smoothstep(0.5, 3.0, hw - abs(x)));
  float aa = fwidth(p) * 1.5 + 0.004;
  return smoothstep(0.735 - aa, 0.735 + aa, p);
}
#endif`

/**
 * The road's large features, read from the chase camera (RoadLook tone, reseal, seal, dust, puddles):
 * everything a metre or more across, or, where thin (a seam, a sealed crack), anti-aliased by its own
 * pixel width and gone by 80 m, so nothing shimmers far off. Metres along and across the road from the
 * ribbon (vRoad, and vLane.y its half-width). Inside WEAR_ALBEDO's road block (rw, rwView, rwClean).
 */
const WEAR_BIG = `{
  float rbHw = max(vLane.y, 2.0), rbAlong = vRoad.y * 10.0, rbX = (vRoad.x - 0.5) * 2.0 * rbHw;
  float rbThin = 1.0 - smoothstep(35.0, 80.0, rwView);
#ifdef TONE
  // long stretches laid at different times, a shade apart every 60 to 150 m
  diffuseColor.rgb *= 1.0 + TONE * (rwNoise(vec2(rbAlong * 0.011, 7.3)) * 2.0 - 1.0);
#endif
#ifdef RESEAL
  {
    // resealed sections, road-aligned: now and then a stretch 8 to 26 m long of fresh asphalt across the
    // whole width (past both edges, so no seam runs along a curb), one half or one lane, or an older paler
    // patch, each ringed by a tar seam
    float cellL = 44.0, cell = floor(rbAlong / cellL);
    float has = step(1.0 - RESEAL, rwHash(vec2(cell, 11.7)));
    float len = 8.0 + 18.0 * rwHash(vec2(cell, 2.9));
    float c0 = (cell + 0.5) * cellL + (rwHash(vec2(cell, 8.3)) - 0.5) * (cellL - len - 6.0);
    float w = rwHash(vec2(cell, 6.6));
    float xm = w < 0.45 ? 0.0 : w < 0.75 ? sign(w - 0.6) * (rbHw * 0.5 + 0.5) : (rwHash(vec2(cell, 3.3)) - 0.5) * rbHw;
    float xw = w < 0.45 ? rbHw + 2.0 : w < 0.75 ? rbHw * 0.5 + 0.5 : 1.9;
    vec2 q = vec2(abs(rbAlong - c0) - len * 0.5, abs(rbX - xm) - xw);
    float box = max(q.x, q.y), aa = fwidth(box) + 0.01;
    float inside = (1.0 - smoothstep(-aa, aa, box)) * has * rwClean;
    float seam = (1.0 - smoothstep(0.05, 0.05 + aa * 1.5, abs(box))) * has * rwClean * rbThin;
    vec3 tint = rwHash(vec2(cell, 4.1)) < 0.62 ? uResealTint : vec3(1.05, 1.05, 1.03);
    diffuseColor.rgb *= mix(vec3(1.0), tint, inside) * (1.0 - 0.32 * seam);
  #if defined(STANDARD) && defined(RESEAL_GLOSS)
    roughnessFactor = mix(roughnessFactor, RESEAL_GLOSS, inside);
  #endif
  }
#endif
#ifdef SEAL
  {
    // tar-sealed cracks: dark lines wandering along the two lane joints, in pieces
    float side = rbX > 0.0 ? 1.0 : 0.0;
    float lx = abs(rbX) - rbHw * 0.5 + 1.1 * (rwNoise(vec2(rbAlong * 0.045, 1.7 + side * 3.6)) - 0.5) + 0.35 * (rwNoise(vec2(rbAlong * 0.27, 9.2 + side)) - 0.5);
    float on = smoothstep(0.45, 0.6, rwNoise(vec2(rbAlong * 0.035, 3.3 + side * 5.5)));
    float aa = fwidth(lx) * 1.2 + 0.004;
    float line = (1.0 - smoothstep(0.04 - aa, 0.04 + aa, abs(lx))) * on * rbThin * rwClean;
    diffuseColor.rgb *= 1.0 - SEAL * line;
  }
#endif
#ifdef DUST
  {
    // the land's dust and dirt blown onto the edges, in drifts
    float e = rbHw - abs(rbX), side = rbX > 0.0 ? 1.0 : 0.0;
    float reach = max(0.3, DUST_W * (0.55 + 0.9 * rwNoise(vec2(rbAlong * 0.08, 2.0 + side * 4.0))));
    float dust = (1.0 - smoothstep(0.0, reach, e)) * (0.55 + 0.45 * rwNoise(rw * 0.6));
    float grain = mix(0.5, rwNoise(rw * 2.1), rbThin);
    diffuseColor.rgb = mix(diffuseColor.rgb, uDust * (0.9 + 0.2 * grain), dust * DUST_A * rwClean);
  }
#endif
#ifdef PUDDLES
  {
    // dark damp spots where the rain collects, more of them by the edges; a smooth, faintly glossy film in the PBR look
    float pud = rwPuddle(rw, rbX, rbHw) * rwClean * PUDDLES;
    diffuseColor.rgb *= mix(vec3(1.0), uPuddleTint, pud);
  #ifdef STANDARD
    roughnessFactor = mix(roughnessFactor, PUDDLE_GLOSS, pud);
  #endif
  }
#endif
  // (metres from the karts' line: road.ts racingLine, as the PBR look's own line reads it)
  float rbLat = (vRoad.x - vLane.x) * 2.0 * rbHw;
#ifdef DRIFT
  {
    // red dust: a film over the whole road, and sand blown across it in drifts slanting with the wind, banked at the
    // edges; the karts' tires sweep their line clearer (it shows the darker road under the dust)
    float swept = exp(-rbLat * rbLat * 0.2);
    float slant = rbAlong * 0.55 + rbX * 0.85;
    float d = rwNoise(vec2(slant * 0.075, rbAlong * 0.011 + 3.1)) * 0.62 + rwNoise(vec2(slant * 0.23, rbX * 0.21 + 9.4)) * 0.38;
    float drift = smoothstep(0.5, 0.74, d) * (1.0 - 0.8 * swept);
    drift = max(drift, (1.0 - smoothstep(0.0, 2.4, rbHw - abs(rbX))) * 0.9);
    float grain = mix(0.5, rwNoise(rw * 1.9), rbThin);
    // wind ripples across a drift, near the lens only (gone well before they could shimmer)
    float rip = sin(slant * 5.5 + 3.0 * rwNoise(vec2(slant * 0.4, rbX * 0.3))) * (1.0 - smoothstep(6.0, 22.0, rwView));
    vec3 dust = uDrift * (0.88 + 0.24 * grain) * (1.0 - 0.07 * rip * drift);
    float film = DRIFT_TINT * (1.0 - 0.6 * swept);
    diffuseColor.rgb = mix(diffuseColor.rgb, dust, (film + (1.0 - film) * drift) * DRIFT * rwClean);
  #ifdef STANDARD
    roughnessFactor = mix(roughnessFactor, 0.97, drift * DRIFT * rwClean);
  #endif
  }
#endif
#ifdef SNOWROAD
  {
    // the sim's ice (the ribbon's own pale blue, far brighter than any road) stays ice: clearer, bluer, glossy, crazed
    // with fine white cracks; everywhere else a dusting of snow, thick in drifts and banked at the edges, packed smooth
    // and gray-blue into two pairs of wheel tracks along the karts' line
    float ice = smoothstep(0.62, 0.74, dot(vColor.rgb, vec3(0.2126, 0.7152, 0.0722)));
    float tracks = 0.0;
    for (int p = 0; p < 2; p++) {
      float off = float(p) * 1.5 - 0.4;
      for (int k = 0; k < 2; k++) {
        float d = rbLat - off - (float(k) * 1.24 - 0.62) - 0.12 * sin(rbAlong * 0.09 + float(p) * 2.3);
        tracks += exp(-d * d * 7.0) * (p == 0 ? 1.0 : 0.55);
      }
    }
    tracks = min(tracks, 1.0);
    // a dusting, not a snowfield: blown into streaks along the road and lying in drifts here and there, the cold
    // road showing between (it must still read as the road against the snowbanks)
    float n = rwNoise(rw * 0.08 + 5.0) * 0.7 + rwNoise(rw * 0.31 + 1.7) * 0.3;
    float streak = rwNoise(vec2(rbAlong * 0.045, rbX * 0.75 + 2.0)) * 0.65 + rwNoise(vec2(rbAlong * 0.17, rbX * 1.9 + 8.0)) * 0.35;
    float dusting = max(smoothstep(0.52, 0.78, n) * 0.85, smoothstep(0.5, 0.74, streak) * 0.62);
    dusting = max(dusting, 1.0 - smoothstep(0.2, 1.4, rbHw - abs(rbX)));
    dusting *= 1.0 - 0.9 * tracks;
    float grain = mix(0.5, rwNoise(rw * 3.1), rbThin);
    // (linear: the powder reads near white, the packed tracks a pale blue-gray, the road a cold slate between them)
    vec3 powder = vec3(0.8, 0.86, 0.96) * (0.93 + 0.12 * grain);
    vec3 packed = vec3(0.42, 0.5, 0.63) * (0.94 + 0.1 * rwNoise(vec2(rbAlong * 0.3, rbLat * 2.0)));
    vec3 snowy = mix(diffuseColor.rgb, vec3(0.13, 0.17, 0.24), 0.55 * SNOWROAD);
    snowy = mix(snowy, powder, dusting * SNOWROAD);
    snowy = mix(snowy, packed, tracks * 0.8 * SNOWROAD);
    float ck = rwCrack(rw * 0.35);
    float crack = (1.0 - smoothstep(0.0, max(0.035, fwidth(ck) * 1.5), ck)) * rbThin;
    vec3 icy = diffuseColor.rgb * vec3(0.62, 0.84, 1.05) + vec3(0.2, 0.24, 0.28) * crack;
    diffuseColor.rgb = mix(snowy, icy, ice * rwClean);
  #ifdef STANDARD
    roughnessFactor = mix(roughnessFactor, 0.94, dusting * SNOWROAD * (1.0 - ice));
    roughnessFactor = mix(roughnessFactor, 0.6, tracks * SNOWROAD * (1.0 - ice));
    roughnessFactor = mix(roughnessFactor, 0.5 + 0.3 * crack, ice);
  #endif
  }
#endif
#ifdef GUTTER
  {
    // a cobbled gutter along each curb: setts in courses, each a shade of its own, their joints gone before they could shimmer
    float e = rbHw - abs(rbX), aa = fwidth(e) + 0.01;
    float g = 1.0 - smoothstep(GUTTER - aa, GUTTER + aa, e);
    vec2 sp = vec2(rbAlong / 0.24, e / 0.17);
    float course = floor(sp.y);
    vec2 sf = fract(vec2(sp.x + 0.5 * mod(course, 2.0), sp.y));
    float j = min(min(sf.x, 1.0 - sf.x) * 0.24, min(sf.y, 1.0 - sf.y) * 0.17);
    float jw = fwidth(rbAlong) * 0.5 + 0.004;
    float mortar = (1.0 - smoothstep(0.014, 0.014 + jw, j)) * (1.0 - smoothstep(12.0, 30.0, rwView));
    vec3 stone = uGutter * (0.84 + 0.3 * rwHash(floor(vec2(sp.x + 0.5 * mod(course, 2.0), course))));
    stone = mix(stone, uGutter * 0.62, mortar);
    diffuseColor.rgb = mix(diffuseColor.rgb, stone, g * rwClean);
  }
#endif
#ifdef BRICKS
  {
    // now and then a brick-paved square across the road, 7 to 12 m long: courses of warm red brick across it, every other
    // course half a brick along, a pale stone border at each end; its joints gone before they could shimmer
    float cellL = 160.0, cell = floor(rbAlong / cellL);
    float has = step(1.0 - BRICKS, rwHash(vec2(cell, 21.7)));
    float len = 7.0 + 5.0 * rwHash(vec2(cell, 5.3));
    float c0 = (cell + 0.5) * cellL + (rwHash(vec2(cell, 13.1)) - 0.5) * (cellL - len - 24.0);
    float q = abs(rbAlong - c0) - len * 0.5, aa = fwidth(rbAlong) + 0.01;
    float inside = (1.0 - smoothstep(-aa, aa, q)) * has * rwClean;
    vec2 bp = vec2(rbX / 0.23, rbAlong / 0.11);
    float row = floor(bp.y);
    vec2 bf = fract(vec2(bp.x + 0.5 * mod(row, 2.0), bp.y));
    float bj = min(min(bf.x, 1.0 - bf.x) * 0.23, min(bf.y, 1.0 - bf.y) * 0.11);
    float jw = fwidth(rbAlong) * 0.5 + 0.003;
    float joint = (1.0 - smoothstep(0.01, 0.01 + jw, bj)) * (1.0 - smoothstep(16.0, 40.0, rwView));
    vec3 brick = uBrick * (0.84 + 0.28 * rwHash(floor(vec2(bp.x + 0.5 * mod(row, 2.0), row))));
    brick = mix(brick, vec3(0.66, 0.62, 0.56), joint);
    float border = 1.0 - smoothstep(0.3 - aa, 0.3 + aa, abs(q + 0.3));
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(brick, vec3(0.74, 0.71, 0.66), border), inside);
  }
#endif
}`;

/** The road's albedo: world-space patches, the worn bands, grit, patches and cracks, the biome at the edges. Before the emissive (after the lines are painted). */
const WEAR_ALBEDO = `float rwBand = 0.0, rwWet = 0.0;
if (vMark < 0.5) {
  vec2 rw = vWearW.xz;
  float rwView = length(vViewPosition);
  float rwClean = 1.0 - mudMask;
  // broad soft patches in world space, two sizes: never one flat sheet
  float rwN = rwNoise(rw * 0.045) * 0.65 + rwNoise(rw * 0.19 + 13.1) * 0.35;
  diffuseColor.rgb *= 0.88 + 0.24 * rwN;
  // two worn bands where the karts run, wandering a little and broken along their length
  float rwLat = vRoad.x + 0.02 * sin(vRoad.y * 1.7) + 0.01 * sin(vRoad.y * 5.3);
  rwBand = max(1.0 - smoothstep(0.04, 0.12, abs(rwLat - 0.35)), 1.0 - smoothstep(0.04, 0.12, abs(rwLat - 0.65)));
  rwBand *= (0.65 + 0.35 * rwNoise(vec2(vRoad.y * 1.4, rwLat * 7.0))) * WEAR * rwClean;
#ifdef STANDARD
  // the PBR look draws its own worn racing line (roadDetail): these straight lanes only hint
  rwBand *= 0.35;
#endif
  diffuseColor.rgb *= 1.0 - 0.15 * rwBand;
  // grit: a fine speckle close up, gone by 30 m so nothing shimmers far off
  float rwGrit = rwHash(floor(rw * 7.0)) - 0.5;
  diffuseColor.rgb *= 1.0 + 0.07 * rwGrit * (1.0 - smoothstep(8.0, 30.0, rwView)) * (1.0 - 0.6 * rwBand);
#if PATCHES > 0
  {
    // repaired rectangles, road-aligned: now and then one across part of a lane, a shade darker with a seam
    float along = vRoad.y * 10.0, cell = floor(along / 19.0);
    float has = step(1.0 - 0.45 * float(PATCHES) / 100.0, rwHash(vec2(cell, 3.7)));
    float c0 = (cell + 0.25 + 0.5 * rwHash(vec2(cell, 9.1))) * 19.0, len = 2.5 + 3.5 * rwHash(vec2(cell, 1.3));
    float x0 = 0.2 + 0.6 * rwHash(vec2(cell, 5.9)), wid = 0.1 + 0.12 * rwHash(vec2(cell, 7.7));
    vec2 q = vec2(abs(along - c0) - len * 0.5, (abs(vRoad.x - x0) - wid * 0.5) * 16.0);
    float box = max(q.x, q.y);
    float inside = 1.0 - smoothstep(-0.02, 0.02, box);
    float seam = 1.0 - smoothstep(0.02, 0.07, abs(box));
    // faint: a dark box with a hard outline on a pale road read as a pit or a trap (screenshot review 24 Sept 2026)
    diffuseColor.rgb *= 1.0 - has * rwClean * (0.06 * inside + 0.12 * seam * (1.0 - smoothstep(20.0, 45.0, rwView)));
  }
#endif
#if CRACKS > 0
  {
    // fine cracks, in a few places and mostly toward the edges, thin at any distance and gone far off
    float mask = smoothstep(0.55, 0.7, rwNoise(rw * 0.06 + 4.2)) * (0.45 + 0.55 * smoothstep(0.22, 0.08, min(vRoad.x, 1.0 - vRoad.x)));
    float d = rwCrack(rw * 0.55 + vec2(0.37 * rwNoise(rw * 1.3)));
    float line = 1.0 - smoothstep(0.0, max(0.02, fwidth(d) * 1.2), d);
    diffuseColor.rgb *= 1.0 - 0.5 * line * mask * rwClean * float(CRACKS) / 100.0 * (1.0 - smoothstep(18.0, 40.0, rwView));
  }
#endif
#ifdef SAND
  // sand blown onto the road from the desert, thickest at the edges, in drifts
  float rwEdge = min(vRoad.x, 1.0 - vRoad.x) + 0.06 * (rwNoise(rw * 0.35) - 0.5);
  diffuseColor.rgb = mix(diffuseColor.rgb, uSand, (1.0 - smoothstep(0.02, 0.15, rwEdge)) * 0.55);
#endif
#ifdef FROST
  // frost at the edges and in the dips
  float rwIce = min(vRoad.x, 1.0 - vRoad.x) + 0.08 * (rwNoise(rw * 0.3) - 0.5);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.93, 1.0), (1.0 - smoothstep(0.0, 0.14, rwIce)) * FROST);
#endif
#ifdef GILD
  // a clean sky road: gold laid over the asphalt's grain (its panels and joints below still read over it), polished
  diffuseColor.rgb = mix(diffuseColor.rgb, uGild * (0.96 + 0.08 * rwN), GILD);
  #ifdef STANDARD
  roughnessFactor = mix(roughnessFactor, GILD_GLOSS, GILD);
  #endif
#endif
#ifdef SEAMS
  // the sky road's panels, 12 m long: each a shade of its own, a joint across the road between them
  float rwP = vRoad.y * 10.0 / 12.0;
  diffuseColor.rgb *= 0.95 + 0.1 * rwHash(vec2(floor(rwP), 2.3));
  float rwJ = abs(fract(rwP) - 0.5) * 12.0;
  diffuseColor.rgb *= 1.0 - 0.26 * (1.0 - smoothstep(0.04, 0.04 + fwidth(rwJ) * 1.5, rwJ)) * (1.0 - smoothstep(30.0, 70.0, rwView));
#endif
#ifdef WET
  // wet patches on the deck: a touch darker, and they catch the sheen below
  rwWet = smoothstep(0.45, 0.75, rwNoise(rw * 0.12 + 2.0));
  diffuseColor.rgb *= 1.0 - 0.12 * rwWet;
#endif
${WEAR_BIG}
}`;

/** The sun's glint on the road (and a wet deck's sheen), after the lights: stronger and tighter on the polished bands, none in shadow. */
const WEAR_GLINT = `if (vMark < 0.5) {
  vec3 rwV = normalize(vViewPosition);
#if NUM_DIR_LIGHTS > 0 && !defined( STANDARD )
  vec3 rwH = normalize(directionalLights[0].direction + rwV);
  // how sunlit this spot is: its direct light against the light's own (0 in a shadow)
  vec3 rwLit = reflectedLight.directDiffuse / max(diffuseColor.rgb * RECIPROCAL_PI, vec3(1e-4));
  float rwSun = clamp(dot(rwLit, vec3(0.3333)) / max(dot(directionalLights[0].color, vec3(0.3333)), 1e-4), 0.0, 1.0);
  float rwSpec = pow(max(dot(normal, rwH), 0.0), SHINE * (1.0 + rwBand)) * SHEEN * (1.0 + 0.8 * rwBand) * rwSun;
  totalEmissiveRadiance += directionalLights[0].color * rwSpec;
#endif
#ifdef WET
  float rwFres = pow(1.0 - clamp(dot(normal, rwV), 0.0, 1.0), 3.0);
  totalEmissiveRadiance += uWetTint * rwFres * WET * (0.45 + 0.55 * rwWet);
#endif
#ifdef SPILL
  // the neon edge's light on the wet boards beside it
  float rwSide = min(vRoad.x, 1.0 - vRoad.x);
  totalEmissiveRadiance += uSpill * (1.0 - smoothstep(0.0, 0.2, rwSide)) * (0.55 + 0.45 * rwWet) * 0.3;
#endif
}`;

/**
 * The road's wear and sheen for a biome, chained after the road shader's own patch (track-builder
 * scene.ts paintRoadLines: it reads that patch's vRoad, vMark and mudMask). Same material, same
 * draw calls: a few noise lookups on the road's pixels only.
 */
export function roadWear(m: MeshToonMaterial, biome: string): void {
  const look = ROAD_LOOKS[biome];
  if (!look) return;
  const f = (x: number) => x.toFixed(3);
  const defines = [
    `#define WEAR ${look.wear.toFixed(2)}`, `#define SHEEN ${look.sheen.toFixed(3)}`, `#define SHINE ${look.shine.toFixed(1)}`,
    `#define PATCHES ${Math.round(look.patches * 100)}`, `#define CRACKS ${Math.round(look.cracks * 100)}`,
    look.sand ? '#define SAND' : '', look.frost ? `#define FROST ${look.frost.toFixed(2)}` : '',
    look.seams ? '#define SEAMS' : '', look.wet ? `#define WET ${look.wet.toFixed(2)}` : '', look.spill ? '#define SPILL' : '',
    // the large features read from the chase camera (WEAR_BIG)
    look.tone ? `#define TONE ${f(look.tone)}` : '', look.reseal ? `#define RESEAL ${f(look.reseal)}` : '',
    look.resealGloss ? `#define RESEAL_GLOSS ${f(look.resealGloss)}` : '', look.seal ? `#define SEAL ${f(look.seal)}` : '',
    look.dust ? `#define DUST\n#define DUST_W ${f(look.dustWidth ?? 1.2)}\n#define DUST_A ${f(look.dustAmount ?? 0.5)}` : '',
    look.puddles ? `#define PUDDLES ${f(look.puddles)}\n#define PUDDLE_GLOSS ${f(look.puddleGloss ?? 0.66)}` : '',
    // each place's own road (RoadLook drift, snow, gutter, bricks)
    look.drift ? `#define DRIFT ${f(look.driftAmount ?? 0.8)}\n#define DRIFT_TINT ${f(look.driftTint ?? 0.25)}` : '',
    look.snow ? `#define SNOWROAD ${f(look.snow)}` : '',
    look.gutter ? `#define GUTTER ${f(look.gutter)}` : '',
    look.bricks ? `#define BRICKS ${f(look.bricks)}` : '',
    look.gild ? `#define GILD ${f(look.gildAmount ?? 0.6)}\n#define GILD_GLOSS ${f(look.gildGloss ?? 0.7)}` : '',
  ].filter(Boolean).join('\n');
  const reseal = look.resealTint ?? [1, 1, 1], pud = look.puddleTint ?? [0.74, 0.74, 0.76];
  const uniforms = {
    uSand: { value: new Color(look.sand ?? '#000000') }, uWetTint: { value: new Color(look.wetTint ?? '#000000') }, uSpill: { value: new Color(look.spill ?? '#000000') },
    // a multiplier (linear), not a colour
    uResealTint: { value: new Color().setRGB(reseal[0], reseal[1], reseal[2]) }, uDust: { value: new Color(look.dust ?? '#000000') },
    uPuddleTint: { value: new Color().setRGB(pud[0], pud[1], pud[2]) },
    uDrift: { value: new Color(look.drift ?? '#000000') }, uGutter: { value: new Color(look.gutterTint ?? '#000000') }, uBrick: { value: new Color(look.brickTint ?? '#000000') }, uGild: { value: new Color(look.gild ?? '#000000') },
  };
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    // the racing line and the road's half-width (road.ts `lane`): the PBR look's own road patch declares them
    // (track-builder scene.ts paintRoadLines); the toon look reads them only here, for the half-width
    const lane = '#ifndef STANDARD\nattribute vec2 lane;\nvarying vec2 vLane;\n#endif\n';
    shader.vertexShader = `varying vec3 vWearW;\n${lane}${shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWearW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#ifndef STANDARD\n  vLane = lane;\n#endif')}`;
    shader.fragmentShader = `${defines}\n${WEAR_PARS}\n${shader.fragmentShader}`
      .replace('#include <emissivemap_fragment>', `${WEAR_ALBEDO}\n#include <emissivemap_fragment>`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${WEAR_GLINT}`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|wear-${biome}`;
}

/** Metres of road a tile of its own relief covers (detail.ts, roadDetailSource), in world space. */
export const ROAD_GRAIN_METRES = 4;

/**
 * The road in the PBR look (look.ts), chained after its lines and wear (it reads their vRoad, vMark,
 * vBend, mudMask and the PBR parts of scene.ts paintRoadLines: vLane, vCurb, roadPaint, roadCurb):
 * - the racing line (road.ts racingLine: toward each corner's inside) a little darker and smoother,
 *   where the karts have polished it, with faint tire marks along it, two wheel tracks a kart apart
 *   and a second pair a little wide, broken along the road, darker in the corners, gone before they
 *   could shimmer (by distance and by how wide a pixel is);
 * - the surface's own grain (`roadDetailSource(biome)`: the asphalt's grit and cracks, or Boardwalk's
 *   plank grain, or Frostbite's packed-snow sparkle and ruts) in the normal, in world space, faded
 *   with distance, and in the roughness: rough in the cavities, smoother on the polished line, the
 *   paint and the curbs, never a mirror.
 * Same material, same draw calls. Only a MeshStandardMaterial compiles it (STANDARD).
 */
export function roadDetail(m: MeshToonMaterial, biome: string): void {
  const look = ROAD_LOOKS[biome];
  const uniforms = { uRoadGrain: { value: roadDetailSource(biome) }, uRoadWet: ROAD_WET, uLineTint: { value: new Color(look?.lineTint ?? '#000000') } };
  const g = ROAD_GRAIN_METRES.toFixed(2);
  // the rubbered racing line (27 Sept 2026: was 0.12 everywhere, too faint to read from the chase camera)
  const line = (look?.line ?? 0.12).toFixed(3), tint = look?.lineTint ? '1.0' : '0.0';
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `#ifdef STANDARD\nvarying vec3 vRdW;\n#endif\n${shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef STANDARD\n  vRdW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif')}`;
    shader.fragmentShader = `#ifdef STANDARD\nuniform sampler2D uRoadGrain;\nuniform float uRoadWet;\nuniform vec3 uLineTint;\nvarying vec3 vRdW;\n${NOISE_GLSL}\n${LOOK_GLSL}\n#endif\n${shader.fragmentShader}`
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
#ifdef STANDARD
  {
    float rdH = texture2D(uRoadGrain, vRdW.xz / ${g}).b;
    float rdView = length(vViewPosition);
    float rdR = roughnessFactor;
    if (vMark < 0.5) {
      float lat = (vRoad.x - vLane.x) * 2.0 * vLane.y, along = vRoad.y * 10.0;
      // the racing line: about 2.5 m wide
      float band = exp(-lat * lat * 0.35) * (1.0 - mudMask);
      // tire marks: two wheel tracks a kart apart, a second pair a little wide, each broken along the road
      float marks = 0.0;
      for (int p = 0; p < 2; p++) {
        float off = float(p) * 1.35 - 0.35;
        for (int k = 0; k < 2; k++) {
          float wheel = float(k) * 1.24 - 0.62;
          float d = lat - off - wheel - 0.07 * sin(along * 0.17 + float(p) * 2.1);
          float on = smoothstep(0.45, 0.75, lkNoise(vec2(along * 0.035 + float(p) * 17.0, float(k) * 3.1 + 0.5)));
          marks += exp(-d * d * 110.0) * on;
        }
      }
      float px = fwidth(lat);
      marks = min(marks, 1.0) * (0.55 + 0.45 * vBend) * (1.0 - smoothstep(0.04, 0.12, px)) * (1.0 - smoothstep(25.0, 60.0, rdView)) * (1.0 - mudMask) * (1.0 - roadPaint);
      // the line's rubber lies in streaks along it (tire tracks), smoothed away before they could shimmer
      float streak = lkNoise(vec2(lat * 4.5 + 3.0, along * 0.05)) * 2.0 - 1.0;
      float lineK = band * (1.0 + 0.45 * streak * (1.0 - smoothstep(0.05, 0.14, px * 4.5))) * (1.0 - roadPaint * 0.6);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uLineTint * 1.6, ${tint} * lineK * 0.5);
      diffuseColor.rgb *= (1.0 - ${line} * lineK) * (1.0 - 0.3 * marks) * (0.84 + 0.16 * rdH);
      rdR = mix(0.97, 0.82, rdH) - 0.16 * band - 0.1 * marks;
      rdR = mix(rdR, 0.55, roadPaint);
      rdR = mix(rdR, 0.92, mudMask);
    } else if (vMark < 1.5) {
      diffuseColor.rgb *= 0.94 + 0.12 * rdH;
      rdR = mix(0.9, 0.9, roadCurb);
    }
    roughnessFactor = clamp(rdR, 0.3, 1.0);
    // the storm's wet road (ROAD_WET): darker, and glossy under its film of water
    diffuseColor.rgb *= 1.0 - ${WET_ROAD.darken.toFixed(2)} * uRoadWet;
    roughnessFactor = mix(roughnessFactor, ${WET_ROAD.roughness.toFixed(2)}, uRoadWet);
  }
#endif`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
#ifdef STANDARD
  if (vMark < 1.5) {
    // a damp spot's film of water lies smooth over the grain (it would sparkle like glitter otherwise)
    float rdFlat = 1.0;
  #ifdef PUDDLES
    if (vMark < 0.5) rdFlat = 1.0 - 0.85 * rwPuddle(vRdW.xz, (vRoad.x - 0.5) * 2.0 * vLane.y, vLane.y) * (1.0 - mudMask);
  #endif
    normal = lkBend(normal, lkSlope(uRoadGrain, vRdW.xz / ${g}) * ${(0.9 * (look?.grain ?? 1)).toFixed(3)} * rdFlat * (1.0 - smoothstep(${ROAD_RELIEF_FAR[0].toFixed(1)}, ${ROAD_RELIEF_FAR[1].toFixed(1)}, length(vViewPosition))), 1.0);
  }
#endif`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|detail`;
  // a little less of the pale sky's sheen than the props take: the road read washed out
  m.userData.lookEnv = ROAD_ENV;
}

/** A fully wet road (ROAD_WET 1): how much darker its albedo, and the roughness its water film brings it down to. */
export const WET_ROAD = Object.freeze({ darken: 0.3, roughness: 0.5 });

/** The road's share of the sky's light in the PBR look (look.ts PBR.env for the rest of the world). */
export const ROAD_ENV = 0.22;

/** A wide wooden deck (Boardwalk Nights): warm planks with grain and dark gaps, 4 planks a tile. */
function planks(): Texture {
  let t = texCache.get('planks');
  if (!t) {
    if (typeof document === 'undefined') t = new Texture();
    else {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      if (g) {
        for (let p = 0; p < 4; p++) {
          const y = p * 64, shade = [0, -10, 6, -4][p];
          g.fillStyle = `rgb(${196 + shade}, ${150 + shade}, ${108 + shade})`;
          g.fillRect(0, y, 256, 64);
          // grain: long soft streaks along the plank
          for (let k = 0; k < 26; k++) {
            g.fillStyle = `rgba(${90 + (k % 3) * 20}, ${56 + (k % 2) * 10}, 30, ${0.05 + (k % 4) * 0.02})`;
            g.fillRect(0, y + 4 + ((k * 37) % 56), 256, 1 + (k % 2));
          }
          // plank ends staggered along the deck
          g.fillStyle = 'rgba(40, 24, 16, 0.55)';
          g.fillRect(((p * 97) % 256), y, 2, 64);
          g.fillStyle = 'rgba(30, 18, 12, 0.85)';
          g.fillRect(0, y + 61, 256, 3); // gap
        }
      }
      t = new CanvasTexture(c);
    }
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 8;
    t.userData.shared = true;
    texCache.set('planks', t);
  }
  return t;
}

/** Packed snow (Frostbite Pass): sparkle flecks and two shallow tire ruts, a kart's own track apart. */
function snowRoadCanvas(): Texture {
  let t = texCache.get('snow-road');
  if (!t) {
    if (typeof document === 'undefined') t = new Texture();
    else {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      if (g) {
        g.fillStyle = 'rgb(224, 230, 240)';
        g.fillRect(0, 0, 256, 256);
        // (no ruts: the relief is sampled in world space, so ruts drawn here lay across the road wherever it runs
        // across the world's Z, 28 Sept 2026; the packed wheel tracks are the road's albedo, along the road: SNOWROAD)
        for (const x of [] as number[]) {
          const grad = g.createLinearGradient(x - 12, 0, x + 12, 0);
          grad.addColorStop(0, 'rgba(160, 170, 190, 0)');
          grad.addColorStop(0.22, 'rgba(160, 170, 190, 0.75)');
          grad.addColorStop(0.78, 'rgba(160, 170, 190, 0.75)');
          grad.addColorStop(1, 'rgba(160, 170, 190, 0)');
          g.fillStyle = grad;
          g.fillRect(x - 12, 0, 24, 256);
          for (let k = 0; k < 90; k++) {
            const px = x - 10 + ((k * 7) % 20), py = (k * 11) % 256, shade = k % 2 ? 40 : -40;
            g.fillStyle = `rgba(${shade > 0 ? 210 : 130}, ${shade > 0 ? 216 : 140}, ${shade > 0 ? 228 : 160}, 0.5)`;
            g.fillRect(px, py, 2, 1 + (k % 2));
          }
        }
        // sparkle: sparse bright flecks where packed snow catches the light, denser off the ruts
        for (let k = 0; k < 220; k++) {
          const x = (k * 53 + (k % 7) * 11) % 256, y = (k * 97 + (k % 5) * 19) % 256;
          const onRut = Math.abs(x - 84) < 13 || Math.abs(x - 172) < 13;
          if (onRut && k % 2 === 0) continue; // the ruts themselves sparkle less: packed, not fresh
          const s = 1 + (k % 2);
          g.fillStyle = `rgba(255, 255, 255, ${(0.3 + (k % 4) * 0.1).toFixed(2)})`;
          g.fillRect(x, y, s, s);
        }
      }
      t = new CanvasTexture(c);
    }
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.userData.shared = true;
    texCache.set('snow-road', t);
  }
  return t;
}

/**
 * The road's own detail source for `roadDetail` (its fine relief: bump and roughness, not colour):
 * every biome but two reads the asphalt's own grit and cracks (detailMap, from its loaded photo).
 * Boardwalk's deck and Frostbite's snow are not asphalt, so each gets its own pattern run through the
 * same relief extraction (detail.ts detailPixels: a Sobel slope, so the ridges follow the grain and
 * the ruts) — planks() already exists for the deck's own colour (Adam, 25 Sept 2026: "Boardwalk's
 * planks and the snow roads get the asphalt's grain detail today"); `detailTexture` takes any texture
 * already in hand the same way it takes a still-loading photo, wrapped in an already-resolved promise.
 */
let plankDetail: Texture | undefined, snowRoadDetail: Texture | undefined;
function roadDetailSource(biome: string): Texture {
  if (biome === 'boardwalk') return (plankDetail ??= detailTexture(Promise.resolve(planks())));
  if (biome === 'frost') return (snowRoadDetail ??= detailTexture(Promise.resolve(snowRoadCanvas())));
  return detailMap('asphalt');
}

/**
 * The coast's two surfaces per sea biome: the flat top and the beach, metres per tile, and how the sand is
 * toned. The PBR look (look.ts) also reads `topFile` (the top's relief: detail.ts) and `dirt`: a soft dirt
 * edge where a grass top meets the curb, in that colour.
 */
const COASTS: Readonly<Record<string, { top: () => Texture; topMetres: number; beach: string; beachMetres: number; beachTint: string; beachSat: number; topFile?: string; dirt?: string }>> = Object.freeze({
  harbour: { top: () => texture('grass'), topMetres: 14, beach: 'sand', beachMetres: 10, beachTint: '#fff6de', beachSat: 0.5, topFile: 'grass', dirt: '#b39266' },
  boardwalk: { top: planks, topMetres: 2.6, beach: 'sand', beachMetres: 10, beachTint: '#c9b8d6', beachSat: 0.25 },
  // land tracks: the hills and cliffs under raised roads
  canyon: { top: () => texture('sand'), topMetres: 16, beach: 'sand', beachMetres: 9, beachTint: '#ffd9bf', beachSat: 0.8, topFile: 'sand' },
  frost: { top: () => texture('snow'), topMetres: 16, beach: 'snow', beachMetres: 12, beachTint: '#dde8f6', beachSat: 1, topFile: 'snow' },
  meadow: { top: () => texture('grass'), topMetres: 14, beach: 'grass', beachMetres: 12, beachTint: '#e2e6b8', beachSat: 0.85, topFile: 'grass', dirt: '#9c7a50' },
});

const coastCache = new Map<string, Material>();
/**
 * The coast of a sea track: the top texture on the flat land, a pale beach sand down the slope,
 * mixed by the geometry's `blend` attribute (0 top → 1 beach) and sampled by world metres (the
 * geometry's `uv`); vertex colours darken the wet sand. Both textures are the shared ones, read
 * through their own uniforms so no repeat is touched. Undefined for a biome with no coast.
 * Shared, never disposed.
 */
export function coastMaterial(biome: string): Material | undefined {
  const spec = COASTS[biome];
  if (!spec) return undefined;
  const key = `${biome}:${look()}`;
  let m = coastCache.get(key);
  if (!m) {
    const pbr = isPbr();
    const mat = pbr
      ? new MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: PBR.roughness, metalness: 0 })
      : new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp(), vertexColors: true });
    const uniforms = {
      topMap: { value: spec.top() }, topScale: { value: 1 / spec.topMetres },
      beachMap: { value: texture(spec.beach) }, beachScale: { value: 1 / spec.beachMetres },
      beachTint: { value: new Color(spec.beachTint) }, beachSat: { value: spec.beachSat },
    };
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'attribute float blend;\nvarying float vBlend;\nvarying vec2 vWorldUv;\n'
        + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBlend = blend;\n  vWorldUv = uv;');
      shader.fragmentShader = 'uniform sampler2D topMap;\nuniform sampler2D beachMap;\nuniform float topScale;\nuniform float beachScale;\nuniform vec3 beachTint;\nuniform float beachSat;\nvarying float vBlend;\nvarying vec2 vWorldUv;\n'
        + shader.fragmentShader.replace(
          '#include <map_fragment>',
          [
            '#include <map_fragment>',
            '  vec3 topTexel = texture2D(topMap, vWorldUv * topScale).rgb;',
            '  vec3 sandTexel = texture2D(beachMap, vWorldUv * beachScale).rgb;',
            '  sandTexel = mix(vec3(dot(sandTexel, vec3(0.299, 0.587, 0.114))), sandTexel, beachSat) * beachTint;',
            '  diffuseColor.rgb *= mix(topTexel, sandTexel, smoothstep(0.0, 1.0, vBlend));',
          ].join('\n'),
        );
      if (pbr) pbrCoast(shader, biome, spec);
      if (biome === 'frost') snowShader(shader);
    };
    mat.customProgramCacheKey = () => `coast-${biome}${pbr ? '-pbr' : ''}`;
    mat.userData.shared = true;
    coastCache.set(key, mat);
    if (pbr) mat.userData.lookEnv = groundLook(biome).env;
    m = pbr ? litWorld(mat as MeshStandardMaterial) : mat;
  }
  return m;
}

/** Metres a tile of the dirt's grain covers (the beach texture, finer). */
const DIRT_METRES = 3;

/** The lawns (Lighthouse Loop, Windmill Run): their grass carries LAWN_FLOWERS. */
const LAWN: ReadonlySet<string> = new Set(['harbour', 'meadow']);

/**
 * Little flowers over a lawn (27 Sept 2026; review item 1: "the road runs through an empty lawn"; the grass
 * of Mario Kart World's Moo Moo Meadows is speckled with them right up to the road: youtube.com/watch?v=
 * AFN7RL6qEZI 0:70): in patches that come and go every 10 m or so, a head a few centimetres across in about
 * one 30 cm cell of three, white, yellow or pink. Drawn only while a cell is several pixels wide (by its own
 * screen-space size), so no head is ever smaller than a pixel and nothing sparkles; beyond that a patch
 * only lifts the grass's tint a little. Starts a metre past the curb (the dirt edge stays bare). No
 * triangles: the land's own shader (pbrCoast), after its dirt edge.
 */
const LAWN_FLOWERS = `
  {
    float lfPatch = smoothstep(0.48, 0.74, lkNoise(vWorldUv * 0.09 + 7.1) * 0.7 + lkNoise(vWorldUv * 0.31 + 1.7) * 0.3) * lkTop * (1.0 - lkDirt) * smoothstep(0.8, 1.6, vLkCurb);
    vec2 lfCell = vWorldUv * 3.2, lfI = floor(lfCell), lfF = fract(lfCell);
    float lfH = lkHash(lfI);
    vec2 lfAt = vec2(lkHash(lfI + 3.1), lkHash(lfI + 7.9)) * 0.6 + 0.2;
    float lfW = fwidth(lfCell.x) + fwidth(lfCell.y);
    float lfHead = (1.0 - smoothstep(0.13 - lfW, 0.13 + lfW, length(lfF - lfAt))) * step(1.0 - lfPatch * 0.4, lfH);
    float lfNear = 1.0 - smoothstep(0.1, 0.26, lfW);
    vec3 lfC = fract(lfH * 13.7) > 0.8 ? vec3(1.0, 0.5, 0.72) : fract(lfH * 13.7) > 0.55 ? vec3(1.0, 0.84, 0.2) : vec3(0.97, 0.97, 0.9);
    diffuseColor.rgb = mix(diffuseColor.rgb, lfC, lfHead * lfNear);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.07 + vec3(0.02, 0.016, 0.008), lfPatch * (1.0 - lfNear) * 0.6);
  }`;

/**
 * The coast in the PBR look, on top of its two textures: the top varies across the land (GROUND_LOOKS),
 * a grass top gets a soft dirt edge by the curb instead of a hard line (the land's `curb`: metres past
 * the nearest curb, land.ts), and each surface its roughness and its texture's own relief, faded out
 * with distance. After the textures are mixed; the frost's snow comes after it.
 */
function pbrCoast(shader: WebGLProgramParametersWithUniforms, biome: string, spec: (typeof COASTS)[string]): void {
  const gl = groundLook(biome), beach = GROUND_LOOKS[spec.beach === 'grass' ? 'meadow' : spec.beach === 'snow' ? 'frost' : 'canyon'];
  Object.assign(shader.uniforms, {
    uTopRelief: { value: detailMap(spec.topFile ?? spec.beach) }, uBeachRelief: { value: detailMap(spec.beach) },
    uLush: { value: new Color(gl.lush) }, uDry: { value: new Color(gl.dry) }, uDirt: { value: new Color(spec.dirt ?? '#000000') },
  });
  const f = (x: number) => x.toFixed(3);
  shader.vertexShader = `attribute float curb;\nvarying float vLkCurb;\n${shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vLkCurb = curb;')}`;
  shader.fragmentShader = `uniform sampler2D uTopRelief; uniform sampler2D uBeachRelief; uniform vec3 uLush; uniform vec3 uDry; uniform vec3 uDirt; varying float vLkCurb;\n${NOISE_GLSL}\n${LOOK_GLSL}\n${shader.fragmentShader}`
    .replace('diffuseColor.rgb *= mix(topTexel, sandTexel, smoothstep(0.0, 1.0, vBlend));', `diffuseColor.rgb *= mix(topTexel, sandTexel, smoothstep(0.0, 1.0, vBlend));
  float lkTop = 1.0 - smoothstep(0.0, 1.0, vBlend);
  diffuseColor.rgb = lkSaturate(diffuseColor.rgb * mix(vec3(1.0), lkGroundTint(vWorldUv, uLush, uDry, ${f(gl.size)}, ${f(gl.vary)}), lkTop), mix(1.0, ${f(gl.sat)}, lkTop));
  // the soft dirt edge where a grass top meets the curb, wandering in and out a metre or so
  float lkE = vLkCurb + (lkNoise(vWorldUv * 0.16) - 0.5) * 2.4 + (lkNoise(vWorldUv * 0.6) - 0.5) * 1.1 + (lkNoise(vWorldUv * 2.1 + 5.0) - 0.5) * 0.45;
  float lkDirt = ${spec.dirt ? '1.0' : '0.0'} * (1.0 - smoothstep(0.3, 2.3, lkE)) * lkTop * step(-0.6, vLkCurb);
  vec3 lkDirtC = uDirt * (0.78 + 0.44 * dot(texture2D(beachMap, vWorldUv / ${f(DIRT_METRES)}).rgb, vec3(0.3333)));
  diffuseColor.rgb = mix(diffuseColor.rgb, lkDirtC, lkDirt);${LAWN.has(biome) ? LAWN_FLOWERS : ''}`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(mix(${f(gl.rough)}, ${f(beach.rough)}, smoothstep(0.0, 1.0, vBlend)), 0.95, lkDirt);`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    float lkFar = 1.0 - smoothstep(${GROUND_RELIEF_FAR[0].toFixed(1)}, ${GROUND_RELIEF_FAR[1].toFixed(1)}, length(vViewPosition));
    vec2 lkS = mix(lkSlope(uTopRelief, vWorldUv * topScale) * ${f(gl.relief)}, lkSlope(uBeachRelief, vWorldUv * beachScale) * ${f(beach.relief)}, smoothstep(0.0, 1.0, vBlend));
    lkS = mix(lkS, lkSlope(uBeachRelief, vWorldUv / ${f(DIRT_METRES)}) * 0.6, lkDirt);
    normal = lkBend(normal, lkS * lkFar, 1.0);
  }`)
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  {
    float lkSpec = mix(${f(beach.spec)}, ${f(gl.spec)}, lkTop);
    reflectedLight.directSpecular *= lkSpec;
    reflectedLight.indirectSpecular *= lkSpec;
  }`);
}
