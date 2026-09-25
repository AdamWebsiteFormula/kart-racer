// The look switch (look review, 25 Sept 2026: "looks kind of cheap, not on the Mario Kart World level";
// Adam chose the new look the same day: "switch the game to it"). Two looks: 'pbr', the game's (design §3:
// soft stylized PBR: MeshStandardMaterial, rough and not metal, the same albedo textures and palette
// colours, fine normal detail on the ground and the road, the race's own painted sky as the environment
// light), and 'toon', the old one (MeshToonMaterial on a 3-step ramp), kept behind `?look=toon`.
// `?look=pbr` works too. Render-only: the sim, input logs and the score core never read it.
//
// One light for everything in the PBR look: every MeshStandardMaterial on the page (the world, the racers,
// the podium's cup) is lit by the same rule (installLight: the sun gained and wrapped, the fill scaled,
// the sky's light partly greyed), and the race's scene carries the sky map (main.ts), so a kart and the
// road beside it take the same sun, fill and sky. Toon materials (items, the code-built fallback karts)
// keep the old light.
import {
  BackSide, Color, CubeCamera, HalfFloatType, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, PMREMGenerator, Scene,
  ShaderChunk, SphereGeometry, Vector3, WebGLCubeRenderTarget, type MeshToonMaterial, type Object3D, type ShaderMaterial,
  type Texture, type WebGLRenderer, type WebGLRenderTarget,
} from 'three';

export type Look = 'toon' | 'pbr';
export const LOOKS: readonly Look[] = Object.freeze(['toon', 'pbr']);
/** The look a page gets when its address names none (Adam, 25 Sept 2026: the new look is the game's). */
export const DEFAULT_LOOK: Look = 'pbr';

/** The look an address asks for (`?look=pbr`, `?look=toon`), or null when it names none (or an unknown one). */
export function lookFromSearch(search: string | undefined): Look | null {
  if (!search) return null;
  const v = new URLSearchParams(search).get('look');
  return v !== null && (LOOKS as readonly string[]).includes(v) ? (v as Look) : null;
}

let current: Look = lookFromSearch(typeof location === 'undefined' ? undefined : location.search) ?? DEFAULT_LOOK;

/** This page's look. */
export const look = (): Look => current;
/** The PBR look is on. */
export const isPbr = (): boolean => current === 'pbr';
/**
 * Tests (and the dev console): materials made from now on follow `l`, and so does the light of every
 * standard material compiled from now on (installLight); a race already built keeps its own.
 */
export function setLook(l: Look): void { current = l; installLight(l); }

/**
 * The PBR look's tuning. MKW's world is rough (no plastic), so the world starts at `roughness` and no
 * metal. The sun: MeshToonMaterial's ramp lit a floor fully under a sun 24° up, where a physical floor
 * gets sin 24° of it, so every standard material takes the sun `sun` times over, wrapped `wrap` round
 * its shoulders (a soft terminator, a stylized PBR); `ambient` scales the hemisphere and fill on it.
 * `env` is the painted sky's light and reflection (SkyEnvironment) on everything in a race, the world
 * and the racers alike (the race scene's environment intensity, times a night sky's own gain: sky.ts
 * SkyLight.pbrEnv); a surface may take a share of it (lookEnv, envShare). `envSaturation`: how much
 * of the sky's colour it keeps.
 */
export const PBR = Object.freeze({
  roughness: 0.9,
  metalness: 0,
  env: 0.45,
  /** how much of the painted sky's colour its light and reflection keep (a deep blue sky tinted every road lavender) */
  envSaturation: 0.45,
  sun: 2.0,
  wrap: 0.3,
  ambient: 0.6,
  /** the sky map's cube side, pixels: RoomEnvironment's (256), so a racer's shader reads either with the same defines */
  envSize: 256,
});

/** three's own physical light and sky-map chunks, as they were before any look touched them. */
const THREE_LIGHTS = ShaderChunk.lights_physical_pars_fragment;
const THREE_MAPS = ShaderChunk.lights_fragment_maps;

/** three's physical lighting with the look's sun: gained and wrapped (PBR.sun, PBR.wrap) and the fill scaled (PBR.ambient). */
const DIRECT = 'vec3 irradiance = dotNL * directLight.color;';
const DIFFUSE = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );';
const INDIRECT = 'vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );';
const f3 = (x: number) => x.toFixed(3);
export const LOOK_LIGHTS = THREE_LIGHTS
  .replace(DIRECT, `vec3 irradiance = dotNL * directLight.color * ${f3(PBR.sun)};`)
  .replace(DIFFUSE, `reflectedLight.directDiffuse += saturate( ( dot( geometryNormal, directLight.direction ) + ${f3(PBR.wrap)} ) / ${f3(1 + PBR.wrap)} ) * directLight.color * ${f3(PBR.sun)} * BRDF_Lambert( material.diffuseContribution );`)
  .replace(INDIRECT, `vec3 diffuse = irradiance * ${f3(PBR.ambient)} * BRDF_Lambert( material.diffuseContribution );`);
/** Did all three replacements find their line (a three.js upgrade that rewrites one fails look.test.ts)? */
export const LOOK_LIGHTS_OK = [DIRECT, DIFFUSE, INDIRECT].every((l) => THREE_LIGHTS.includes(l));

/**
 * The painted sky's light and reflection, partly greyed (PBR.envSaturation), after three reads them from
 * the sky map; a material with LOOK_ENV_SHARE takes that share of it (envShare).
 */
export const LOOK_MAPS = `${THREE_MAPS}
#if defined( RE_IndirectDiffuse ) && defined( RE_IndirectSpecular )
  iblIrradiance = mix( vec3( dot( iblIrradiance, vec3( 0.2126, 0.7152, 0.0722 ) ) ), iblIrradiance, ${f3(PBR.envSaturation)} );
  radiance = mix( vec3( dot( radiance, vec3( 0.2126, 0.7152, 0.0722 ) ) ), radiance, ${f3(PBR.envSaturation)} );
  #ifdef LOOK_ENV_SHARE
    iblIrradiance *= LOOK_ENV_SHARE;
    radiance *= LOOK_ENV_SHARE;
  #endif
#endif`;

/**
 * The look's light for every standard material compiled from now on: three's own physical chunks for
 * the toon look, the PBR look's (LOOK_LIGHTS, LOOK_MAPS) for it. It lives in the shared chunks rather
 * than in each material's patch, because a material's copy (the player's own kart, a Time Trial ghost,
 * an alt paint) keeps none of its patches: this way nothing lit is left out. The page's look is set
 * before its first frame, so no compiled shader ever has the other one.
 */
export function installLight(l: Look): void {
  ShaderChunk.lights_physical_pars_fragment = l === 'pbr' ? LOOK_LIGHTS : THREE_LIGHTS;
  ShaderChunk.lights_fragment_maps = l === 'pbr' ? LOOK_MAPS : THREE_MAPS;
}
installLight(current);

// ---- the aerial haze ----

/**
 * The PBR look's aerial perspective (look review, 25 Sept 2026: pale cream horizons washed the distance
 * out): the world's haze is the sky's own blue a little above the horizon (sky.ts aerialOf) through the
 * middle distance, and the horizon's colour (the fog's) only where it is all haze, so nothing far meets
 * the painted horizon on a seam. main.ts sets it each frame from the race's sky; linear RGB.
 */
export const AERIAL = { value: new Color(0.62, 0.68, 0.74) };
/** The share of the fog, 0 to 1, over which the haze turns from the aerial blue to the horizon's colour. */
export const AERIAL_TURN = Object.freeze([0.45, 1.0] as const);
/**
 * The air itself (look review 2, 25 Sept 2026: the far landmarks, a dark volcano at 300 m, read near
 * black, where Mario Kart World's far mesas go lighter and bluer): besides the fog, the world takes the
 * aerial blue with distance, `amount` of it at most, from `near` metres on, most of the way there by
 * `near + 2 * scale`. x = amount, y = near, z = scale; a uniform, so the dev console can tune it.
 */
export const AIR = { value: new Vector3(0.3, 60, 500) };

const HAZE_FOG = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float lookFogK = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float lookFogK = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, LOOK_HAZE( lookFogK ), 1.0 - ( 1.0 - lookFogK ) * ( 1.0 - LOOK_AIR( vFogDepth ) ) );
#endif`;

/**
 * The aerial haze into a fogged shader (a built-in material's or the water's): its fog takes AERIAL through
 * the middle distance, and the air (AIR) hazes it a little from the middle distance on. The vista's lighter
 * haze (track-builder scene.ts lessHaze) reads the same two macros.
 */
export function aerialFog(shader: { fragmentShader: string; uniforms: Record<string, { value: unknown }> }): void {
  shader.uniforms.uAerial = AERIAL;
  shader.uniforms.uAir = AIR;
  shader.fragmentShader = `uniform vec3 uAerial;\nuniform vec3 uAir;
#define LOOK_HAZE( f ) mix( uAerial, fogColor, smoothstep( ${f3(AERIAL_TURN[0])}, ${f3(AERIAL_TURN[1])}, f ) )
#define LOOK_AIR( d ) ( uAir.x * ( 1.0 - exp( - max( ( d ) - uAir.y, 0.0 ) / uAir.z ) ) )
${shader.fragmentShader}`
    .replace('#include <fog_fragment>', HAZE_FOG);
}

/**
 * The far vista's share of the sky's light in the PBR look (userData.lookEnv; look review 2): more than the
 * near world's, as the air lights a far slope's shade; with the air (AIR) its dark cones and cliffs read
 * as far land, not as holes.
 */
export const VISTA_ENV = 0.6;

// ---- the sky's reflection ----

let env: Texture | null = null;
/** The painted sky as an environment map (SkyEnvironment): the race scene's environment in the PBR look; null until a renderer made one (tests). */
export const worldEnvironment = (): Texture | null => env;

/**
 * The race's painted sky as a PMREM environment map: the scene's own sky dome material drawn round a
 * cube camera, the ground under the horizon in the earth's colour, then prefiltered. One map for the
 * page's life: `capture` paints it again in place (a new race, the painting arriving, a Final Lap
 * Shift's sky), so no material ever changes shader for it.
 */
export class SkyEnvironment {
  private readonly renderer: WebGLRenderer;
  private readonly pmrem: PMREMGenerator;
  private readonly cube: WebGLCubeRenderTarget;
  private readonly camera: CubeCamera;
  private readonly scene = new Scene();
  private readonly dome: Mesh;
  private target: WebGLRenderTarget | null = null;
  private readonly keep = { a: new Color(), b: new Color() };

  constructor(renderer: WebGLRenderer, size = PBR.envSize) {
    this.renderer = renderer;
    this.pmrem = new PMREMGenerator(renderer);
    this.cube = new WebGLCubeRenderTarget(size, { type: HalfFloatType });
    this.camera = new CubeCamera(0.1, 100, this.cube);
    const plain = new MeshBasicMaterial({ side: BackSide, color: new Color(0.55, 0.68, 0.85) });
    this.dome = new Mesh(new SphereGeometry(10, 48, 24), plain);
    this.scene.add(this.dome);
    // a plain sky for now, so the map exists before the first race's world materials are made
    this.capture(plain, new Color(0.2, 0.2, 0.18));
  }

  /** The map (null before the first capture). */
  get texture(): Texture | null { return this.target?.texture ?? null; }

  /**
   * Paint the sky dome's material as it stands (art-pipeline sky.ts: the painting, a Final Lap Shift's
   * fade) into the map, with `earth` (linear) below the horizon; makes the map on the first call and
   * shares it (worldEnvironment). Returns it.
   */
  capture(sky: Material, earth: Color): Texture {
    const u = (sky as ShaderMaterial).uniforms;
    const ga = u?.groundA?.value as Color | undefined, gb = u?.groundB?.value as Color | undefined;
    // the dome paints a pale ground for the view below the horizon; the map wants the land's own shade there
    if (ga && gb) { this.keep.a.copy(ga); this.keep.b.copy(gb); ga.copy(earth); gb.copy(earth); }
    this.dome.material = sky;
    this.camera.update(this.renderer, this.scene);
    if (ga && gb) { ga.copy(this.keep.a); gb.copy(this.keep.b); }
    this.target = this.pmrem.fromCubemap(this.cube.texture, this.target);
    env = this.target.texture;
    return env;
  }
}

// ---- the world in the PBR look ----

/** Each toon material's PBR twin (shared toons get one shared twin). */
const TWINS = new WeakMap<Material, MeshStandardMaterial>();

/**
 * A MeshToonMaterial's twin in the PBR look: a MeshStandardMaterial with its colour, maps, emission and
 * every base setting (sides, blending, depth, polygon offset, vertex colours, user data), rough and not
 * metal, with the sky map. Its shader is the toon's own patches, run at compile time (glow, near-lens
 * fades, road lines and wear, the crowd's rig: all use chunks both materials share). The same twin for
 * the same toon; disposing the toon disposes it too.
 */
export function pbrTwin(src: MeshToonMaterial): MeshStandardMaterial {
  const had = TWINS.get(src);
  if (had) return had;
  const t = new MeshStandardMaterial();
  // the base settings (Material's own copy: the standard one would read standard fields the toon has not),
  // with the user data copied by hand (Material.copy would JSON it)
  const ud = src.userData;
  src.userData = {};
  Material.prototype.copy.call(t, src);
  src.userData = ud;
  t.userData = { ...ud };
  t.color = src.color; // the same Color: whatever tints the toon tints its twin
  t.map = src.map;
  t.lightMap = src.lightMap; t.lightMapIntensity = src.lightMapIntensity;
  t.aoMap = src.aoMap; t.aoMapIntensity = src.aoMapIntensity;
  t.emissive = src.emissive; t.emissiveMap = src.emissiveMap; t.emissiveIntensity = src.emissiveIntensity;
  t.bumpMap = src.bumpMap; t.bumpScale = src.bumpScale;
  t.normalMap = src.normalMap; t.normalMapType = src.normalMapType; t.normalScale = src.normalScale;
  t.displacementMap = src.displacementMap; t.displacementScale = src.displacementScale; t.displacementBias = src.displacementBias;
  t.alphaMap = src.alphaMap;
  t.wireframe = src.wireframe;
  t.fog = src.fog;
  t.roughness = PBR.roughness;
  t.metalness = PBR.metalness;
  // the sky's light is the race scene's environment, shared with the racers (main.ts); a toon may name its
  // own intensity of it (userData.lookEnv: envShare)
  envShare(t, ud.lookEnv as number | undefined);
  // the toon's own patches, run at compile time (so one put on it later still reaches the twin), then the
  // aerial haze; the look's light is in three's chunks (installLight)
  t.onBeforeCompile = (shader, renderer) => { src.onBeforeCompile(shader, renderer); aerialFog(shader); };
  t.customProgramCacheKey = () => `${src.customProgramCacheKey()}|pbr`;
  src.addEventListener('dispose', () => t.dispose());
  TWINS.set(src, t);
  return t;
}

/**
 * A material's share of the sky's light, from the intensity it wants (`lookEnv`, the PBR.env scale: the road
 * and a lawn take less, their sheen of a pale sky washed them out): a compile-time share of the race
 * scene's environment (LOOK_MAPS), so it follows a night sky's gain like everything else. None: all of it.
 */
function envShare(m: MeshStandardMaterial, lookEnv: number | undefined): void {
  m.envMap = null;
  if (lookEnv === undefined || Math.abs(lookEnv - PBR.env) < 1e-6) return;
  m.defines = { ...m.defines, LOOK_ENV_SHARE: (lookEnv / PBR.env).toFixed(3) };
  m.needsUpdate = true;
}

/**
 * A MeshStandardMaterial of the world's (a model file's, a surface's): the race scene's sky light, at its
 * `userData.lookEnv` intensity when it sets one (envShare). (The look's light is in three's chunks: installLight.)
 */
export function litWorld(m: MeshStandardMaterial): MeshStandardMaterial {
  if (!m.userData.lookLit) {
    m.userData.lookLit = true;
    envShare(m, m.userData.lookEnv as number | undefined);
    // the world's aerial haze (the racers are never far enough to take it)
    const prev = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m);
    m.onBeforeCompile = (shader, renderer) => { prev.call(m, shader, renderer); aerialFog(shader); };
    m.customProgramCacheKey = () => `${key()}|aerial`;
  }
  return m;
}

function world(m: Material): Material {
  if ((m as MeshToonMaterial).isMeshToonMaterial) return pbrTwin(m as MeshToonMaterial);
  if ((m as MeshStandardMaterial).isMeshStandardMaterial) return litWorld(m as MeshStandardMaterial);
  return m; // unlit (the sky, the far ring, glows) and custom shaders (water, pads, sky life) keep theirs
}

/**
 * Put everything under `root` in the PBR look: each toon material becomes its twin, each standard one
 * (a model file's) gets the sky map at the world's share; the rest stay. Safe to run again after new
 * meshes join (a rebuilt instancer): what is done already is left. Karts are never under a track's root
 * (they take the race scene's environment: main.ts).
 */
export function applyLook(root: Object3D): void {
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.material = Array.isArray(m.material) ? m.material.map(world) : world(m.material);
  });
}
