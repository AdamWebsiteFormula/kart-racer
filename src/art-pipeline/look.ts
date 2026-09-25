// The look switch (look review, 25 Sept 2026: "looks kind of cheap, not on the Mario Kart World level").
// Two looks for the world (terrain, road, props, decor, the far vista): 'toon', the shipped one
// (MeshToonMaterial on a 3-step ramp, design §3), and 'pbr', a prototype of Mario Kart World's
// stylized PBR: MeshStandardMaterial, rough and not metal, the same albedo textures and palette
// colours, fine normal detail on the ground and the road, and a soft reflection of the race's own
// painted sky (SkyEnvironment). `?look=pbr` in the address picks it for the page; DEFAULT_LOOK is the
// build's. Render-only: the sim, input logs and the score core never read it.
//
// Other systems read the switch from here (the racers' materials may follow it later: `look()`,
// `worldEnvironment()` for the sky's reflection). Nothing here touches a kart.
import {
  BackSide, Color, CubeCamera, HalfFloatType, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, PMREMGenerator, Scene,
  ShaderChunk, SphereGeometry, WebGLCubeRenderTarget, type MeshToonMaterial, type Object3D, type ShaderMaterial,
  type Texture, type WebGLProgramParametersWithUniforms, type WebGLRenderer, type WebGLRenderTarget,
} from 'three';

export type Look = 'toon' | 'pbr';
export const LOOKS: readonly Look[] = Object.freeze(['toon', 'pbr']);
/** The look a page gets when its address names none. */
export const DEFAULT_LOOK: Look = 'pbr'; // Adam, 25 Sept 2026: "switch the game to the new look" (?look=toon brings the old one back)

/** The look an address asks for (`?look=pbr`, `?look=toon`), or null when it names none (or an unknown one). */
export function lookFromSearch(search: string | undefined): Look | null {
  if (!search) return null;
  const v = new URLSearchParams(search).get('look');
  return v !== null && (LOOKS as readonly string[]).includes(v) ? (v as Look) : null;
}

let current: Look = lookFromSearch(typeof location === 'undefined' ? undefined : location.search) ?? DEFAULT_LOOK;

/** This page's look. */
export const look = (): Look => current;
/** The PBR prototype is on. */
export const isPbr = (): boolean => current === 'pbr';
/** Tests (and the dev console): materials made from now on follow `l`; a race already built keeps its own. */
export function setLook(l: Look): void { current = l; }

/**
 * The PBR look's tuning. MKW's world is rough (no plastic), so everything starts at `roughness` and no
 * metal. The sun: MeshToonMaterial's ramp lights a floor fully under a sun 24° up, where a physical
 * floor gets sin 24° of it, so the world's own surfaces take the sun `sun` times over, wrapped `wrap`
 * round their shoulders (a soft terminator, a stylized PBR); `ambient` scales the hemisphere and fill
 * on them, and `env` the painted sky's light and reflection (SkyEnvironment). Karts keep the lights as
 * they are.
 */
export const PBR = Object.freeze({
  roughness: 0.9,
  metalness: 0,
  env: 0.4,
  /** how much of the painted sky's colour its light and reflection keep (a deep blue sky tinted every road lavender) */
  envSaturation: 0.45,
  sun: 2.0,
  wrap: 0.3,
  ambient: 0.6,
  /** the sky map's cube side, pixels: RoomEnvironment's (256), so a racer's shader reads either with the same defines */
  envSize: 256,
});

/** three's physical lighting with the world's own sun: gained and wrapped (PBR.sun, PBR.wrap) and the ambient scaled (PBR.ambient). */
const DIRECT = 'vec3 irradiance = dotNL * directLight.color;';
const DIFFUSE = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );';
const INDIRECT = 'vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );';
export const LOOK_LIGHTS = ShaderChunk.lights_physical_pars_fragment
  .replace(DIRECT, 'vec3 irradiance = dotNL * directLight.color * LOOK_SUN;')
  .replace(DIFFUSE, 'reflectedLight.directDiffuse += saturate( ( dot( geometryNormal, directLight.direction ) + LOOK_WRAP ) / ( 1.0 + LOOK_WRAP ) ) * directLight.color * LOOK_SUN * BRDF_Lambert( material.diffuseContribution );')
  .replace(INDIRECT, 'vec3 diffuse = irradiance * LOOK_AMBIENT * BRDF_Lambert( material.diffuseContribution );');
/** Did all three replacements find their line (a three.js upgrade that rewrites one fails look.test.ts)? */
export const LOOK_LIGHTS_OK = [DIRECT, DIFFUSE, INDIRECT].every((l) => ShaderChunk.lights_physical_pars_fragment.includes(l));

const LIGHT_DEFINES = `#define LOOK_SUN ${PBR.sun.toFixed(3)}\n#define LOOK_WRAP ${PBR.wrap.toFixed(3)}\n#define LOOK_AMBIENT ${PBR.ambient.toFixed(3)}\n#define LOOK_ENV_SAT ${PBR.envSaturation.toFixed(3)}\n`;

/** The painted sky's light and reflection, partly greyed (PBR.envSaturation), after three reads them from the sky map. */
export const LOOK_ENV = `#include <lights_fragment_maps>
#if defined( RE_IndirectDiffuse ) && defined( RE_IndirectSpecular )
  iblIrradiance = mix( vec3( dot( iblIrradiance, vec3( 0.2126, 0.7152, 0.0722 ) ) ), iblIrradiance, LOOK_ENV_SAT );
  radiance = mix( vec3( dot( radiance, vec3( 0.2126, 0.7152, 0.0722 ) ) ), radiance, LOOK_ENV_SAT );
#endif`;

/** The world's sun, ambient and sky light (LOOK_LIGHTS, LOOK_ENV) into a MeshStandardMaterial's shader. */
export function lookLights(shader: WebGLProgramParametersWithUniforms): void {
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <lights_physical_pars_fragment>', `${LIGHT_DEFINES}${LOOK_LIGHTS}`)
    .replace('#include <lights_fragment_maps>', LOOK_ENV);
}

// ---- the sky's reflection ----

let env: Texture | null = null;
/** The painted sky as an environment map (SkyEnvironment), for every PBR world material; null until a renderer made one (tests). */
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
/** Standard materials already given the world's lights (model files' own, surfaces.ts's). */
const LIT = new WeakSet<Material>();

/**
 * A MeshToonMaterial's twin in the PBR look: a MeshStandardMaterial with its colour, maps, emission and
 * every base setting (sides, blending, depth, polygon offset, vertex colours, user data), rough and not
 * metal, lit by the world's sun (lookLights) and the sky map. Its shader is the toon's own patches, run
 * at compile time (glow, near-lens fades, road lines and wear, the crowd's rig: all use chunks both
 * materials share), then the world's lights. The same twin for the same toon; disposing the toon
 * disposes it too.
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
  t.envMap = env;
  // (a toon may name its own share of the sky's light: litWorld)
  t.envMapIntensity = (ud.lookEnv as number | undefined) ?? PBR.env;
  t.onBeforeCompile = (shader, renderer) => {
    src.onBeforeCompile(shader, renderer);
    lookLights(shader);
  };
  t.customProgramCacheKey = () => `${src.customProgramCacheKey()}|pbr`;
  src.addEventListener('dispose', () => t.dispose());
  TWINS.set(src, t);
  LIT.add(t);
  return t;
}

/**
 * A MeshStandardMaterial of the world's (a model file's, a surface's): the world's lights and the sky map,
 * once. Its `userData.lookEnv`, when set, is its own share of the sky's light (a lawn takes less: its sheen
 * washed it out), else PBR.env.
 */
export function litWorld(m: MeshStandardMaterial): MeshStandardMaterial {
  m.envMap = env;
  m.envMapIntensity = (m.userData.lookEnv as number | undefined) ?? PBR.env;
  if (LIT.has(m)) return m;
  LIT.add(m);
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    lookLights(shader);
  };
  m.customProgramCacheKey = () => `${key()}|pbr`;
  m.needsUpdate = true;
  return m;
}

function world(m: Material): Material {
  if ((m as MeshToonMaterial).isMeshToonMaterial) return pbrTwin(m as MeshToonMaterial);
  if ((m as MeshStandardMaterial).isMeshStandardMaterial) return litWorld(m as MeshStandardMaterial);
  return m; // unlit (the sky, the far ring, glows) and custom shaders (water, pads, sky life) keep theirs
}

/**
 * Put everything under `root` in the PBR look: each toon material becomes its twin, each standard one
 * (a model file's) gets the world's lights and the sky map; the rest stay. Safe to run again after
 * new meshes join (a rebuilt instancer): what is done already is left. Karts are never under a track's root.
 */
export function applyLook(root: Object3D): void {
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.material = Array.isArray(m.material) ? m.material.map(world) : world(m.material);
  });
}
