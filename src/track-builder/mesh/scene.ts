// buildTrackScene(track, assets) → TrackScene. Reads the sim layer, never the other way.
// Everything here is a Mesh or InstancedMesh with exactly one material, so the object
// count is the draw-call count. Placeholder geometries stand in until art-pipeline
// supplies real ones through `assets`.
import {
  BackSide, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DataTexture, DynamicDrawUsage, Frustum, Group,
  InstancedBufferAttribute, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshToonMaterial, PlaneGeometry,
  RepeatWrapping, RGBAFormat, SphereGeometry, Quaternion, Vector3, SRGBColorSpace, Matrix4, type Camera, type Material, type Object3D, type Texture,
} from 'three';
import { headingOf } from '../../kart-controller/types.ts';
import { BUILDER } from '../constants.ts';
import { buildTrack, type Track } from '../track.ts';
import type { ActiveHazard, BakedFeature, TrackChanged } from '../types.ts';
import { buildBranchChunks, chunkTouched, rebuildChunk, ribbonOptions, type Chunk } from './chunks.ts';
import { buildRibbon, sampleRange } from './road.ts';
import { buildShiftStage, type LakeHook, type ShiftStage } from './shiftStage.ts';
import { hashString, mulberry32, Occupancy, placeDecor, pushTransform, type DecorPlacement } from './decor.ts';
import { DRESSING_SLICES, mergeInstances, sliceOf, type MergeItem } from './merge.ts';
import { CREATURE_GHOST, CreatureView } from './creatures.ts';
import { NearGhost } from './ghost.ts';
import { buildCoast, hideableRoads, landAt, type CoastOptions, buildPier } from './land.ts';
import { buildBackdrop } from './backdrop.ts';
import { buildBoundary } from './boundary.ts';
import { fadeNearCamera, glowFromVertexColours, selfLit, sunlessBackFaces } from './glow.ts';
import { buildStartGantry, setStartLamps } from './gantry.ts';
import { buildTunnels } from './tunnel.ts';
import { buildLoopMeshes } from './loop.ts';
import { VentView } from './vents.ts';
import { buildJumpMeshes, padMaterial, tickPads } from './ramps.ts';
import { placeGrass } from './verge.ts';
import { hexToRgb, paletteFor, PLANKED, type Rgb, type TrackPalette } from './palette.ts';

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export interface TrackAssets {
  /** keyed by decor asset, barrier asset, `balloon`, `coin`, `boostPad`, `ramp`, hazard asset, landmark id */
  geometries?: Record<string, BufferGeometry>;
  /** ink hulls for static models (decor, barriers, landmark), same keys; drawn with `ink` */
  hulls?: Record<string, BufferGeometry>;
  /** shared outline material for the hulls; never disposed by the scene */
  ink?: Material;
  /** toon light ramp for every toon material the scene makes */
  gradientMap?: Texture;
  /** a model file's own (textured) material for an asset key, same keys as `geometries`; never disposed by the scene */
  materials?: Record<string, Material>;
  /** the ground plane's material (painted land, animated water); never disposed by the scene */
  ground?: (kind: string, size: number) => Material | undefined;
  /** a fine grain multiplied over every road's colours (not on planked roads); never disposed by the scene */
  roadMap?: Texture;
  /** the road's wear and sheen (art-pipeline surfaces.ts roadWear), patched onto the road material after its lines: same material, same draws */
  road?: (m: MeshToonMaterial) => void;
  /** the coast of a sea track (flat top, beach slope); never disposed by the scene */
  coast?: () => Material | undefined;
  /** the far vista (art-pipeline vista.ts): set-pieces in the distance and what moves there; built per scene, freed with it */
  vista?: (ctx: VistaContext) => VistaParts | null;
  /** a lake painted on the snow that freezes at the Final Lap Shift (art-pipeline surfaces.ts; Frostbite): the stage sets it */
  lake?: LakeHook;
  /**
   * the world's look (art-pipeline look.ts applyLook, the PBR prototype): run over the scene once it is
   * built and again whenever it makes new meshes (a shortcut opening, the shift's features); it swaps
   * materials in place and must leave what it has done already
   */
  look?: (root: Object3D) => void;
  /**
   * the PBR look's grass by the road (art-pipeline grass.ts; placed by verge.ts): one tuft's geometry and
   * its material (shared, never disposed by the scene), drawn as one instancer along the curbs of an
   * off-road track; it takes the place of the verge entries named in `replaces` (their places are still
   * worked out, so everything else stands where it did)
   */
  grass?: { geometry: BufferGeometry; material: Material; replaces: readonly string[] };
}

/** What a far vista is laid out from: the track's middle and reach, its start, its ground and sun. */
export interface VistaContext {
  biome: string;
  /** the middle of the roads' box and the farthest any main-line road reaches from it (metres) */
  centre: [number, number];
  radius: number;
  /** the start line, and which way it faces (unit, level) */
  start: [number, number];
  forward: [number, number];
  /** the ground plane (or the sea) height; NaN on a track with no ground */
  groundY: number;
  /** the roads' lowest and highest points */
  roadMinY: number;
  roadMaxY: number;
  /** toward the sun (unit) */
  sun: [number, number, number];
  /** Mirror mode: the vista is reflected with the track */
  mirrored: boolean;
  /** the main line at t: its centre on the road, which way it runs and which way is its +lateral (level, unit), and how far out from the centre the course limit (or the road's edge) stands */
  road?: (t: number) => { p: [number, number, number]; along: [number, number]; right: [number, number]; limit: number };
  /** the ground's height at (x, z) (the land as drawn on an off-road track, else the ground plane) */
  groundAt?: (x: number, z: number) => number;
  /** whether no prop of the scenery stands within r metres of (x, z) */
  clear?: (x: number, z: number, r: number) => boolean;
}

/** A far vista's parts. */
export interface VistaParts {
  /** the still set-pieces as one vertex-coloured world-space geometry: the scene draws it toon-lit and fogged, casting no shadow */
  solid?: BufferGeometry;
  /** meshes in world space with their own materials (movers, glows) */
  world?: Mesh[];
  /** meshes that ride round the camera with the far ring (a moon, sun rays) */
  ring?: Mesh[];
  /** the far landmark ahead of the start line (world metres) */
  landmark?: [number, number, number];
  /** per frame, with the camera's place, the clock the movers read and the detail level (1 full, 0 the governor's Low) */
  tick?: (camera: [number, number, number], clock: number, detail: number) => void;
  /** the Final Lap Shift has come (its new sky, if it brings one) */
  shift?: (sky: string | undefined) => void;
  /** the sky life, for checks: its fliers, its trigger slots and where a flier is at a given clock second */
  life?: { fliers: readonly unknown[]; trig: Float32Array; flierAt: (f: never, time: number, trig: Float32Array) => [number, number, number] | null };
}

export interface TrackScene {
  group: Group;
  palette: TrackPalette;
  chunks: Chunk[];
  decor: DecorPlacement[];
  /** the merged dressing (merge.ts): one static mesh per slice of the track, near ones casting shadows */
  dressing: Mesh[];
  /** the far vista's landmark ahead of the start line, when the track has a vista */
  farLandmark?: [number, number, number];
  /** the far vista's parts (its sky life's controls), when the track has one */
  vista?: VistaParts;
  /** the Final Lap Shift's set piece (mesh/shiftStage.ts), played from the shift's tick by the session; none once shifted */
  stage?: ShiftStage;
  /** name → instancer; names: barriers, balloons, coins, boostPads, ramps, hazard:<asset>, decor:<asset> */
  instancers: Map<string, InstancedMesh>;
  fog: { color: Rgb; density: number };
  sky: string | undefined;
  /** move hazards to their position at race time `time`; pass race-manager's activeHazards list to avoid computing it twice */
  update(time: number, active?: readonly ActiveHazard[], live?: LiveFeatures): void;
  /**
   * How much the balloons and coins light themselves (the sky's SkyLight.glow, 0 by day); update()
   * eases to it with the lights and pulses it gently. `snap` jumps there (a new race).
   */
  setPickupGlow(amount: number, snap?: boolean): void;
  /** Mesh + InstancedMesh objects in the group (draw-call proxy) */
  drawables(): number;
  /**
   * The governor's Low tier (`low`: no shadow map, so no pass needs a prop the lens cannot see; a weak
   * or software-drawn GPU): each decor instancer draws only its copies in `camera`'s view, the far and
   * sky bands every other one, and the far vista's movers and the crowd are not drawn at all. Off Low,
   * everything is drawn as placed (High and Medium never change). `fogFar`: past it a copy is all fog,
   * so at Low it is not drawn either. Once a frame, after the camera is placed and before the frame is
   * drawn; allocates nothing.
   */
  cull(camera: Camera, low: boolean, fogFar?: number): void;
  /**
   * What the lens meets fades out as a clean ghost (ghost.ts): the course creature, its snowball,
   * tentacles and dust, the hazards (barrels, hay bales, snowballs, mine carts, bumper cars, teacups),
   * and the balloons and coins. `closeUp`: the finish camera's close-up of the
   * player's kart, which flies through a row of balloons: they fade from farther out (PICKUP_GHOST).
   * Once a frame, after the camera is placed and before the frame is drawn (like cull); allocates nothing.
   */
  lens(camera: Camera, closeUp?: boolean): void;
  dispose(): void;
}

/**
 * The balloons and coins near the lens (ghost.ts): gone at the first number of metres, whole from the
 * second. In a race they fade where they used to dissolve, 2.6 m out, never the one your kart is about
 * to pop (5.5 m ahead of the lens). The finish camera circles your kart 4.4 m off with a narrow view
 * and flies through the balloon row past the line (review, 25 Sept 2026: one filled a quarter of the
 * frame as a giant stippled blob), so there they fade from 6 m and are gone by 2.4.
 */
export const PICKUP_GHOST = Object.freeze({ race: [0.8, 2.6] as const, closeUp: [2.4, 6] as const });
const PICKUP_GHOSTED = ['balloons', 'coins'] as const;
const LENS_EYE = new Vector3();

/** Race-manager timers, by feature index within its kind; a feature with respawnRemaining > 0 is hidden. */
export interface LiveFeatures { pickups?: readonly { respawnRemaining: number }[]; coins?: readonly { respawnRemaining: number }[] }

const SKY_RADIUS = 900;
/** The pickups' glow pulse: ± this share of it, once every PICKUP_PULSE_S seconds. */
const PICKUP_PULSE = 0.2, PICKUP_PULSE_S = 1.6;
/** The pickup glow eases at the scene lights' rate (main.ts applyLight), per second. */
const PICKUP_EASE = 1.6;
/** Each landmark's target height, metres (scaled up to it where the road leaves room). */
const LANDMARK_HEIGHT: Readonly<Partial<Record<string, number>>> = Object.freeze({
  lighthouse: 55, windmill: 48, arch: 42, peak: 110, 'ferris-wheel': 60, airship: 34,
});
/** Metres a scaled-up landmark keeps from the nearest road edge. */
const LANDMARK_CLEAR = 14;
const GROUND_SIZE = 2400;
/** The coast of a sea track: metres of flat land past the shoulder (the roadside band ends at 14), the slope into the sea, the grid. */
const COAST = Object.freeze({ flat: 14, slope: 12, cell: 2.5 });
/** Land under raised roads on a land track: how far each biome's hills fall (metres), and whether its slopes show rock bands. */
const LAND: Readonly<Partial<Record<string, { slope: number; strata: boolean }>>> = Object.freeze({
  canyon: { slope: 8, strata: true }, frost: { slope: 14, strata: false }, meadow: { slope: 22, strata: false },
});
/** A land track gets hills only where its road rises this far above the ground plane. */
const LAND_MIN_RISE = 2.5;

function toColor(c: Rgb): Color { return new Color(c[0], c[1], c[2]); }

function placeholder(name: string): BufferGeometry {
  switch (name) {
    case 'balloon': return new SphereGeometry(BUILDER.balloonRadius, 12, 8);
    case 'coin': return new CylinderGeometry(BUILDER.coinRadius, BUILDER.coinRadius, 0.1, 12).rotateX(Math.PI / 2);
    case 'boostPad': return new BoxGeometry(1, 0.05, 1).translate(0, 0.025, 0);
    case 'ramp': return new BoxGeometry(1, 0.6, 3).translate(0, 0.3, 0);
    case 'barrier': return new BoxGeometry(0.6, 0.8, 0.6).translate(0, 0.4, 0);
    case 'hazard': return new SphereGeometry(BUILDER.hazardRadius, 8, 6);
    case 'landmark': return new ConeGeometry(4, 24, 8).translate(0, 12, 0);
    default: return new BoxGeometry(2, 4, 2).translate(0, 2, 0);
  }
}

function geometryFor(assets: TrackAssets, name: string, fallback = name): BufferGeometry {
  const own = assets.geometries?.[name];
  if (own) return own;
  const g = placeholder(fallback);
  OWNED.add(g);
  return g;
}

/**
 * Each track's road edge (Adam, 23 Sept 2026, option 1): Mario Kart keeps striped curbs for race
 * circuits and their corners; a place has its own edge. mode 0 stripes everywhere, 1 stripes only
 * where the road bends (the ribbon's `bend`), 2 never. a/b: the edge's two tones; joints: seams per
 * roadTileLength (slabs, planks), joint how dark a seam is; neon: a glowing line along the edge.
 */
interface EdgeStyle { mode: 0 | 1 | 2; a: string; b: string; joints: number; joint: number; neon?: string; off?: [string, string] }
const EDGES: Readonly<Record<string, EdgeStyle>> = Object.freeze({
  harbour: { mode: 1, a: '#e2ddd0', b: '#d2cabb', joints: 5, joint: 0.28, off: ['#ead9ab', '#d8c290'] }, // a town sidewalk, stripes on the corners; beach sand past it
  skyline: { mode: 1, a: '#f4c64e', b: '#e2a92c', joints: 2, joint: 0.12 },             // gold trim; stripes on the corners
  meadow: { mode: 2, a: '#7cbc56', b: '#5e9c40', joints: 0, joint: 0 },                 // a grass verge
  canyon: { mode: 2, a: '#ecc08a', b: '#d9a56d', joints: 0, joint: 0 },                 // drifted sand
  frost: { mode: 2, a: '#f7faff', b: '#d6e3f3', joints: 0, joint: 0 },                  // a snowbank
  boardwalk: { mode: 2, a: '#4c3c72', b: '#3a2d5a', joints: 16, joint: 0.35, neon: '#2ee6ff' }, // planks with a neon line
});

/**
 * The PBR look's own parts of the road shader (art-pipeline look.ts; only a MeshStandardMaterial twin
 * compiles them): the racing line and curbs from the ribbon (road.ts `lane`, `curb`), and how worn the
 * lane paint is at a point: patchy along the road, chipped in small flecks, and thinner where the
 * racing line's tires cross a line (0 fresh, up to 0.6: a line always reads).
 */
const PBR_ROAD_PARS = `#ifdef STANDARD
varying vec2 vLane;
varying float vCurb;
float plHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float plNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(plHash(i), plHash(i + vec2(1.0, 0.0)), u.x), mix(plHash(i + vec2(0.0, 1.0)), plHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float roadPaintWear(vec2 road, vec2 lane) {
  float along = road.y * 10.0, across = road.x * 2.0 * lane.y;
  float patches = smoothstep(0.55, 0.9, plNoise(vec2(along * 0.09, across * 0.35)));
  float chips = step(0.75, plHash(floor(vec2(along * 7.0, across * 9.0))));
  float tires = exp(-pow((road.x - lane.x) * 2.0 * lane.y, 2.0) * 0.5);
  return min(0.6, patches * 0.4 + chips * 0.22 + tires * 0.22);
}
#endif`;

/**
 * The road edge in each track's style (EDGES), and painted road lines: an edge line inside each
 * edge and a dashed centre line (asphalt only), and mud patches with ragged edges, wet blotches and
 * ruts, where the lines stop. Reads the ribbon's `mark`, `bend` and `surf` attributes (road.ts);
 * vertex colours still tint everything else.
 */
function paintRoadLines(m: MeshToonMaterial, palette: TrackPalette, lines: boolean, edge: EdgeStyle, offroad: boolean): void {
  const kerbA = new Color(...palette.kerbA), kerbB = new Color(...palette.kerbB);
  const ea = hexToRgb(edge.a), eb = hexToRgb(edge.b), neon = edge.neon ? hexToRgb(edge.neon) : ([0, 0, 0] as Rgb);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uKerbA = { value: kerbA };
    shader.uniforms.uKerbB = { value: kerbB };
    shader.uniforms.uLines = { value: lines ? 1 : 0 };
    shader.uniforms.uEdgeMode = { value: edge.mode };
    shader.uniforms.uEdgeA = { value: new Color(...ea) };
    shader.uniforms.uEdgeB = { value: new Color(...eb) };
    shader.uniforms.uEdgeJoints = { value: edge.joints };
    shader.uniforms.uEdgeJoint = { value: edge.joint };
    shader.uniforms.uNeon = { value: new Color(neon[0] * 2.2, neon[1] * 2.2, neon[2] * 2.2) };
    const off = edge.off ? [hexToRgb(edge.off[0]), hexToRgb(edge.off[1])] : [ea, eb];
    shader.uniforms.uOffroad = { value: offroad ? 1 : 0 };
    shader.uniforms.uOffA = { value: new Color(...off[0]) };
    shader.uniforms.uOffB = { value: new Color(...off[1]) };
    shader.uniforms.uMud = { value: new Color(...palette.surfaces.mud) };
    // (a MeshStandardMaterial twin in the PBR look, art-pipeline look.ts, also reads the racing line and the
    // inside-corner curbs, road.ts `lane` and `curb`: under STANDARD only, so the toon's shader is as it was)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float mark;\nattribute float bend;\nattribute float surf;\nvarying float vMark;\nvarying float vBend;\nvarying float vSurf;\nvarying vec2 vRoad;\n#ifdef STANDARD\nattribute vec2 lane;\nattribute float curb;\nvarying vec2 vLane;\nvarying float vCurb;\n#endif')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMark = mark;\nvBend = bend;\nvSurf = surf;\nvRoad = uv;\n#ifdef STANDARD\nvLane = lane;\nvCurb = curb;\n#endif');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform vec3 uKerbA;\nuniform vec3 uKerbB;\nuniform float uLines;\nuniform float uEdgeMode;\nuniform vec3 uEdgeA;\nuniform vec3 uEdgeB;\nuniform float uEdgeJoints;\nuniform float uEdgeJoint;\nuniform vec3 uNeon;\nuniform float uOffroad;\nuniform vec3 uOffA;\nuniform vec3 uOffB;\nuniform vec3 uMud;\nvarying float vMark;\nvarying float vBend;\nvarying float vSurf;\nvarying vec2 vRoad;\n${PBR_ROAD_PARS}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (vMark > 0.5 && vMark < 1.5) {
          // a neon line along the edge (Boardwalk): it lights itself
          float line = 1.0 - smoothstep(0.1, 0.18, abs(vRoad.x - 0.5));
          totalEmissiveRadiance += uNeon * line;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float mudMask = 0.0;
        #ifdef STANDARD
          // the PBR look reads where the paint is (it is smoother) and where a curb is striped
          float roadPaint = 0.0, roadCurb = 0.0;
        #endif
        // after the vertex colours (the ribbon's old two-colour curb), so the edge is exactly its own colour
        if (vMark > 0.5 && vMark < 1.5) {
          // striped curb: hard stripes, anti-aliased so they do not shimmer far away
          #ifdef STANDARD
            // the PBR look: a circuit's blocks, 1.2 m each
            float p = vRoad.y * 10.0 / 2.4;
          #else
            float p = vRoad.y * 2.0;
          #endif
          float w = fwidth(p) * 1.5;
          float t = abs(fract(p) - 0.5) * 2.0;
          vec3 stripes = mix(uKerbA, uKerbB, smoothstep(0.5 - w, 0.5 + w, t));
          // the place's own edge: two tones broken up along the road, with seams (slabs, planks)
          float q = sin(vRoad.y * 11.0 + vRoad.x * 3.0) * sin(vRoad.y * 4.3 - vRoad.x * 1.7) * 0.5 + 0.5;
          float seam = uEdgeJoints > 0.0 ? 1.0 - smoothstep(0.0, 0.08, abs(fract(vRoad.y * uEdgeJoints) - 0.5) * 2.0 - 0.9) : 0.0;
          vec3 plain = mix(uEdgeA, uEdgeB, q) * (1.0 - uEdgeJoint * (1.0 - seam));
          float corner = uEdgeMode > 1.5 ? 0.0 : uEdgeMode > 0.5 ? smoothstep(0.25, 0.6, vBend) : 1.0;
          #ifdef STANDARD
            // the PBR look: red-and-white curbs on the inside of tight corners only (road.ts insideCurbs)
            if (uEdgeMode > 0.5 && uEdgeMode < 1.5) corner = smoothstep(0.3, 0.6, vCurb);
            roadCurb = corner;
          #endif
          diffuseColor.rgb = mix(plain, stripes, corner);
        } else if (vMark > 1.5 && vMark < 2.5 && uOffroad > 0.5) {
          // an off-road track: no strip beside the road, the land itself meets the curb (land.ts)
          discard;
        } else if (vMark < 0.5) {
          // the surface itself: big soft patches of lighter and darker tarmac, and the middle a
          // little darker where the karts run (it is never one flat sheet)
          float n = sin(vRoad.y * 1.7 + vRoad.x * 5.0) * sin(vRoad.y * 0.63 - vRoad.x * 2.1) * 0.5 + 0.5;
          diffuseColor.rgb *= 0.93 + 0.12 * n;
          diffuseColor.rgb *= 1.0 - 0.07 * (1.0 - smoothstep(0.1, 0.32, abs(vRoad.x - 0.5)));
          if (vSurf > 0.01) {
            // a mud patch (road.ts surf: 0.5 at its first sample, 1 six metres in): a ragged edge that
            // wanders a few metres in, darker wet blotches and two wheel ruts, and no tarmac grain
            vec2 m = vec2(vRoad.x * 16.0, vRoad.y * 10.0);
            float n = sin(m.x * 0.9 + m.y * 0.45) * 0.5 + sin(m.x * 2.3 - m.y * 1.1) * 0.3 + sin(m.y * 2.9 + m.x * 0.7) * 0.2;
            float s = vSurf + 0.2 * n, ws = fwidth(s) + 0.01;
            mudMask = smoothstep(0.55 - ws, 0.55 + ws, s);
            // a few irregular puddles (warped, so they never line up in rows of dots)
            float blot = sin(m.y * 0.37 + sin(m.x * 0.8 + m.y * 0.21) * 1.7) * sin(m.x * 0.61 - m.y * 0.19) + 0.3 * sin(m.y * 1.3 - m.x * 1.1);
            float ww = fwidth(blot) + 0.03, wet = smoothstep(0.62 - ww, 0.62 + ww, blot);
            float rx = abs(abs(vRoad.x - 0.5 + 0.012 * sin(m.y * 0.4)) - 0.17), wr = fwidth(vRoad.x) + 0.003;
            float rut = 1.0 - smoothstep(0.018 - wr, 0.018 + wr, rx);
            float clod = sin(m.x * 5.1 + m.y * 3.7) * sin(m.y * 4.3 - m.x * 2.9);
            vec3 mud = uMud * 0.72 * (1.0 + 0.08 * clod) * (1.0 - 0.3 * rut);
            // puddles: darker, with a little of the sky in them; a lip of lighter drying mud along the edge
            mud = mix(mud, uMud * vec3(0.55, 0.6, 0.72), wet);
            mud *= 1.0 + 0.12 * (1.0 - smoothstep(0.0, 0.1, s - 0.55));
            diffuseColor.rgb = mix(diffuseColor.rgb, mud, mudMask);
          }
        }
        if (vMark < 0.5 && uLines > 0.5) {
          // painted lines: an edge line just inside each kerb, a dashed centre line
          float x = vRoad.x, wx = fwidth(x);
          float e = min(x, 1.0 - x);
          float edge = smoothstep(0.012 - wx, 0.012, e) * (1.0 - smoothstep(0.024, 0.024 + wx, e));
          float c = abs(x - 0.5);
          float dash = step(fract(vRoad.y * 0.6), 0.45);
          float centre = (1.0 - smoothstep(0.006, 0.006 + wx, c)) * dash;
          // the lines stop at a mud patch (no paint on mud)
          float paint = max(edge, centre) * 0.9 * (1.0 - mudMask);
          #ifdef STANDARD
            // the PBR look: worn paint, patchy and chipped, thinnest where the racing line's tires cross it
            paint *= 1.0 - roadPaintWear(vRoad, vLane);
            roadPaint = paint;
          #endif
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.93, 0.88), paint);
        }`);
  };
  m.customProgramCacheKey = () => `road-lines-${lines ? 1 : 0}`;
}

/** The far vista hazes at this share of the fog's rate: out at 400 to 600 m the full fog washed a landmark to a pale shape. */
const VISTA_HAZE = 0.55;

/** A material hazes at `k` of the scene fog's rate (a linear or an exponential fog). */
function lessHaze(m: Material, k: number): void {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float hazeK = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float hazeK = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, hazeK * ${k.toFixed(2)} );
#endif`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|haze${k.toFixed(2)}`;
}

/** A geometry's widest reach across the ground from its own vertical axis (cached on the geometry). */
function reachOf(g: BufferGeometry): number {
  const cached = g.userData.groundReach as number | undefined;
  if (cached !== undefined) return cached;
  const p = g.getAttribute('position');
  let r = 0;
  for (let i = 0; i < p.count; i++) r = Math.max(r, Math.hypot(p.getX(i), p.getZ(i)));
  g.userData.groundReach = r;
  return r;
}

/** Placeholder geometries the scene made itself; caller-owned `assets` geometries are never disposed. */
const OWNED = new WeakSet<BufferGeometry>();

/**
 * Toon material for a geometry: its own vertex colours when it carries them, else the palette colour.
 * `dither`: it dissolves near the lens (glow.ts); off for what fades as a ghost instead (ghost.ts).
 */
function toon(geometry: BufferGeometry, colour: Rgb, gradientMap: Texture | undefined, dither = true): MeshToonMaterial {
  const vc = geometry.hasAttribute('color');
  const m = new MeshToonMaterial({ color: vc ? 0xffffff : toColor(colour), vertexColors: vc, gradientMap: gradientMap ?? null });
  if (vc) glowFromVertexColours(m); // lamp globes, bulbs and neon signs light themselves (glow.ts)
  if (dither) fadeNearCamera(m); // and nothing fills the screen when the camera brushes past it
  return m;
}

let GRADIENT: Texture | undefined; // set per buildTrackScene call from assets.gradientMap

function instancer(name: string, geometry: BufferGeometry, colour: Rgb, matrices: Float32Array, capacity = matrices.length / 16, own?: Material, dither = true): InstancedMesh {
  const mat = own ?? toon(geometry, colour, GRADIENT, dither);
  const m = new InstancedMesh(geometry, mat, Math.max(1, capacity));
  if (own) m.userData.sharedMaterial = true;
  m.name = name;
  m.count = matrices.length / 16;
  (m.instanceMatrix.array as Float32Array).set(matrices.subarray(0, Math.min(matrices.length, m.instanceMatrix.array.length)));
  m.instanceMatrix.needsUpdate = true;
  m.castShadow = true;
  return m;
}

/**
 * The merged dressing: each copy goes to the slice of the track round its centre that holds it, near
 * the road (casting shadows, as the roadside instancers do) or far from it (no shadows), and each
 * slice is one static mesh with its own toon material; the renderer culls a slice off screen.
 */
function buildDressing(items: readonly { item: MergeItem; far: boolean }[], lut: Track['branches']['main']['lut']): Mesh[] {
  if (items.length === 0) return [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < lut.n; i++) {
    minX = Math.min(minX, lut.px[i]); maxX = Math.max(maxX, lut.px[i]);
    minZ = Math.min(minZ, lut.pz[i]); maxZ = Math.max(maxZ, lut.pz[i]);
  }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const out: Mesh[] = [];
  for (const far of [false, true]) {
    const slices = far ? DRESSING_SLICES.far : DRESSING_SLICES.near;
    const buckets: MergeItem[][] = Array.from({ length: slices }, () => []);
    for (const { item, far: f } of items) {
      if (f !== far) continue;
      const per: number[][] = Array.from({ length: slices }, () => []);
      for (let i = 0; i < item.count; i++) per[sliceOf(item.matrices[i * 16 + 12], item.matrices[i * 16 + 14], cx, cz, slices)].push(i);
      per.forEach((ids, k) => {
        if (ids.length === 0) return;
        const mats = new Float32Array(ids.length * 16);
        ids.forEach((i, n) => mats.set(item.matrices.subarray(i * 16, i * 16 + 16), n * 16));
        buckets[k].push({ geometry: item.geometry, matrices: mats, count: ids.length });
      });
    }
    buckets.forEach((b, k) => {
      const g = mergeInstances(b);
      if (!g) return;
      OWNED.add(g);
      const m = new Mesh(g, toon(g, [1, 1, 1], GRADIENT));
      m.name = `dressing:${far ? 'far' : 'near'}:${k}`;
      m.castShadow = !far;
      m.receiveShadow = true;
      // (it takes the sun's shadows, as the instanced props do not: its faces turned from the sun striped with acne, glow.ts)
      sunlessBackFaces(m.material as MeshToonMaterial);
      out.push(m);
    });
  }
  return out;
}

/** Would the renderer issue a draw call for this object? Visible, and for instancers at least one instance. */
export function isDrawn(m: Mesh): boolean {
  if (!m.isMesh || !m.visible) return false;
  const im = m as InstancedMesh;
  return !im.isInstancedMesh || im.count > 0;
}

/** Free everything a mesh owns: its material (and a texture made for it alone), its geometry if the scene made it, its instance buffer. */
function retire(m: Mesh): void {
  (m.userData.nearGhost as NearGhost | undefined)?.dispose(); // its see-through copies (ghost.ts)
  m.removeFromParent();
  if (m.userData.ownMap) (m.material as MeshBasicMaterial).map?.dispose();
  if (!m.userData.sharedMaterial) (m.material as MeshToonMaterial).dispose();
  const hull = m.userData.hull as Mesh | undefined;
  if (hull) { hull.parent?.remove(hull); retire(hull); }
  if (OWNED.has(m.geometry)) m.geometry.dispose();
  if ((m as InstancedMesh).isInstancedMesh) (m as InstancedMesh).dispose();
}

const PAD = new Matrix4(), PAD_X = new Vector3(), PAD_Y = new Vector3(), PAD_Z = new Vector3(), PAD_P = new Vector3(), PAD_O = new Vector3();

/** slots[k] = index of the k-th drawn feature among every feature of its kind (closed shortcuts leave gaps) */
function featureMatrices(track: Track, kind: BakedFeature['kind'], slots?: number[]): Float32Array {
  const out: number[] = [];
  let j = -1;
  for (const f of track.features) {
    if (f.kind !== kind) continue;
    j++;
    if (f.branch !== 0 && !track.branches.list[f.branch]?.open) continue; // a closed shortcut hides its balloons and coins
    slots?.push(j);
    const c = track.sample(f.t, 0, f.branch);
    const yaw = headingOf(c.tangent);
    if (kind === 'pickup') pushTransform(out, [f.position[0], f.position[1] + BUILDER.balloonHeight, f.position[2]], yaw);
    else if (kind === 'coin') pushTransform(out, [f.position[0], f.position[1] + BUILDER.coinRadius + 0.2, f.position[2]], yaw);
    else if (kind === 'boostPad') {
      // a pad lies on the road (bug hunt 3: turned by yaw alone, one end sank into a steep or banked
      // road and the other stood up to half a metre over it): back to front along its own lane, side
      // to side across the bank, raised just clear of the road at its edges and corners (a changing
      // bank twists the road under it, a dip bends it)
      const b = track.branches.list[f.branch], L = b.lut, u = b.toLocal(f.t), du = BUILDER.boostPadHalfLength / L.length, hw = f.width / 2;
      const at = (a: number, c: number) => PAD_P.fromArray(L.sample(u + a * du, f.lateral + c * hw).position);
      PAD_Z.copy(at(1, 0)).sub(at(-1, 0));
      PAD_X.copy(at(0, 1)).sub(at(0, -1));
      PAD_Y.crossVectors(PAD_Z, PAD_X).normalize();
      const mid = PAD_O.copy(at(0, 0));
      let lift = 0;
      for (const a of [-1, 0, 1]) for (const c of [-1, 0, 1]) lift = Math.max(lift, at(a, c).sub(mid).addScaledVector(PAD_Z, -a / 2).addScaledVector(PAD_X, -c / 2).dot(PAD_Y));
      PAD.makeBasis(PAD_X, PAD_Y, PAD_Z).setPosition(mid.addScaledVector(PAD_Y, lift));
      for (let k = 0; k < 16; k++) out.push(PAD.elements[k]);
    } else pushTransform(out, f.position, yaw, [f.width, 1, 1]);
  }
  return Float32Array.from(out);
}

/**
 * Planks across the road: a 1 × 256 shade strip along the track (v runs 1 per roadTileLength), 16
 * planks a tile (about 60 cm each) with a thin soft gap (about 4 cm) and a little tone change each,
 * multiplied over the vertex colours. A wide gap reads as a black band right under the camera.
 */
function plankTexture(): DataTexture {
  const px = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const plank = i >> 4, gap = (i & 15) === 15;
    const shade = gap ? 150 : 226 + ((plank * 37) % 5) * 6;
    px.set([shade, shade, shade, 255], i * 4);
  }
  const t = new DataTexture(px, 1, 256, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/**
 * A decor instancer as the Low tier sees it (TrackScene.cull): every copy as placed, each copy's
 * bounding sphere in the world, which copies Low keeps at all (the far and sky bands every other one:
 * placed in little groups, so every other one thins each group evenly), and the copies it drew last.
 */
interface Pool {
  mesh: InstancedMesh;
  /** the ink hull sharing its copies' matrices (withHull), whose count follows */
  hull: InstancedMesh | null;
  full: Float32Array;
  n: number;
  /** x, y, z, r per copy, made on the first Low frame */
  spheres: Float32Array | null;
  keep: Uint8Array;
  /** the copies drawn, in order (the first `count`) */
  shown: Int32Array;
  count: number;
  thinned: boolean;
}

/** Bands the Low tier keeps every other copy of: out past the scenery, where half as many still reads as a skyline. */
const THIN_BANDS: ReadonlySet<string> = new Set(['far', 'sky']);
/**
 * At Low a copy smaller than this share of the screen's half height is not drawn (about 2 px across
 * at 720 lines): a tuft or a pebble patch 100 m off, never a tree, a house or a windmill in sight.
 */
export const LOW_MIN_SIZE = 0.006;

function newPool(mesh: InstancedMesh, band: string): Pool {
  const n = mesh.count, keep = new Uint8Array(n);
  for (let i = 0; i < n; i++) keep[i] = !THIN_BANDS.has(band) || i % 2 === 0 ? 1 : 0;
  const hull = (mesh.userData.hull as InstancedMesh | undefined) ?? null;
  return { mesh, hull: hull?.isInstancedMesh ? hull : null, full: Float32Array.from((mesh.instanceMatrix.array as Float32Array).subarray(0, n * 16)), n, spheres: null, keep, shown: new Int32Array(n), count: n, thinned: false };
}

/**
 * The Low tier's cull runs again only once the view could show something new: it is set for a view
 * `margin` degrees wider than the lens's, so between runs the lens may move `move` metres or turn
 * `turn` degrees (or `frames` frames pass) and no copy it should show is missing. A cut (the intro's,
 * a respawn) moves or turns it past both at once. Most frames then cost nothing and upload nothing.
 */
export const LOW_RECULL = Object.freeze({ margin: 10, move: 2, turn: 4, frames: 10 });
const CULL_PV = new Matrix4(), CULL_PROJ = new Matrix4(), CULL_FRUSTUM = new Frustum(), CULL_M = new Matrix4(), CULL_V = new Vector3(), CULL_EYE = new Vector3(), CULL_DIR = new Vector3();
/** the view's six planes as (nx, ny, nz, constant), from CULL_FRUSTUM once a frame: tested inline, no objects per copy */
const CULL_PLANES = new Float32Array(24);

/** Each copy's bounding sphere in the world (its geometry's, through its matrix); the instancer's own bound over every copy first, so three never shrinks it to the copies drawn. */
function poolSpheres(p: Pool): Float32Array {
  const g = p.mesh.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  if (!p.mesh.boundingSphere) p.mesh.computeBoundingSphere();
  const c = g.boundingSphere!.center, r = g.boundingSphere!.radius, out = new Float32Array(p.n * 4);
  for (let i = 0; i < p.n; i++) {
    CULL_M.fromArray(p.full, i * 16);
    CULL_V.copy(c).applyMatrix4(CULL_M);
    out[i * 4] = CULL_V.x; out[i * 4 + 1] = CULL_V.y; out[i * 4 + 2] = CULL_V.z;
    out[i * 4 + 3] = r * CULL_M.getMaxScaleOnAxis();
  }
  return out;
}

/**
 * Draw only the kept copies in view (`planes`: CULL_PLANES), big enough to see from the eye at (ex,
 * ey, ez) (`reach`: metres of distance a metre of radius stays visible) and nearer than `fogFar` (past
 * it, all fog), packed to the front of the instance buffer, uploaded only when the set changes.
 */
function cullPool(p: Pool, planes: Float32Array, ex: number, ey: number, ez: number, reach: number, fogFar: number): void {
  const sp = (p.spheres ??= poolSpheres(p)), keep = p.keep, shown = p.shown;
  let k = 0, changed = !p.thinned;
  copies: for (let i = 0; i < p.n; i++) {
    if (!keep[i]) continue;
    const o = i * 4, x = sp[o], y = sp[o + 1], z = sp[o + 2], r = sp[o + 3], far = Math.min(r * reach, fogFar + r);
    const dx = x - ex, dy = y - ey, dz = z - ez;
    if (dx * dx + dy * dy + dz * dz > far * far) continue;
    // wholly behind any one plane of the view: out (three's Frustum.intersectsSphere, inline)
    for (let q = 0; q < 24; q += 4) if (planes[q] * x + planes[q + 1] * y + planes[q + 2] * z + planes[q + 3] < -r) continue copies;
    if (shown[k] !== i) { shown[k] = i; changed = true; }
    k++;
  }
  if (k !== p.count) changed = true;
  p.thinned = true;
  p.count = k;
  if (changed) {
    const a = p.mesh.instanceMatrix.array as Float32Array, f = p.full;
    for (let j = 0; j < k; j++) { const from = shown[j] * 16, to = j * 16; for (let c = 0; c < 16; c++) a[to + c] = f[from + c]; }
    p.mesh.instanceMatrix.clearUpdateRanges();
    if (k > 0) p.mesh.instanceMatrix.addUpdateRange(0, k * 16);
    p.mesh.instanceMatrix.needsUpdate = true;
  }
  p.mesh.count = k;
  // none in view: no draw at all (an instancer of no copies still binds its program and draws nothing)
  p.mesh.visible = k > 0;
  if (p.hull) { p.hull.count = k; p.hull.visible = k > 0; }
}

/** Every copy as placed again (the tier left Low). */
function restorePool(p: Pool): void {
  if (!p.thinned) return;
  p.thinned = false;
  (p.mesh.instanceMatrix.array as Float32Array).set(p.full);
  p.mesh.instanceMatrix.clearUpdateRanges();
  p.mesh.instanceMatrix.needsUpdate = true;
  p.count = p.n;
  p.mesh.count = p.n;
  p.mesh.visible = true;
  if (p.hull) { p.hull.count = p.n; p.hull.visible = true; }
}

export function buildTrackScene(track: Track, assets: TrackAssets = {}): TrackScene {
  const def = track.def;
  const env = def.environment ?? {};
  const palette = paletteFor(def);
  const group = new Group();
  group.name = `track-${def.id}`;
  const instancers = new Map<string, InstancedMesh>();
  const branches = track.branches;

  GRADIENT = assets.gradientMap;
  /** an ink hull that shares the model's instance matrices, so it follows it for free */
  const withHull = <T extends Mesh>(src: T, key: string): T => {
    const hg = assets.hulls?.[key];
    if (!hg || !assets.ink) return src;
    let hull: Mesh;
    if ((src as unknown as InstancedMesh).isInstancedMesh) {
      const im = src as unknown as InstancedMesh;
      const h = new InstancedMesh(hg, assets.ink, im.instanceMatrix.count);
      h.instanceMatrix = im.instanceMatrix;
      h.count = im.count;
      hull = h;
    } else {
      hull = new Mesh(hg, assets.ink);
      hull.position.copy(src.position);
      hull.rotation.copy(src.rotation);
      hull.scale.copy(src.scale);
    }
    hull.name = `${src.name}:ink`;
    hull.userData.sharedMaterial = true;
    src.userData.hull = hull;
    (src.parent ?? group).add(hull);
    return src;
  };

  // road chunks: one shared toon material, vertex colours
  const roadMaterial = new MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT ?? null });
  if (PLANKED.has(def.biome)) roadMaterial.map = plankTexture();
  else if (assets.roadMap) roadMaterial.map = assets.roadMap;
  paintRoadLines(roadMaterial, palette, !PLANKED.has(def.biome), EDGES[def.biome] ?? EDGES.harbour, def.offroad === true);
  assets.road?.(roadMaterial);
  const chunks: Chunk[] = [];
  for (const b of branches.list) chunks.push(...buildBranchChunks(b, branches.main, palette, roadMaterial));
  for (const c of chunks) group.add(c.mesh);
  /** bitmask of open branches; when it changes (lap gating or a shift) visibility, barriers and features follow */
  const openMask = () => branches.list.reduce((m, b, i) => (b.open ? m | (1 << i) : m), 0);
  let lastOpen = openMask();
  /** shortcuts the Final Lap Shift closes that stay drawn once it has (flooded, blocked: the stage says) */
  let keeps: ReadonlySet<number> = new Set();
  const syncOpen = () => {
    for (const c of chunks) if (c.branch !== 0) c.mesh.visible = branches.list[c.branch].open || (track.shifted && keeps.has(c.branch));
  };
  syncOpen();

  // barriers (open branches only, so a closed shortcut loses its posts with its road)
  let boundary: Mesh | null = null;
  const addBarriers = () => {
    const old = instancers.get('barriers');
    if (old) retire(old);
    // no posts along any road (Adam, 23 Sept 2026: "I still see stumps"): an off-road track is lined
    // by its scenery, a pier or a sky road by a solid low edge (boundary.ts)
    const posts = new Float32Array(0);
    const m = instancer('barriers', geometryFor(assets, `${def.biome}-barrier`, 'barrier'), palette.barrier, posts);
    instancers.set('barriers', m);
    group.add(m);
    withHull(m, `${def.biome}-barrier`);
    // a pier or a sky road: a solid low edge along the road (boundary.ts), rebuilt when a shortcut
    // opens or closes; an off-road track has none (the course limit is invisible, the scenery lines it)
    if (boundary) retire(boundary);
    boundary = def.offroad ? null : buildBoundary(branches, def.biome, GRADIENT ?? null);
    if (boundary) { OWNED.add(boundary.geometry); group.add(boundary); }
  };
  addBarriers();

  // decor: one instancer per asset, seeded by the track id
  // the ground plane (terrain.ts): on an off-road track it sits under the lowest curb
  const groundY = Number.isFinite(track.groundPlaneY) ? track.groundPlaneY : env.ground?.y ?? 0;
  const groundKind = env.ground?.kind ?? 'plane';
  // the land around the road: a sea track's coast, a land track's hills under its raised road
  const land = LAND[def.biome];
  const rises = branches.main.lut.maxY - groundY > LAND_MIN_RISE;
  // the land stays under a road the race can hide (a closing shortcut, a road a route override replaces)
  const hideable = hideableRoads(branches, def.finalLapShift, track.shifted);
  const coastOpts: CoastOptions | null = groundKind === 'none' ? null
    : groundKind === 'water' ? { waterY: groundY, flat: COAST.flat, slope: COAST.slope, cell: COAST.cell, wet: true, offroad: def.offroad === true, land: track.land, hideable }
    : land && rises ? { waterY: groundY, flat: COAST.flat, slope: land.slope, cell: COAST.cell, strata: land.strata, offroad: def.offroad === true, land: track.land, hideable } : null;
  // an off-road track's scenery stands on the land as drawn (a banked corner's low side is lower)
  const offLand = track.land && coastOpts ? track.land : null;
  const groundAt = offLand && coastOpts ? (x: number, z: number) => Math.max(groundY, landAt(offLand, coastOpts, x, z)?.y ?? -Infinity) : undefined;
  const rng = mulberry32(hashString(def.id));
  const decor: DecorPlacement[] = [];
  /** the decor instancers (and their piers) the Low tier thins (cull) */
  const pools: Pool[] = [];
  const toMerge: { item: MergeItem; far: boolean }[] = [];
  let farLandmark: [number, number, number] | undefined;
  let vistaParts: VistaParts | undefined;
  const occupied = new Occupancy();
  for (const entry of env.decor ?? []) {
    const geo = geometryFor(assets, entry.asset, 'decor');
    // how far the prop reaches from its centre across the ground: a roadside one stands clear of where karts drive
    if (!geo.boundingBox) geo.computeBoundingBox();
    // (its widest reach from its own axis, not its box's: turned by a random yaw, a square prop's
    // corners reach √2 further, and a chalet's eaves hung over the course limit into the lens's path)
    const bb = geo.boundingBox!, footprint = reachOf(geo);
    const extent = { across: Math.max(-bb.min.x, bb.max.x, 0), along: Math.max(-bb.min.z, bb.max.z, 0) };
    const p = placeDecor(branches, entry, rng, groundY, groundAt, footprint, extent, occupied);
    decor.push(p);
    // the PBR look's grass by the road (below) takes the place of this ground cover
    if (entry.band === 'verge' && assets.grass?.replaces.includes(entry.asset)) continue;
    // a code-built prop marked `merge` joins the merged dressing: no instancer of its own
    if (entry.merge && geo.hasAttribute('color') && !assets.materials?.[entry.asset]) {
      // the roadside band and spans cast shadows, as the roadside instancers do; far scenery and ground cover do not
      if (p.count > 0) toMerge.push({ item: { geometry: geo, matrices: p.matrices, count: p.count }, far: entry.band === 'far' || entry.band === 'verge' });
      continue;
    }
    const m = instancer(`decor:${entry.asset}`, geo, palette.decor, p.matrices, undefined, assets.materials?.[entry.asset]);
    // an instancer is never culled per instance, so every copy is drawn into the shadow map each
    // frame: only the roadside band is near enough for its shadows to be seen
    m.castShadow = entry.band === 'roadside';
    instancers.set(m.name, m);
    group.add(m);
    withHull(m, entry.asset);
    if (m.count > 0) pools.push(newPool(m, entry.band));
    if (entry.footing === 'pier') {
      // each one out at sea stands on its own pier, sized to what stands on it
      const box = m.geometry.boundingBox ?? (m.geometry.computeBoundingBox(), m.geometry.boundingBox!);
      const radius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.55 + 0.6;
      const pier = new InstancedMesh(buildPier(radius, BUILDER.pierLift), new MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT ?? null }), p.count);
      OWNED.add(pier.geometry);
      pier.instanceMatrix.set(p.matrices.subarray(0, p.count * 16));
      pier.name = `pier:${entry.asset}`;
      pier.receiveShadow = true;
      group.add(pier);
      if (p.count > 0) pools.push(newPool(pier, entry.band));
    }
  }

  const dressing = buildDressing(toMerge, branches.main.lut);
  for (const m of dressing) group.add(m);

  // the PBR look's grass by the road (verge.ts, art-pipeline grass.ts): one instancer of tufts along the
  // curbs, no shadow of its own; each tuft's flowers and seed ride in `aTuft`
  if (assets.grass && def.offroad) {
    const g = placeGrass(branches, def.id, groundAt, track.jumps);
    if (g.count > 0) {
      const geo = assets.grass.geometry.clone();
      geo.setAttribute('aTuft', new InstancedBufferAttribute(g.kinds, 2));
      OWNED.add(geo);
      const m = new InstancedMesh(geo, assets.grass.material, g.count);
      (m.instanceMatrix.array as Float32Array).set(g.matrices);
      m.instanceMatrix.needsUpdate = true;
      m.name = 'verge-grass';
      m.userData.sharedMaterial = true;
      m.castShadow = false;
      m.receiveShadow = true;
      instancers.set(m.name, m);
      group.add(m);
      pools.push(newPool(m, 'verge'));
    }
  }

  // features: balloons, coins, glowing boost pads; ramps and trick bumps are merged meshes
  const featureNames: [string, BakedFeature['kind'], string, Rgb][] = [
    ['balloons', 'pickup', 'balloon', palette.accent],
    ['coins', 'coin', 'coin', [1, 0.84, 0.2]],
    ['boostPads', 'boostPad', 'boostPad', palette.surfaces.boost],
  ];
  const featureSlots = new Map<string, { slots: number[]; mats: Float32Array }>();
  // one uniform for every balloon and coin material, so a rebuilt instancer keeps the night glow
  const pickupGlow = { value: 0 };
  let glowTo = 0, glowNow = 0, glowTime = 0;
  let jumpMeshes: Mesh[] = [];
  /** the jumps a Final Lap Shift adds that its stage draws (it raises them: shiftStage.ts), left out of the merged ramps */
  let ownsJumps: ReadonlySet<string> = new Set();
  /** `src`'s balloons, coins and pads as instancers (and their slots) and its ramps and bumps, made but not yet in the scene */
  type FeatureSet = { made: { name: string; m: InstancedMesh | null; slots: number[]; mats: Float32Array }[]; jumps: Mesh[] };
  const makeFeatures = (src: Track): FeatureSet => {
    const made: FeatureSet['made'] = [];
    for (const [name, kind, geo, colour] of featureNames) {
      const slots: number[] = [];
      const mats = featureMatrices(src, kind, slots);
      if (mats.length === 0) { made.push({ name, m: null, slots, mats }); continue; }
      let m: InstancedMesh;
      if (kind === 'boostPad') {
        // a flat panel that glows, its chevrons scrolling forward (ramps.ts)
        const panel = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0.035, 0);
        OWNED.add(panel);
        m = instancer(name, panel, colour, mats, undefined, padMaterial());
        m.userData.sharedMaterial = false;
        m.castShadow = false;
      } else {
        m = instancer(name, geometryFor(assets, geo), colour, mats, undefined, undefined, false);
        if (!m.userData.sharedMaterial) {
          selfLit(m.material as MeshToonMaterial, pickupGlow);
          // near the lens a balloon or a coin fades out as a clean ghost, not a stipple (ghost.ts, TrackScene.lens)
          new NearGhost(m, PICKUP_GHOST.race[0], PICKUP_GHOST.race[1]);
        }
      }
      made.push({ name, m, slots, mats });
    }
    const jumps = buildJumpMeshes(src, palette, GRADIENT ?? null, (f) => !ownsJumps.has(f.id));
    for (const m of jumps) OWNED.add(m.geometry);
    return { made, jumps };
  };
  /** Put a feature set on show in place of the one there. */
  const installFeatures = (set: FeatureSet) => {
    for (const { name, m, slots, mats } of set.made) {
      const old = instancers.get(name);
      if (old && old !== m) retire(old);
      featureSlots.set(name, { slots, mats });
      if (!m) { instancers.delete(name); continue; }
      m.visible = true;
      instancers.set(name, m);
      if (m.parent !== group) group.add(m);
    }
    for (const m of jumpMeshes) { (m.material as MeshToonMaterial).map?.dispose(); retire(m); }
    jumpMeshes = set.jumps;
    for (const m of jumpMeshes) { m.visible = true; if (m.parent !== group) group.add(m); }
  };
  const addFeatures = () => installFeatures(makeFeatures(track));
  addFeatures();
  // loop-the-loops: the ring, its neon rails, its gantries
  for (const m of buildLoopMeshes(track, GRADIENT ?? null)) { OWNED.add(m.geometry); group.add(m); }

  // hazards: one instancer per asset, capacity = authored count, moved by update(time)
  const hazardAsset = new Map<string, string>();
  const hazardCapacity = new Map<string, number>();
  (def.hazards ?? []).forEach((h, i) => {
    if (h.type === 'creature' || h.type === 'vent') return; // drawn by the CreatureView and the VentView below
    const asset = h.asset ?? h.type;
    hazardAsset.set(h.id ?? `hazard-${i}`, asset);
    hazardCapacity.set(asset, (hazardCapacity.get(asset) ?? 0) + 1);
  });
  // hazards move every frame: dynamic buffer, never frustum-culled (the lazy bounding
  // sphere would freeze on frame one), hazard id → instancer resolved once
  const hazardMeshes: InstancedMesh[] = [];
  const hazardMeshByAsset = new Map<string, number>();
  for (const [asset, cap] of hazardCapacity) {
    const m = instancer(`hazard:${asset}`, geometryFor(assets, asset, 'hazard'), palette.accent, new Float32Array(0), cap, undefined, false);
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(DynamicDrawUsage);
    // a barrel, hay bale or snowball rolled past the kart, a mine cart or bumper car crossing, fades at
    // the lens as a creature does (a whole barrel filled a third of the frame, solid, until 2.6 m)
    if (!m.userData.sharedMaterial) new NearGhost(m, CREATURE_GHOST.near, CREATURE_GHOST.fade);
    hazardMeshByAsset.set(asset, hazardMeshes.length);
    hazardMeshes.push(m);
    instancers.set(m.name, m);
    group.add(m);
  }
  const hazardMeshById = new Map<string, InstancedMesh>();
  for (const [id, asset] of hazardAsset) hazardMeshById.set(id, hazardMeshes[hazardMeshByAsset.get(asset)!]);
  // a falling rock drops for fallingWarnSeconds before it lands (hazards.ts fallingPhase), its shadow
  // growing on the spot: it never blinks onto the road unwarned (bug hunt 2, 24 Sept 2026)
  const drops = track.hazards.falling(0).length;
  const dropShadows = drops ? new InstancedMesh(
    new SphereGeometry(1, 20, 6).scale(1, 0.02, 1),
    new MeshBasicMaterial({ color: 0x14101c, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    drops,
  ) : null;
  if (dropShadows) {
    dropShadows.name = 'hazard:shadow';
    dropShadows.frustumCulled = false;
    dropShadows.instanceMatrix.setUsage(DynamicDrawUsage);
    dropShadows.count = 0;
    OWNED.add(dropShadows.geometry);
    group.add(dropShadows);
  }
  const hazardCounts = new Int32Array(hazardMeshes.length);
  const scratch = new Matrix4();
  // rolling hazards keep their own spin between frames (visual only)
  const rolls = new Map<string, { x: number; z: number; q: Quaternion }>();
  const rollQ = new Quaternion(), rollAxis = new Vector3(), rollPos = new Vector3(), rollScale = new Vector3(1, 1, 1);
  const hidden = new Matrix4().makeScale(0, 0, 0);
  // popped balloons and taken coins vanish until their timer runs out
  const syncLive = (name: string, timers: readonly { respawnRemaining: number }[] | undefined) => {
    const m = instancers.get(name), fs = featureSlots.get(name);
    if (!m || !fs || !timers) return;
    for (let k = 0; k < fs.slots.length; k++) {
      const gone = (timers[fs.slots[k]]?.respawnRemaining ?? 0) > 0;
      if (gone) m.setMatrixAt(k, hidden);
      else { scratch.fromArray(fs.mats, k * 16); m.setMatrixAt(k, scratch); }
    }
    m.instanceMatrix.needsUpdate = true;
  };
  // the course creature (design §6): its model, posed from its script every frame
  const creatures = track.hazards.creatures.length
    ? new CreatureView(track, (kind) => geometryFor(assets, kind, 'decor'), (kind) => assets.materials?.[kind], GRADIENT)
    : null;
  if (creatures) group.add(creatures.group);
  // launch vents: rim, glow and column, posed from race time like the sim
  const vents = track.hazards.vents(0).length ? new VentView(track, GRADIENT) : null;
  if (vents) group.add(vents.group);
  // start/finish: a checkered band across the road under an arch, and the start lamps that count
  // the race down from race time (gantry.ts)
  const startLine = buildStartGantry(track, palette, GRADIENT ?? null);
  const startLamps = startLine.getObjectByName('start-lamps') as InstancedMesh;
  OWNED.add(startLine.geometry);
  OWNED.add(startLamps.geometry);
  group.add(startLine);

  const update = (time: number, active: readonly ActiveHazard[] = track.activeHazards(time), live?: LiveFeatures) => {
    creatures?.update(time);
    setStartLamps(startLamps, time);
    vents?.update(time);
    tickPads(time);
    const dt = Math.min(0.1, Math.max(0, time - glowTime));
    glowTime = time;
    glowNow += (glowTo - glowNow) * (1 - Math.exp(-dt * PICKUP_EASE));
    pickupGlow.value = glowNow * (1 + PICKUP_PULSE * Math.sin((time / PICKUP_PULSE_S) * Math.PI * 2));
    const open = openMask();
    if (open !== lastOpen) { lastOpen = open; syncOpen(); addBarriers(); addFeatures(); assets.look?.(group); }
    if (live) { syncLive('balloons', live.pickups); syncLive('coins', live.coins); }
    hazardCounts.fill(0);
    for (const h of active) {
      if (h.type === 'gust') continue;
      const m = hazardMeshById.get(h.id);
      if (!m) continue;
      const k = hazardMeshByAsset.get(hazardAsset.get(h.id)!)!;
      const i = hazardCounts[k];
      if (i * 16 >= m.instanceMatrix.array.length) continue;
      if (h.type === 'rolling') {
        // a snowball or a barrel turns as it goes: roll it by the distance it moved since last frame
        const r = rolls.get(h.id) ?? { x: h.position[0], z: h.position[2], q: new Quaternion() };
        const dx = h.position[0] - r.x, dz = h.position[2] - r.z, d = Math.hypot(dx, dz);
        if (d > 1e-4 && d < 5) r.q.premultiply(rollQ.setFromAxisAngle(rollAxis.set(dz / d, 0, -dx / d), d / h.radius));
        r.x = h.position[0]; r.z = h.position[2];
        rolls.set(h.id, r);
        scratch.compose(rollPos.set(h.position[0], h.position[1] + h.radius, h.position[2]), r.q, rollScale);
      } else scratch.makeTranslation(h.position[0], h.position[1] + h.radius, h.position[2]);
      m.setMatrixAt(i, scratch);
      hazardCounts[k] = i + 1;
    }
    // falling rocks on their way down: the rock over its spot, gathering speed, its shadow growing under it
    if (dropShadows) {
      let shadows = 0;
      for (const f of track.hazards.falling(time)) {
        if (f.state !== 'drop') continue;
        const m = hazardMeshById.get(f.id);
        if (!m) continue;
        const k = hazardMeshByAsset.get(hazardAsset.get(f.id)!)!;
        const i = hazardCounts[k];
        if (i * 16 >= m.instanceMatrix.array.length) continue;
        const [x, y, z] = f.position;
        m.setMatrixAt(i, scratch.makeTranslation(x, y + BUILDER.hazardRadius + BUILDER.fallingHeight * (1 - f.k * f.k), z));
        hazardCounts[k] = i + 1;
        const r = BUILDER.hazardRadius * (0.4 + 0.8 * f.k);
        dropShadows.setMatrixAt(shadows++, scratch.makeScale(r, 1, r).setPosition(x, y + 0.04, z));
      }
      dropShadows.count = shadows;
      dropShadows.instanceMatrix.needsUpdate = true;
    }
    hazardMeshes.forEach((m, k) => {
      m.count = hazardCounts[k];
      m.instanceMatrix.needsUpdate = true;
    });
  };
  update(0);

  // a mine (a shortcut's tunnel): rock bore, timber frames, lanterns (tunnel.ts); the mesa over it is the land
  const tunnels = buildTunnels(track.tunnels, GRADIENT ?? null, groundAt);
  if (tunnels) { OWNED.add(tunnels.geometry); group.add(tunnels); }

  // ground: one plane (or water), none for sky tracks
  if (groundKind !== 'none') {
    const own = assets.ground?.(groundKind, GROUND_SIZE);
    const ground = new Mesh(new PlaneGeometry(GROUND_SIZE, GROUND_SIZE).rotateX(-Math.PI / 2), own ?? new MeshToonMaterial({ color: toColor(palette.ground), gradientMap: GRADIENT ?? null }));
    if (own) ground.userData.sharedMaterial = true;
    OWNED.add(ground.geometry);
    ground.name = `ground-${groundKind}`;
    ground.position.y = groundY;
    ground.receiveShadow = true;
    group.add(ground);
    // a sea track gets a coast along the road, a land track hills under its raised road, so every
    // roadside prop stands on ground and no road floats
    const coastGeo = coastOpts ? buildCoast(branches, coastOpts) : null;
    if (coastGeo) {
      OWNED.add(coastGeo);
      const own = assets.coast?.();
      const coast = new Mesh(coastGeo, own ?? new MeshToonMaterial({ color: toColor(palette.shoulder), vertexColors: true, gradientMap: GRADIENT ?? null }));
      if (own) coast.userData.sharedMaterial = true;
      coast.name = 'coast';
      coast.receiveShadow = true;
      group.add(coast);
    }
  }

  // sky: one dome
  // unlit: a toon sky would shade darker away from the sun
  const sky = new Mesh(new SphereGeometry(SKY_RADIUS, 24, 12), new MeshBasicMaterial({ color: toColor(palette.background), side: BackSide, fog: false }));
  OWNED.add(sky.geometry);
  sky.name = 'sky';
  group.add(sky);

  // the far horizon: hills, mesas, peaks, headlands, a city or clouds, riding with the camera
  // like the dome (main.ts); hazed toward the fog colour
  {
    const fogHex = env.fogColor && HEX.test(env.fogColor) ? env.fogColor : null;
    const hz = fogHex ? new Color(fogHex) : new Color().setRGB(palette.background[0], palette.background[1], palette.background[2], SRGBColorSpace);
    const baseY = groundKind === 'none' ? branches.main.lut.minY - 80 : groundY;
    // the sun's compass direction (main.ts sunOffset, the same default) lights one flank of each peak
    const sunAz = Math.atan2(env.sunDirection?.[2] ?? 0.3, env.sunDirection?.[0] ?? 0.4);
    let horizon = buildBackdrop(def.biome, baseY, [hz.r, hz.g, hz.b], sunAz);
    if (horizon) { for (const c of horizon.children) OWNED.add((c as Mesh).geometry); group.add(horizon); }

    // the far vista (Adam, 24 Sept 2026: "make sure the distance of the environment looks interesting"):
    // set-pieces out past the scenery, what moves out there, and what rides with the ring
    const lut = branches.main.lut;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, radius = 0;
    for (let i = 0; i < lut.n; i++) {
      minX = Math.min(minX, lut.px[i]); maxX = Math.max(maxX, lut.px[i]);
      minZ = Math.min(minZ, lut.pz[i]); maxZ = Math.max(maxZ, lut.pz[i]);
    }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    for (let i = 0; i < lut.n; i++) radius = Math.max(radius, Math.hypot(lut.px[i] - cx, lut.pz[i] - cz));
    const st = lut.sample(track.startT, 0), fl = Math.hypot(st.tangent[0], st.tangent[2]) || 1;
    const sd = env.sunDirection ?? [0.4, 0.8, 0.3], sl = Math.hypot(sd[0], sd[1], sd[2]) || 1;
    const vista = assets.vista?.({
      biome: def.biome, centre: [cx, cz], radius, start: [st.position[0], st.position[2]], forward: [st.tangent[0] / fl, st.tangent[2] / fl],
      groundY: groundKind === 'none' ? NaN : groundY, roadMinY: lut.minY, roadMaxY: lut.maxY,
      sun: [sd[0] / sl, sd[1] / sl, sd[2] / sl], mirrored: def.mirrored === true,
      road: (t) => {
        const c = lut.sample(t, 0), h = Math.hypot(c.tangent[0], c.tangent[2]) || 1;
        const limit = c.halfWidth + BUILDER.kerbWidth + (def.offroad === true ? BUILDER.offroadReach : 0);
        return { p: [c.position[0], c.position[1], c.position[2]], along: [c.tangent[0] / h, c.tangent[2] / h], right: [c.tangent[2] / h, -c.tangent[0] / h], limit };
      },
      groundAt: (x, z) => (groundAt ? groundAt(x, z) : groundY),
      clear: (x, z, r) => !occupied.hits(x, z, r),
    });
    farLandmark = vista?.landmark;
    vistaParts = vista ?? undefined;
    if (vista?.solid) {
      OWNED.add(vista.solid);
      const m = new Mesh(vista.solid, toon(vista.solid, [1, 1, 1], GRADIENT));
      lessHaze(m.material as Material, VISTA_HAZE);
      m.name = 'vista';
      group.add(m);
    }
    for (const m of vista?.world ?? []) { OWNED.add(m.geometry); group.add(m); }
    if (vista?.ring?.length) {
      if (!horizon) { horizon = new Group(); horizon.name = 'horizon'; group.add(horizon); }
      for (const m of vista.ring) { OWNED.add(m.geometry); horizon.add(m); }
    }
  }

  // landmark: at the loop's bounding-box centre on the ground
  if (def.landmark) {
    const lut = branches.main.lut;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < lut.n; i++) {
      if (lut.px[i] < minX) minX = lut.px[i]; if (lut.px[i] > maxX) maxX = lut.px[i];
      if (lut.pz[i] < minZ) minZ = lut.pz[i]; if (lut.pz[i] > maxZ) maxZ = lut.pz[i];
    }
    const lg = geometryFor(assets, def.landmark, 'landmark');
    const own = assets.materials?.[def.landmark];
    const landmark = new Mesh(lg, own ?? toon(lg, palette.accent, GRADIENT));
    if (own) landmark.userData.sharedMaterial = true;
    landmark.name = `landmark-${def.landmark}`;
    // big enough to own the skyline from most of the lap (critique 2026-09-23: landmarks were
    // specks), but never reaching the road: scale up toward its target height, capped so its
    // footprint keeps LANDMARK_CLEAR metres from every road sample
    lg.computeBoundingBox();
    const lb = lg.boundingBox!;
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    let near = Infinity;
    for (const b of branches.list) {
      for (let i = 0; i < b.lut.n; i += 2) near = Math.min(near, Math.hypot(b.lut.px[i] - cx, b.lut.pz[i] - cz) - b.lut.hw[i]);
    }
    const half = Math.max(lb.max.x - lb.min.x, lb.max.z - lb.min.z) / 2;
    const want = (LANDMARK_HEIGHT[def.landmark] ?? 0) / Math.max(1, lb.max.y - lb.min.y);
    const fit = (near - LANDMARK_CLEAR) / Math.max(1, half);
    landmark.scale.setScalar(Math.max(1, Math.min(want, fit)));
    const onPier = env.landmarkFooting === 'pier';
    landmark.position.set((minX + maxX) / 2, groundKind === 'none' ? lut.minY : groundY + (onPier ? BUILDER.pierLift : 0), (minZ + maxZ) / 2);
    if (onPier) {
      lg.computeBoundingBox();
      const b = lg.boundingBox!;
      const pier = new Mesh(buildPier(Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * 0.5 * landmark.scale.x + 2, BUILDER.pierLift), new MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT ?? null }));
      OWNED.add(pier.geometry);
      pier.position.copy(landmark.position);
      pier.name = 'pier:landmark';
      pier.receiveShadow = true;
      group.add(pier);
    }
    landmark.castShadow = true;
    group.add(landmark);
    withHull(landmark, def.landmark);
  }

  // The Final Lap Shift, built ahead: the same track with its shift applied (the twin: the sim's own
  // shift.ts run on a second copy, so nothing the race reads is touched), the shift's set piece
  // (shiftStage.ts), and the twin's road, balloons, coins, pads, ramps and edge made now and hidden, so
  // the race's warm-up compiles and uploads them (performance/warmup.ts) and the shift's tick only swaps
  // them in (its rebuild was the race's one hitch left: Canyon 8 to 14 ms of script on an M4 Pro, 75 ms
  // at 4x CPU).
  const twin = track.shifted ? null : shiftedTwin(def);
  const stage = buildShiftStage({
    track, twin, palette, gradient: GRADIENT ?? null, group, groundY: groundKind === 'none' ? NaN : groundY, groundAt,
    clear: (x, z, r) => !occupied.hits(x, z, r), geometry: (k) => geometryFor(assets, k, 'decor'), material: (k) => assets.materials?.[k],
    roadMaterial, lake: assets.lake,
  }) ?? undefined;
  if (stage) {
    group.add(stage.group);
    keeps = stage.keepsBranches;
    ownsJumps = stage.ownsJumps;
    // the rope bridge's span is the stage's to draw: the road leaves a gap under its planks
    const gap = stage.roadGap;
    if (gap) for (const c of chunks) {
      if (c.branch !== 0) continue;
      const { i0, i1 } = sampleRange(branches.main.lut, c.u0, c.u1);
      if (i1 < gap[0] || i0 > gap[1]) continue;
      c.mesh.geometry.dispose();
      c.mesh.geometry = buildRibbon(branches.main.lut, c.u0, c.u1, palette, { ...ribbonOptions(branches.main), gap });
    }
  }
  /** The twin's new road (its main chunks), features and edge, made now and hidden; swapped in on the shift's tick. */
  const prebuildShift = (tw: Track) => {
    const shift = def.finalLapShift, tm = tw.branches.main;
    const chunkGeos = new Map<number, BufferGeometry>(), holders: Mesh[] = [];
    // a route change moves every main chunk; a surface change only the chunks it touches
    const surfaces = (shift.surfaceOverrides ?? []).map((so) => [so.fromT, so.toT] as [number, number]);
    if (shift.routeOverrides?.length || surfaces.length) {
      for (const c of chunks) {
        if (c.branch !== 0 || (!shift.routeOverrides?.length && !chunkTouched(c, tm, surfaces))) continue;
        const g = buildRibbon(tm.lut, c.u0, c.u1, palette, ribbonOptions(tm));
        OWNED.add(g);
        chunkGeos.set(c.index, g);
        // on show for the warm-up's one draw of everything only (that uploads it)
        const h = new Mesh(g, roadMaterial);
        h.name = `shift-road-${c.index}`;
        h.visible = false;
        h.receiveShadow = true;
        h.userData.sharedMaterial = true;
        group.add(h);
        holders.push(h);
      }
    }
    const features = makeFeatures(tw);
    for (const { m } of features.made) if (m) { m.visible = false; group.add(m); }
    for (const j of features.jumps) { j.visible = false; group.add(j); }
    const edge = def.offroad ? null : buildBoundary(tw.branches, def.biome, GRADIENT ?? null);
    if (edge) { OWNED.add(edge.geometry); edge.visible = false; group.add(edge); }
    const open = tw.branches.list.reduce((m, b, i) => (b.open ? m | (1 << i) : m), 0);
    return { chunkGeos, holders, features, edge, n: tm.lut.n, length: tm.lut.length, count: tw.features.length, open, used: false };
  };
  const pre = twin ? prebuildShift(twin) : null;

  /** whether the Low tier's thinning is on (cull), and the view its last run was for */
  let lowOn = false, sinceCull = 0, lastFov = 0, lastFar = 0;
  const lastEye = new Vector3(Infinity, Infinity, Infinity), lastDir = new Vector3();
  const scene: TrackScene = {
    group, palette, chunks, decor, dressing, farLandmark, vista: vistaParts, instancers,
    fog: { color: env.fogColor && HEX.test(env.fogColor) ? hexToRgb(env.fogColor) : palette.background, density: env.fogDensity ?? 0 },
    sky: env.sky,
    update,
    setPickupGlow: (amount, snap = false) => {
      glowTo = amount;
      if (snap) { glowNow = amount; pickupGlow.value = amount; }
    },
    drawables: () => {
      let n = 0;
      group.traverse((o) => { if (isDrawn(o as Mesh)) n++; });
      return n;
    },
    cull: (camera, low, fogFar = Infinity) => {
      if (low !== lowOn) {
        lowOn = low;
        // the far vista's movers (its fliers, already folded away at Low in its shader) and the crowd (drawn with no copies at Low) skip their draws
        for (const m of vistaParts?.world ?? []) if (m.name === 'vista-movers' || m.name.startsWith('crowd') && m.name !== 'crowd-stands') m.visible = !low;
        if (!low) for (const p of pools) restorePool(p);
        lastEye.set(Infinity, Infinity, Infinity); // a fresh run the next time Low comes
      }
      if (!low) return;
      camera.updateMatrixWorld();
      CULL_EYE.setFromMatrixPosition(camera.matrixWorld);
      camera.getWorldDirection(CULL_DIR);
      const cam = camera as Camera & { fov?: number; aspect?: number; near?: number; far?: number; zoom?: number; isPerspectiveCamera?: boolean };
      const fov = cam.fov ?? 60, R = LOW_RECULL;
      // the view has not moved enough to show anything new: last run's copies still cover it
      if (CULL_EYE.distanceToSquared(lastEye) < R.move * R.move && CULL_DIR.dot(lastDir) > Math.cos((R.turn * Math.PI) / 180)
        && Math.abs(fov - lastFov) < 1 && fogFar === lastFar && ++sinceCull < R.frames) return;
      sinceCull = 0;
      lastEye.copy(CULL_EYE); lastDir.copy(CULL_DIR); lastFov = fov; lastFar = fogFar;
      // the lens's view, `margin` degrees wider
      if (cam.isPerspectiveCamera) {
        const top = (cam.near! * Math.tan((((fov + R.margin) * Math.PI) / 180) / 2)) / (cam.zoom ?? 1), side = top * cam.aspect!;
        CULL_PROJ.makePerspective(-side, side, top, -top, cam.near!, cam.far!);
      } else CULL_PROJ.copy(camera.projectionMatrix);
      CULL_PV.multiplyMatrices(CULL_PROJ, camera.matrixWorldInverse);
      CULL_FRUSTUM.setFromProjectionMatrix(CULL_PV);
      for (let q = 0; q < 6; q++) { const pl = CULL_FRUSTUM.planes[q]; CULL_PLANES[q * 4] = pl.normal.x; CULL_PLANES[q * 4 + 1] = pl.normal.y; CULL_PLANES[q * 4 + 2] = pl.normal.z; CULL_PLANES[q * 4 + 3] = pl.constant; }
      // a copy of radius r covers r / (d tan(fov / 2)) of the screen's half height at distance d
      const reach = 1 / (LOW_MIN_SIZE * Math.tan(((fov * Math.PI) / 180) / 2));
      for (const p of pools) cullPool(p, CULL_PLANES, CULL_EYE.x, CULL_EYE.y, CULL_EYE.z, reach, fogFar);
    },
    lens: (camera, closeUp = false) => {
      camera.getWorldPosition(LENS_EYE);
      creatures?.lens(LENS_EYE);
      for (let i = 0; i < hazardMeshes.length; i++) (hazardMeshes[i].userData.nearGhost as NearGhost | undefined)?.update(LENS_EYE);
      const range = closeUp ? PICKUP_GHOST.closeUp : PICKUP_GHOST.race;
      for (let i = 0; i < PICKUP_GHOSTED.length; i++) {
        const g = instancers.get(PICKUP_GHOSTED[i])?.userData.nearGhost as NearGhost | undefined;
        if (!g) continue;
        g.setRange(range[0], range[1]);
        g.update(LENS_EYE);
      }
    },
    dispose: () => {
      unsubscribe();
      const chunkMeshes = new Set(chunks.map((c) => c.mesh));
      const others: Mesh[] = [];
      // (a ghost's see-through copies go with the mesh they copy: retire frees them)
      group.traverse((o) => { if ((o as Mesh).isMesh && !chunkMeshes.has(o as Mesh) && !o.userData.ghostCopy) others.push(o as Mesh); });
      for (const m of others) { if (jumpMeshes.includes(m)) (m.material as MeshToonMaterial).map?.dispose(); retire(m); }
      for (const c of chunks) c.mesh.geometry.dispose();
      creatures?.dispose();
      vents?.dispose();
      if (roadMaterial.map && roadMaterial.map !== assets.roadMap) roadMaterial.map.dispose();
      roadMaterial.dispose(); // shared by every chunk: once
      group.clear();
    },
  };

  scene.stage = stage;
  // the world's look (the PBR prototype): every mesh made so far, the shift's hidden ones too
  assets.look?.(group);
  const disposeScene = scene.dispose;
  scene.dispose = () => {
    stage?.dispose();
    // the shift's ramps made ahead and never put on show still hold their own textures
    if (pre && !pre.used) for (const j of pre.features.jumps) (j.material as MeshToonMaterial).map?.dispose();
    disposeScene();
  };

  // Final Lap Shift: instant swap of what changed
  let lastLut = branches.main.lut;
  const unsubscribe = track.onChanged((e: TrackChanged) => {
    // a route override replaces the main LUT object; that identity is the signal
    const routeMoved = branches.main.lut !== lastLut;
    lastLut = branches.main.lut;
    const main = branches.main;
    if (pre && !pre.used && main.lut.n === pre.n && Math.abs(main.lut.length - pre.length) < 1e-6 && track.features.length === pre.count && openMask() === pre.open) {
      // built ahead from the twin, the same road and features: swap them in (no building on the tick)
      pre.used = true;
      for (const c of chunks) {
        const g = c.branch === 0 ? pre.chunkGeos.get(c.index) : undefined;
        if (!g) continue;
        c.mesh.geometry.dispose();
        c.mesh.geometry = g;
      }
      for (const h of pre.holders) h.removeFromParent();
      installFeatures(pre.features);
      if (pre.edge) { if (boundary) retire(boundary); boundary = pre.edge; boundary.visible = true; }
      lastOpen = openMask();
      syncOpen();
    } else {
      // only the main LUT ever changes (route or baked surface); branch LUTs are visually fixed
      for (const c of chunks) {
        if (c.branch !== 0) continue;
        if (routeMoved || chunkTouched(c, main, e.changedRanges)) rebuildChunk(c, main, palette);
      }
      lastOpen = openMask();
      syncOpen();
      addBarriers();
      addFeatures();
      assets.look?.(group);
    }
    if (e.fogDensity !== undefined) scene.fog.density = e.fogDensity;
    if (e.sky !== undefined) scene.sky = e.sky;
    // the far vista's sky life hears the Final Lap Shift (the blizzard sends the eagles off, the finale starts the fireworks)
    vistaParts?.shift?.(e.sky);
  });

  return scene;
}

/** The track as its Final Lap Shift leaves it, built beside the race's own (never the race's: nothing the sim reads is touched). */
function shiftedTwin(def: Track['def']): Track {
  const t = buildTrack(def);
  t.applyFinalLapShift([]);
  return t;
}
