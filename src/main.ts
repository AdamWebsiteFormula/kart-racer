// The game: renderer, lights, camera, the ui-hud overlay, and one RaceSession at a time.
// Behind the menus an all-AI race runs as the attract mode; picking a race swaps in a new
// session with the player. Fixed 120 Hz sim with render interpolation (plan §6.4).
import {
  ACESFilmicToneMapping, AmbientLight, Color, DirectionalLight, Fog, HemisphereLight, NoToneMapping, PCFShadowMap,
  Group, PerspectiveCamera, PMREMGenerator, Scene, Vector3, WebGLRenderer, type Mesh, type MeshStandardMaterial, type ShaderMaterial, type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import creditsMarkdown from '../CREDITS.md?raw';
import { AudioBus, finishLine, GameAudio, SampleBank, songForTrack, themeForTrack, type Listener } from './audio/index.ts';
import { dailyConfig, restartConfig, soloConfig, CLIENT_VERSION, isBoardMode } from './backend-leaderboard/rules.ts';
import { encodeLog } from './backend-leaderboard/inputlog.ts';
import { leaderboardClient } from './backend-leaderboard/client.ts';
import { Post, Vfx, directFx, msaaSamples, newEffects } from './vfx-juice/index.ts';
import { BUBBLE_CLOCK, DAY_GRADE, freeSkeletons, isBodyId, isPbr, isShared, PAINTS, preloadSky, preloadSurfaces, PROP_MODELS, RACER_MODELS, SkyEnvironment, trackProps, WATER_CLOCK, type KartLook, type SkyLight } from './art-pipeline/index.ts';
import { dprCap, Governor } from './performance/governor.ts';
import { watchPixelRatio } from './performance/pixelRatio.ts';
import { Warmup } from './performance/warmup.ts';
import { LoadQueue, prefetchImage } from './performance/loadQueue.ts';
import { bootScreens } from './performance/splash.ts';
import { ITEM_ICONS, itemArt } from './ui-hud/icons.ts';
import { InputSource } from './kart-controller/input.ts';
import { SIM_DT } from './kart-controller/step.ts';
import type { InputState, SpeedClass, Vec3 } from './kart-controller/types.ts';
import { ITEMS_CONFIG } from './items/data.ts';
import { makeConstants } from './kart-controller/constants.ts';
import { kartFor } from './kart-controller/karts.ts';
import { applyResults, createGrandPrix, createKnockout, isDone, nextRace, podiumOf } from './race-manager/series.ts';
import { ticksToMs } from './race-manager/race.ts';
import { decodeGhost } from './race-manager/ghost.ts';
import type { GrandPrixState, RaceConfig, RaceMode, SeriesState } from './race-manager/types.ts';
import type { TrackDefinition } from './track-builder/types.ts';
import { mirrored } from './track-builder/mirror.ts';
import { ChaseCam, fovFor, kickedFov, restPose, smoothTo } from './game/camera.ts';
import { CourseIntro, findStand, planIntro, type IntroKind } from './game/intro.ts';
import { DriveAssist } from './game/assist.ts';
import { Accumulator } from './game/loop.ts';
import { lineup } from './game/lineup.ts';
import { RaceSession } from './game/session.ts';
import { setSunShadow } from './game/shadow.ts';
import { Showroom } from './game/showroom.ts';
import { CELEBRATE, FinishCam, joyful, reactionFor } from './game/celebrate.ts';
import { Podium } from './game/podium.ts';
import type { Crowd } from './art-pipeline/crowd.ts';
import type { SfxId } from './audio/types.ts';
import type { Reaction } from './kart-controller/anim.ts';
import { medalFor } from './ui-hud/screens/menus.ts';
import { CAST, UI, UiRoot, attractTrack, browserBackend, introCard, trackCard, type KartLookIds, type RacePlan, type Settings, type UiHost } from './ui-hud/index.ts';
import './ui-hud/ui.css';

// ---- content: every track file present is a built track ----
const TRACK_FILES = import.meta.glob('./track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = new Map<string, TrackDefinition>(Object.values(TRACK_FILES).map((d) => [d.id, d]));
const FIRST_TRACK = [...TRACKS.keys()][0];
const ATTRACT_TRACK = attractTrack(new Set(TRACKS.keys())) ?? FIRST_TRACK;
const ALL_MODES: ReadonlySet<RaceMode> = new Set<RaceMode>(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']);
const ATTRACT_CC: SpeedClass = 150;
/** seconds the finished race stays on screen before the results slide in */
const RESULTS_AFTER = 2.5;

// ---- renderer, scene, lights ----
// the canvas's own MSAA only where the post chain would use it too (msaaSamples: none on a sharp
// screen): at a pixel ratio of 2 the 4x canvas buffer cost a resolve every frame and made each
// resolution step of the governor a 50 to 150 ms reallocation (2560x1440 at 2, 24 Sept 2026)
const renderer = new WebGLRenderer({ antialias: msaaSamples(dprCap(devicePixelRatio, matchMedia('(pointer: coarse)').matches)) > 0, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.info.autoReset = false; // the post chain renders several passes; count the whole frame
renderer.domElement.className = 'game booting fade-in'; // fades in on its first frame (performance/splash.ts)
let post: Post | null = null; // made once the camera exists
document.body.appendChild(renderer.domElement);

const scene = new Scene();
// a soft studio reflection for the model-file racers (their PBR metal is black without one);
// the toon materials ignore it
scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;
/**
 * The PBR look (?look=pbr, art-pipeline look.ts): the world reflects the race's own painted sky, one map
 * painted again in place as the sky changes (followSky). Made now, so every world material made later has it.
 */
const skyEnv = isPbr() ? new SkyEnvironment(renderer) : null;
const sun = new DirectionalLight(0xfff4e0, 2.2);
sun.position.set(60, 120, 40);
setSunShadow(sun);
const hemi = new HemisphereLight(0xcfe8ff, 0x7a6a4f, 0.9);
const fill = new AmbientLight(0xbcd8ff, 0.5);
scene.add(sun, sun.target, hemi, fill);
/** The sun's place relative to what the camera looks at: the track's own compass direction, low in the sky (about 24°, late afternoon) so shadows are long and every prop has a lit side and a shadow side. */
const SUN_ELEVATION = 0.42, SUN_DISTANCE = 140;
function sunOffset(dir: [number, number, number] | undefined): Vec3 {
  const x = dir?.[0] ?? 0.4, z = dir?.[2] ?? 0.3, h = Math.hypot(x, z) || 1;
  const c = Math.cos(SUN_ELEVATION) * SUN_DISTANCE;
  return [(x / h) * c, Math.sin(SUN_ELEVATION) * SUN_DISTANCE, (z / h) * c];
}
/** the lights ease to the current sky's (a final-lap sunset falls over a couple of seconds) */
const lightTo = { sun: new Color(), sky: new Color(), ambient: new Color(), earth: new Color() };
/** the sky's light as eased so far, before the mine takes its share */
const lightNow = { sun: new Color(), sky: new Color(), ambient: new Color(), earth: new Color(), sunI: 0, skyI: 0, ambientI: 0 };
/**
 * In a tunnel (Canyon's mine) the day gives way to the lanterns: its light this much dimmer and this
 * warm, by how deep the camera is in the bore (ChaseCam.tunnel, eased over the portal). The sun is
 * shadowed in there anyway; the bright mouth ahead stays bright.
 */
const MINE = Object.freeze({ sun: 0.85, sky: 0.6, ambient: 0.62, warm: new Color(0xffa860), tint: 0.4 });
let lightFor: SkyLight | null = null;
function applyLight(l: SkyLight, bounce: Color | null, dt: number, snap: boolean, tunnel: number): void {
  if (l !== lightFor) {
    lightFor = l;
    lightTo.sun.set(l.sun); lightTo.sky.set(l.sky); lightTo.ambient.set(l.ambient); lightTo.earth.set(l.earth);
  }
  const k = snap ? 1 : 1 - Math.exp(-dt * 1.6), n = lightNow;
  n.sun.lerp(lightTo.sun, k); n.sunI += (l.sunI - n.sunI) * k;
  n.sky.lerp(lightTo.sky, k); n.skyI += (l.skyI - n.skyI) * k;
  n.earth.lerp(bounce ?? lightTo.earth, k);
  n.ambient.lerp(lightTo.ambient, k); n.ambientI += (l.ambientI - n.ambientI) * k;
  sun.color.copy(n.sun); sun.intensity = n.sunI * (1 + (MINE.sun - 1) * tunnel);
  hemi.color.copy(n.sky).lerp(MINE.warm, MINE.tint * tunnel); hemi.intensity = n.skyI * (1 + (MINE.sky - 1) * tunnel);
  hemi.groundColor.copy(n.earth);
  fill.color.copy(n.ambient).lerp(MINE.warm, MINE.tint * tunnel); fill.intensity = n.ambientI * (1 + (MINE.ambient - 1) * tunnel);
}
let lightSnap = true;

/** The earth's shade under the sky map's horizon: the hemisphere's ground colour, darker (linear). */
const skyEarth = new Color();
/** The sky fade (sky.ts fadeSky) the sky map was last painted at. */
let skyEnvAt = 1;
/** Paint the PBR look's sky map from `s`'s sky dome as it stands. */
function paintSkyEnv(s: RaceSession): void {
  const dome = s.dome as Mesh | undefined;
  if (!skyEnv || !dome) return;
  skyEnv.capture(dome.material as ShaderMaterial, skyEarth.set(s.skyLight.earth).multiplyScalar(0.55));
  skyEnvAt = ((dome.material as ShaderMaterial).uniforms?.fade?.value as number | undefined) ?? 1;
}
/** Through a Final Lap Shift's sky fade the map follows it, three times (a capture is a few ms of GPU work, so not every frame). */
function followSky(s: RaceSession): void {
  const f = (((s.dome as Mesh | undefined)?.material as ShaderMaterial | undefined)?.uniforms?.fade?.value as number | undefined) ?? 1;
  if (f < skyEnvAt) skyEnvAt = f; // a new fade began
  else if (f - skyEnvAt >= 0.33 || (f >= 1 && skyEnvAt < 1)) paintSkyEnv(s);
}

const camera = new PerspectiveCamera(fovFor(0), 1, 0.3, 1400);
const vfx = new Vfx(scene, camera);
post = new Post(renderer, scene, camera);
/** a race's shaders compile before its countdown runs (performance/warmup.ts) */
const warmup = new Warmup(renderer);
const fxBuf = newEffects();
/** the chase camera (game/camera.ts); its place and aim are the camera's (the attract TV camera writes them too) */
const chase = new ChaseCam();
const camPos: Vec3 = chase.pos;
const camLook: Vec3 = chase.look;
const lookTmp = new Vector3();
let orbit = 0;

let settings: Settings | null = null;
// quality Auto: the governor trades resolution, then shadows and post, to hold 55+ fps
const coarse = matchMedia('(pointer: coarse)').matches;
const governor = new Governor(dprCap(devicePixelRatio, coarse));
let governing = false;
const autoQuality = () => (settings?.quality ?? 'auto') === 'auto';
function applyRender(): void {
  const auto = autoQuality();
  // re-read the cap every time: zoom or a move to another screen changes devicePixelRatio
  const cap = dprCap(devicePixelRatio, coarse);
  governor.rebase(cap);
  const low = settings?.quality === 'low' || (auto && governor.low);
  renderer.setPixelRatio(cap * (settings?.resolutionScale ?? 1) * (auto ? governor.scale : 1));
  renderer.shadowMap.enabled = !low;
  post?.setEnabled(!low);
  post?.setSamples(msaaSamples(cap));
  resize();
}
/** a governor change waiting to be applied (since when, in seconds), or -1 */
let pendingQuality = -1;
/** seconds a change waits for a calm moment at most */
const CALM_WAIT = 3;
/**
 * The governor moved. Low (or back) changes every shader, so they compile in the background first
 * while the old quality still draws (performance/warmup.ts). Either way the change then waits for
 * a calm moment: not mid-drift, mid-boost or spinning, so the switch is never felt in the action.
 */
function qualityChanged(nowS: number): void {
  const low = settings?.quality === 'low' || governor.low;
  if (low !== !renderer.shadowMap.enabled) warmup.prepare(scene, camera, { shadows: !low, toneMapping: low ? ACESFilmicToneMapping : NoToneMapping, intoTarget: !low }, nowS);
  pendingQuality = nowS;
}
/** Nothing is happening to the player's kart that a change of quality could spoil. */
function calm(): boolean {
  const p = attract ? undefined : session?.player;
  return !p || (!p.drift.active && p.boost.remaining <= 0 && p.status.spinRemaining <= 0 && p.grounded);
}
function resize(): void {
  renderer.setSize(innerWidth, innerHeight);
  post?.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', applyRender);
watchPixelRatio(window, applyRender); // a move between screens need not fire resize

// ---- sessions ----
/** dev only: the AI drives the player (soak tests through the real loop), and frames stepped by hand */
let autopilot = false;
let devStepping = false;
let session: RaceSession | null = null;
/**
 * The course intro playing before this race's countdown (game/intro.ts), or null. The sim waits at
 * tick 0 until it is over, so input logs and replays are the same with or without it.
 */
let intro: CourseIntro | null = null;
/** dev only: kart.race starts straight at the countdown, as it always has (kart.race(id, racer, { intro: 'full' }) flies the intro first) */
let devNoIntro = false;
/** dev only: hold the intro at this many seconds in (kart.introAt), for checking its shots */
let devIntroAt: number | null = null;
let attract = true;
let series: SeriesState | null = null;
let overSent = false;
/** the player pressed on over the line: the results come as soon as the field is cut off */
let skipResults = false;
/** the player's finish celebration (game/celebrate.ts): from their line through the results screens */
const finishCam = new FinishCam();
let celebrating = false;
/** the podium ceremony (game/podium.ts): built at a series' last results, shown after the standings or the cut */
let podium: Podium | null = null;
/** the player's paint and body, and Mirror mode, for this race and the rest of its series (design §10) */
let look: KartLook = {};
let mirror = false;
let coinCap = 10;
let topSpeed = 25;
/** the driving assists (Settings: Auto-accelerate, Steering assist; game/assist.ts) for the player's kart in this race */
let assist: DriveAssist | null = null;
/** what the HUD is told of them each frame (one object, reused) */
const hudAssist = { autoAccelerate: false, steering: false, working: false };
// ?mute: the game makes no sound at all, however it is played (automated checks in a browser
// always load it so; docs/sops/audio.md)
const MUTED = new URLSearchParams(location.search).has('mute');
/** any racer in any kart is on in the game (Adam, 25 Sept 2026: K7, design §5); `?nokarts` turns it off (UI.kartPick stays off as the tests' default) */
const KARTS_PICK = !new URLSearchParams(location.search).has('nokarts');
const audio = new GameAudio(MUTED ? AudioBus.silent() : undefined);
/** Background files: a few at a time, in the order the player meets them (performance/loadQueue.ts). */
const files = new LoadQueue(3);
/** The background line's turns, first to last. */
const RANK = Object.freeze({
  /** what a race being loaded still waits for: its racers' models (its course intro holds the countdown for them) */
  race: -1,
  /** then its own song (the go) and its first seconds of sound (countdown, go, engines, drift, boosts), and its final-lap sky */
  raceNext: -0.5,
  /** the menus' clicks (27 KB, on the first key press): ahead of the pictures, which a screen fetches for itself anyway */
  clicks: -0.25,
  /** the pictures on the next screens; the title song (on the first key press); the results song */
  screens: 0,
  /** the eight racers' models (every race); then a race's first seconds of sound (countdown, go, engines, drift, boosts) */
  racers: 1,
  /** the title's track's scenery models */
  title: 2,
  /** the item art the roulette flicks through and the item and hit sounds (the first race's first balloon) */
  items: 3,
  /** every other track's ground and scenery, the rest of the sounds (the course's creatures, the horns, the stings) */
  rest: 4,
});
/** A sound's turn (audio/samples.ts SFX_TIERS) → its place in the line. */
const SOUND_RANK = [RANK.clicks, RANK.racers, RANK.items, RANK.rest] as const;
// every sound file waits its turn in the same line as the models (on the first key press all 102 and the
// title song used to be asked for at once): a song takes a whole turn, a sound effect half of one. Tagged,
// so a race start can move them: its first seconds' sounds forward, the title song back (raceLine)
audio.bank.schedule = (job, tier, song) => song
  ? files.add(job, song === 'title' ? (attract ? RANK.screens : RANK.rest) : song === 'results' ? RANK.screens : RANK.raceNext, 1, `song:${song}`)
  : files.add(job, SOUND_RANK[Math.min(tier, SOUND_RANK.length - 1)], 0.5, `sfx:${tier}`);
/**
 * The line as a race or the menus want it: a race wants its racers' models, then its song and first
 * seconds of sound, and the title song can wait; the menus want the title song back (a slow line's
 * files still waiting move; nothing running stops).
 */
function raceLine(racing: boolean): void {
  files.rerank('song:title', racing ? RANK.rest : RANK.screens);
  if (racing) files.rerank('sfx:1', RANK.raceNext);
}
/** racerId → kart index for the current session (audio needs positions by racer) */
const indexOf = new Map<string, number>();
const kartOf = (id: string) => { const i = indexOf.get(id); return i === undefined ? undefined : session?.state.karts[i]; };
const listener: Listener = {
  playerId: null, position: [0, 0, 0], heading: 0,
  positionOf: (id) => { const i = indexOf.get(id); return i === undefined ? undefined : session?.state.karts[i].position; },
};
const input = new InputSource();
const acc = new Accumulator();

/** `introKind`: the course intro to fly before the countdown (game/intro.ts); none on a restart or the attract race. */
function load(config: RaceConfig, isAttract: boolean, introKind: IntroKind | null = null): void {
  // the old race is freed once the new one's shaders are compiled, so the shaders both draw with carry over
  const old = session;
  const base = TRACKS.get(config.trackId) ?? TRACKS.get(FIRST_TRACK)!;
  // Mirror mode races the track reflected left to right (track-builder/mirror.ts); never on a leaderboard mode
  const def = config.mirrored && !isBoardMode(config.mode) ? mirrored(base) : base;
  session = new RaceSession(scene, def, { ...config, trackId: def.id, mirrored: def.mirrored === true }, isAttract ? {} : look);
  session.eye = camPos; // the rigged drivers look at the camera on the grid and over the line (kart-controller driverAnim.ts)
  attract = isAttract;
  overSent = false;
  skipResults = false;
  celebrating = false;
  ui.celebrate(false);
  podium?.dispose();
  podium = null;
  // Time Trial: race the saved best as a ghost (a picture only; it never touches the race)
  if (config.mode === 'timeTrial' && !isAttract) {
    const best = ui.save.timeTrial[def.id];
    const path = best?.ghost && best.racerId ? decodeGhost(best.ghost) : null;
    // drawn in the paint, body and kart the best was set in (design §5: save.schema.json timeTrial[track].kart)
    if (path && best?.racerId) session.setGhost(path, best.racerId, { ...artLook(best), kartId: best.kart });
  }
  const pi = session.playerIndex;
  const kc = makeConstants(session.config.racers[Math.max(0, pi)].archetype, session.config.speedClass);
  coinCap = kc.coinCap;
  topSpeed = kc.topSpeed;
  assist = pi >= 0 && !isAttract ? new DriveAssist(session.track, kc) : null;
  indexOf.clear();
  session.state.karts.forEach((k, i) => indexOf.set(k.racerId, i));
  listener.playerId = session.player?.racerId ?? null;
  if (isAttract) audio.play('title'); else audio.newRace(songForTrack(def.id), def.id, session.state.trackers[pi]?.shownRank, finishLine(session.config), session.config.mode !== 'timeTrial');
  // the race starts at the governor's quality (a change still waiting for a calm moment included), applied before its shaders compile
  if ((governor.newRace(performance.now() / 1000) && autoQuality()) || pendingQuality >= 0) { pendingQuality = -1; applyRender(); }
  if (import.meta.env.DEV) session.ai.drivePlayer = autopilot;
  lightSnap = true; // a new race starts under its own light, no fade from the last one
  // its starting sky's painting (the warm-up waits on it, below) wants the line: on a slow line the background
  // files crowded it out, so nothing new starts till it is in (at most as long as the warm-up would wait)
  const startSky = preloadSky(session.trackScene.sky);
  files.hold(Promise.race([startSky, new Promise((r) => setTimeout(r, isAttract ? 2000 : 3000))]));
  // the PBR look's sky map: this race's sky now, and again once its painting is on the dome (sky.ts set it first)
  if (skyEnv) {
    const s = session;
    paintSkyEnv(s);
    void startSky.then(() => { if (session === s) paintSkyEnv(s); });
  }
  // the Final Lap Shift's painted sky comes down in the background, its turn in the line after the race's
  // own models and song (the race start used to wait for it too: on Slow 4G the warm-up's 3 s cap). The
  // leader is laps away from the shift, and a painting not in by then fades in when it lands (sky.ts paintSky)
  const shiftId = def.finalLapShift?.sky;
  if (shiftId) void files.add(() => preloadSky(shiftId), isAttract ? RANK.title : RANK.raceNext).then(uploadSky);
  scene.background = session.horizon.clone();
  scene.fog = new Fog(session.horizon.clone(), 140, 850);
  acc.reset();
  vfx.reset();
  chase.reset(session.player ?? session.state.karts[0]);
  // the course intro (game/intro.ts): the camera flies the course and lands on the chase camera's rest
  // pose while the title card names it; the sim waits at tick 0, the countdown comes after it
  const pk = session.player;
  const stands = introKind ? (session.trackScene.group.getObjectByName('crowd-stands') as Mesh | undefined)?.geometry.getAttribute('position')?.array : undefined;
  intro = introKind && pk && !isAttract && !devNoIntro
    ? new CourseIntro(planIntro({
      track: session.track, farLandmark: session.trackScene.farLandmark, kart: pk, rest: restPose(session.track, pk),
      stand: stands ? findStand(session.track, stands) : undefined,
    }, introKind))
    : null;
  ui.introCard(intro && pk ? introCard({
    trackId: def.id, trackName: def.name, mode: config.mode, speedClass: config.speedClass, mirrored: def.mirrored === true, racerId: pk.racerId,
    seriesId: series?.kind === 'grandPrix' ? series.cupId : series?.kind === 'knockout' ? series.setId : null,
    race: series ? { index: series.kind === 'grandPrix' ? series.raceIndex : series.segment, count: series.trackIds.length } : undefined,
    cutLine: config.knockout?.cutLine, dailySeed: config.mode === 'daily' ? config.seed : undefined, touch: coarse,
  }) : null);
  // racers whose model files were not in yet (a race picked early on a slow line) are asked for first; with a
  // course intro, each is swapped in as it lands and the countdown waits for them a little (upgradeKarts)
  dropUpgrade();
  raceLine(!isAttract);
  const missing = isAttract ? [] : session.waitingForModels();
  if (missing.length) {
    // (with an intro, turns of their own at the front of the line, moved back once the countdown starts: endIntro;
    // the first, the player's own kart, comes down alone at the line's full speed)
    let turn = 0;
    const rank = intro ? RANK.race : RANK.racers;
    void RACER_MODELS.want(missing, (job) => files.add(job, rank, turn++ === 0 ? files.limit : 1, 'race-models'));
    if (intro) {
      const u: Upgrade = { session, want: new Set(missing), staging: null, compiled: false, lastMove: -1 };
      upgrade = u;
      intro.waitFor(() => u.want.size === 0, MODEL_WAIT);
    }
  }
  // every shader this race can draw, hidden and off-screen ones too, compiles now, before the countdown runs
  warmup.begin(scene, camera, post?.enabled ?? false, performance.now() / 1000);
  // and its starting sky's painting, so it is not decoded and uploaded on the frame it first shows
  warmup.waitFor(startSky);
  old?.dispose();
}

/**
 * A painting fetched ahead of its moment (the Final Lap Shift's sky), decoded off the main thread and
 * uploaded now, so the frame the shift first draws it does neither (25 to 28 ms together).
 */
function uploadSky(t: Texture | null): void {
  if (!t) return;
  const img = t.image as HTMLImageElement | undefined;
  void (img?.decode?.() ?? Promise.resolve()).catch(() => undefined).then(() => renderer.initTexture(t));
}

/** A look from the UI's ids (the store has checked them against the unlocks). */
function artLook(l: KartLookIds | undefined): KartLook {
  return { ...(l?.paint ? { paint: l.paint } : {}), ...(l?.body && isBodyId(l.body) ? { body: l.body } : {}) };
}

/** A series race in Mirror mode when the series was started in it. */
const withMirror = (c: RaceConfig): RaceConfig => (mirror ? { ...c, mirrored: true } : c);

function startAttract(): void {
  series = null;
  const seed = Math.floor(Math.random() * 1e6); // attract only: never recorded, never replayed
  load({ mode: 'quick', trackId: ATTRACT_TRACK, speedClass: ATTRACT_CC, seed, racers: lineup(null) }, true);
}

function configFor(p: RacePlan): RaceConfig {
  // leaderboard modes are the exact solo race the server replays (backend-leaderboard/rules.ts); the
  // kart is in the config it sends the server (backend-leaderboard/rules.ts soloConfig, dailyConfig)
  if (p.mode === 'timeTrial') return soloConfig('timeTrial', p.tracks[0] ?? FIRST_TRACK, p.racerId, 0, p.kartId);
  if (p.mode === 'daily') return dailyConfig(p.racerId, [...TRACKS.keys()], undefined, p.kartId);
  return withMirror({ mode: p.mode, trackId: p.tracks[0] ?? FIRST_TRACK, speedClass: p.speedClass, seed: Date.now() % 1_000_000, racers: lineup(p.racerId, p.kartId) });
}

const host: UiHost = {
  builtTracks: new Set(TRACKS.keys()),
  medalTimes: new Map([...TRACKS.values()].map((d) => [d.id, d.medalTimesMs])),
  availableModes: ALL_MODES,
  creditsMarkdown,
  leaderboard: leaderboardClient(),
  startRace(p) {
    series = null;
    look = artLook(p.look);
    // Mirror runs Quick Race and Grand Prix only (the UI offers it there); a leaderboard mode never
    mirror = p.mirrored === true && (p.mode === 'quick' || p.mode === 'grandPrix');
    const racers = lineup(p.racerId, p.kartId);
    const seed = Date.now() % 1_000_000;
    if (p.mode === 'grandPrix' && p.cupId) series = createGrandPrix({ id: p.cupId, trackIds: p.tracks }, racers, p.speedClass, seed);
    if (p.mode === 'knockout' && p.cupId) series = createKnockout({ id: p.cupId, trackIds: p.tracks }, racers, p.speedClass, seed);
    // the course intro before the countdown: a short one in Time Trial and the Daily (game/intro.ts); from the
    // results, a short one on to the next track and none for the same race again (as the pause's Restart)
    const intro = p.intro === 'none' ? null : p.intro ?? (p.mode === 'timeTrial' || p.mode === 'daily' ? 'short' : 'full');
    load(series ? withMirror(nextRace(series)!) : configFor(p), false, intro);
  },
  nextRace() {
    const next = series ? nextRace(series) : undefined;
    // every race of a Grand Prix or a Knockout gets its intro
    if (next) load(withMirror(next), false, 'full'); else startAttract();
  },
  restartRace() {
    // a Daily restarts as today's: past midnight UTC the old day's run could not be posted
    if (session) load(restartConfig(session.config, [...TRACKS.keys()]), false);
  },
  quitRace() { startAttract(); },
  skipIntro() { intro?.skip(); },
  skipToResults() {
    // over the line and pressed on: the rest of the field is cut off now (projected times), no 12 s wait
    if (!session || attract || !session.player || session.player.finishTick === undefined) return;
    session.manager.endRace();
    skipResults = true;
  },
  setPaused(p) {
    audio.pause(p); // the music drops back under the pause menu
    if (!p) acc.reset();
  },
  settingsChanged(s) {
    const wasLow = !renderer.shadowMap.enabled;
    settings = s; governor.reset(performance.now() / 1000); pendingQuality = -1; applyRender();
    // Low (or back) changes every shader: compile them all before the next frame draws (performance/warmup.ts)
    if (wasLow !== !renderer.shadowMap.enabled) warmup.begin(scene, camera, post?.enabled ?? false, performance.now() / 1000);
    audio.setVolumes({ master: s.masterVolume, music: s.musicVolume, sfx: s.sfxVolume });
  },
  uiSound(kind) { audio.ui(kind); },
  screenChanged(app) {
    // the series' podium ceremony (game/podium.ts), after its standings or its cut
    if (app.screen === 'podium' && podium && !podium.showing) startPodium();
    // leaving the race screens for the menus brings the attract race back (the results' Change track and Change racer too)
    if (!attract && (app.screen === 'modeSelect' || app.screen === 'title' || app.screen === 'rosterSelect' || app.screen === 'trackSelect')) startAttract();
  },
};

const ui = new UiRoot(document.body, host, browserBackend(), { kartPick: UI.kartPick || KARTS_PICK });
// phones and tablets steer with on-screen thumbs, merged with any keys or gamepad; in the
// countdown their gas waits for a finger, so a touch on the 2 is a rocket start
input.setVirtual(() => ui.touch.state(session?.state.phase === 'countdown'));
settings = ui.save.settings;
audio.setVolumes({ master: settings.masterVolume, music: settings.musicVolume, sfx: settings.sfxVolume });
applyRender();
// The title first (load-speed sweep, docs/sops/performance.md): its menu paints before the attract
// race is built (half a second of script on a phone), then the race, then the background files.
// (a hidden tab runs no animation frames: the timer starts it there, so the files still come down)
let booted = false;
const afterFirstPaint = () => {
  if (booted) return;
  booted = true;
  if (!session) startAttract();
  backgroundFiles();
};
requestAnimationFrame(() => setTimeout(afterFirstPaint));
setTimeout(afterFirstPaint, 300);
bootScreens({ titleUp: () => ui.app.screen !== 'boot', firstFrame: () => session !== null && !warmup.active, canvas: renderer.domElement });

function backgroundFiles(): void {
  const base = import.meta.env.BASE_URL;
  // the title's own sky painting first (the page preloads its fonts): nothing else shares the line till then
  files.hold(Promise.race([preloadSky(session?.trackScene.sky), new Promise((r) => setTimeout(r, 2000))]));
  // the pictures on the next screens (racer portraits, track cards: ui-hud render/screens.ts addresses)
  for (const c of CAST) void files.add(() => prefetchImage(`${base}art/racers/${c.id}.webp`), RANK.screens);
  for (const id of TRACKS.keys()) void files.add(() => prefetchImage(`${base}art/tracks/${id}.webp`), RANK.screens);
  // the eight racers' model files (every race), then the title's track's scenery models. Both in, the
  // title's race restarts, so the first thing a player sees is the modelled cast (fails soft: code-built)
  const titleTrack = TRACKS.get(ATTRACT_TRACK);
  void Promise.all([RACER_MODELS.load(files.at(RANK.racers)), PROP_MODELS.load(titleTrack ? trackProps(titleTrack) : [], files.at(RANK.title))])
    .then(() => { if (attract) startAttract(); warmLooks(); });
  // the item art the roulette flicks through (the first race's first balloon); every other track's ground and scenery
  for (const id of Object.keys(ITEM_ICONS)) void files.add(() => prefetchImage(itemArt(id)), RANK.items);
  void files.add(async () => preloadSurfaces(), RANK.rest);
  // only the models some track's scene asks for (trackProps): the course creatures' (off every track
  // since 25 Sept 2026, 3.6 MB) are not fetched, and come back with a creature put back on its track
  void PROP_MODELS.load([...TRACKS.values()].flatMap(trackProps), files.at(RANK.rest));
}

document.fonts?.ready.then(() => ui.dispatch({ type: 'boot' }));
setTimeout(() => ui.dispatch({ type: 'boot' }), 1500); // never wait on fonts for more than 1.5 s
addEventListener('visibilitychange', () => {
  if (document.hidden && ui.app.screen === 'racing' && !ui.paused) ui.dispatch({ type: 'pause' });
  acc.reset();
});

// ---- race over → results ----
function raceOver(): void {
  if (!session || attract || overSent) return;
  overSent = true;
  const results = session.manager.results();
  const player = session.player;
  let gp: { before: GrandPrixState | null; after: GrandPrixState } | undefined;
  let ko;
  let seriesHasNext = false;
  let top: string[] = [];
  if (series) {
    const before = series.kind === 'grandPrix' ? structuredClone(series) : null;
    applyResults(series, results); // mutates
    if (series.kind === 'grandPrix') gp = { before, after: series };
    else ko = { after: series };
    const playerOut = series.kind === 'knockout' && player !== undefined && series.eliminated.includes(player.racerId);
    if (series.kind === 'knockout') audio.knockout(playerOut);
    seriesHasNext = !isDone(series) && !playerOut;
    top = podiumOf(series);
    if (top.length) buildPodium(top);
  }
  audio.play('results');
  // Time Trial and Daily runs can go on the leaderboard: the whole input log, from tick 0
  const mode = session.config.mode;
  const mine = results.ranks.find((r) => r.racerId === player?.racerId);
  const board = isBoardMode(mode) && !session.config.mirrored && player && mine && !mine.dnf ? {
    mode, dailySeed: mode === 'daily' ? session.config.seed : null,
    draft: {
      trackId: session.def.id, mode, ...(mode === 'daily' ? { dailySeed: session.config.seed } : {}), speedClass: 150 as const,
      timeMs: mine.timeMs, lapTimesMs: mine.lapTimesMs, racerId: player.racerId,
      kartId: session.manager.consts[session.playerIndex].kartId, // the kart it was raced in: the server replays it there
      inputLog: encodeLog(session.state.inputLog), clientVersion: CLIENT_VERSION,
    },
  } : undefined;
  ui.raceOver({
    results, trackName: trackCard(session.def.id)?.name ?? session.def.name, playerId: player?.racerId ?? null,
    gp, ko, seriesHasNext, board,
    medalTimesMs: mode === 'timeTrial' ? session.def.medalTimesMs : undefined,
    ghost: mode === 'timeTrial' && mine && !mine.dnf ? session.ghostPath() : undefined,
    look,
    // the kart it was raced in (design §5): a Time Trial best keeps it (save.schema.json timeTrial[track].kart)
    ...(session.playerIndex >= 0 ? { kartId: session.manager.consts[session.playerIndex].kartId } : {}),
    ...(top.length ? { podium: top } : {}),
  });
}

// ---- the finish celebration and the podium ceremony ----
const NO_KARTS: readonly never[] = [];

/** The player's reaction for a finish in `rank` (game/celebrate.ts): by the race's field, its Knockout cut, a Time Trial medal. */
function reactionAt(rank: number): Reaction {
  const s = session!, cfg = s.config, pi = s.playerIndex;
  const ko = cfg.mode === 'knockout' && cfg.knockout
    ? { cutLine: cfg.knockout.cutLine, final: series?.kind === 'knockout' ? cfg.knockout.segment >= series.trackIds.length - 1 : false }
    : undefined;
  const me = s.state.karts[pi];
  const medal = cfg.mode === 'timeTrial' && me?.finishTick !== undefined ? medalFor(ticksToMs(me.finishTick - s.state.goTick), s.def.medalTimesMs) : undefined;
  const field = s.state.karts.filter((k) => !k.isGhost).length;
  return reactionFor({ rank, field, dnf: s.state.trackers[pi]?.dnf, knockout: ko, medal });
}
/** Whether the player's finish in `rank` throws the confetti (a win, a podium place, a safe Knockout place). */
const confettiFor = (rank: number): boolean => !!session?.player && joyful(reactionAt(rank));

/** The player crossed the line: the camera swings round to their kart's front, and they react to their place. */
function startCelebration(s: RaceSession): void {
  celebrating = true;
  const i = s.playerIndex, k = s.state.karts[i], root = s.views[i].root;
  finishCam.start(s.track, k, root.position, root.rotation.y, camPos, camLook, camera.fov);
  s.views[i].anim.react(reactionAt(k.rank));
  ui.celebrate(true); // the HUD steps aside: FINISH! up and small, the slots, map and hints away
}

/** The finish camera (game/celebrate.ts) over the chase camera's pose; `dt` 0 while paused (its clock stops too). */
function celebrationCamera(dt: number, reduced: boolean): void {
  const s = session!, i = s.playerIndex;
  if (i < 0) return;
  const root = s.views[i].root;
  finishCam.update(s.track, s.state.karts[i], root.position, root.rotation.y, reduced, dt);
  for (let k = 0; k < 3; k++) { camPos[k] = finishCam.pos[k]; camLook[k] = finishCam.look[k]; }
  camera.fov = finishCam.fov;
}

/** Build the podium for the top three (1st to 3rd) on this race's track, hidden, its shaders compiling now (performance/warmup.ts). */
function buildPodium(top: readonly string[]): void {
  const s = session;
  if (!s) return;
  podium?.dispose();
  const racers = top.map((id) => ({
    racerId: id, archetype: CAST.find((c) => c.id === id)?.archetype ?? 'medium' as const,
    look: id === s.player?.racerId ? { ...look, kartId: s.manager.consts[s.playerIndex]?.kartId } : {},
  }));
  const crowd = (s.trackScene.group.getObjectByName('crowd')?.userData.crowd as Crowd | undefined) ?? null;
  podium = new Podium(s.track, racers, s.def.biome, crowd);
  scene.add(podium.group);
  void warmup.precompile(podium.group, camera, scene, post?.enabled ?? false);
}

/** The ceremony begins: the race's karts, items and claw leave the stage to the podium's three, and the fanfare plays. */
function startPodium(): void {
  const s = session, p = podium;
  if (!s || !p) return;
  // (each kart's chassis, not its root: the items view shows every root each frame, a Strike Ball's rider aside)
  for (const v of s.views) v.chassis.visible = false;
  s.itemsView.root.visible = false;
  s.rescueView.root.visible = false;
  p.start();
  audio.ceremony(p.racers.some((r) => r.racerId === s.player?.racerId));
}

/** The podium ceremony's frame: its racers, cup, confetti, fireworks, crowd and camera (game/podium.ts); `dt` 0 while paused. */
function podiumCamera(dt: number, reduced: boolean): void {
  const p = podium!;
  p.update(dt, reduced, vfx, WATER_CLOCK.value);
  for (let k = 0; k < 3; k++) { camPos[k] = p.pos[k]; camLook[k] = p.look[k]; }
  camera.fov = p.fov;
}

// ---- cameras ----
/** The chase camera on the player (game/camera.ts ChaseCam), with the punch of the player's last boost pulling it back. */
function chaseCamera(frameDt: number, nowS: number, reduced: boolean): void {
  const s = session!;
  const i = s.playerIndex >= 0 ? s.playerIndex : s.leader();
  const root = s.views[i].root;
  chase.update(s.track, s.state.karts[i], root.position, root.rotation.y, s.inputs[i]?.lookBack ?? false, vfx.kick.back(nowS, reduced), reduced, frameDt);
  camera.fov = chase.fov;
}

/** How far out in front of the lens the sun's shadow box centres while the course intro looks at a far landmark (m). */
const INTRO_SHADOW_REACH = 40;
const sunAt: Vec3 = [0, 0, 0];
/** the course intro's lean this frame (radians; the sweep banks into its curve) */
let introRoll = 0;

/** The course intro's flight (game/intro.ts), and a point in front of the lens for the sun's shadow box: its aim can be a landmark 500 m off. */
function introCamera(reduced: boolean): void {
  const v = intro!.camera(reduced);
  for (let i = 0; i < 3; i++) { camPos[i] = v.pos[i]; camLook[i] = v.look[i]; }
  camera.fov = v.fov;
  introRoll = v.roll;
  const dx = camLook[0] - camPos[0], dy = camLook[1] - camPos[1], dz = camLook[2] - camPos[2];
  const k = Math.min(1, INTRO_SHADOW_REACH / (Math.hypot(dx, dy, dz) || 1));
  sunAt[0] = camPos[0] + dx * k; sunAt[1] = camPos[1] + dy * k; sunAt[2] = camPos[2] + dz * k;
}

/** The course intro is over (played through or skipped): the chase camera takes over from the rest pose the flight landed on, the HUD comes back and the countdown starts. */
function endIntro(): void {
  const s = session;
  if (intro && s?.player) chase.reset(s.player, intro.plan.rest);
  intro = null;
  ui.introCard(null);
  dropUpgrade(); // what has not come by now stays code-built for this race (nothing new mid-race)
  files.rerank('race-models', RANK.racers); // and its own turns for them wait behind its song and sounds
  acc.reset(); // the countdown starts from this frame, never catching up on the flight
}

/** Seconds a race's countdown may wait past its course intro for racer models still coming down. */
const MODEL_WAIT = 2;
/**
 * A race built before some of its racers' model files were in (24 Sept 2026: on Fast 4G a race picked
 * in the first 5.5 s kept the code-built karts to the flag). Its racers are asked for first (load);
 * each model that lands during the course intro is built beside the race, its textures uploaded and
 * shaders compiled in the background (performance/warmup.ts precompile), then swapped in on a cut
 * between moves, or while the countdown waits at the flight's end (CourseIntro.waitFor, MODEL_WAIT).
 */
interface Upgrade { session: RaceSession; want: Set<string>; staging: Group | null; compiled: boolean; lastMove: number }
let upgrade: Upgrade | null = null;

/** One frame of the race's upgrade (while its course intro plays). */
function upgradeKarts(): void {
  const u = upgrade;
  if (!u) return;
  if (u.session !== session || !intro) { dropUpgrade(); return; }
  // a file that failed leaves its racer code-built
  for (const id of u.want) if (RACER_MODELS.settled(id) && !RACER_MODELS.has(id)) u.want.delete(id);
  if (!u.staging) {
    const landed = new Set([...u.want].filter((id) => RACER_MODELS.has(id)));
    if (landed.size) {
      const g = new Group();
      g.name = 'kart-staging';
      g.visible = false;
      g.position.y = -1e4; // far from every lens: the rivals' fader leaves its copies alone
      scene.add(g);
      if (u.session.stageModels(landed, g) > 0) {
        u.staging = g;
        void warmup.precompile(g, camera, scene, post?.enabled ?? false).then(() => {
          u.compiled = true;
          if (upgrade !== u) freeStaging(g); // dropped while compiling: its materials could only go now
        });
      } else {
        g.removeFromParent();
        for (const id of landed) u.want.delete(id);
      }
    }
  }
  // swapped on a cut, before the flight moves, or while the countdown waits for them: never mid-move
  const move = intro.move, cut = move !== u.lastMove;
  u.lastMove = move;
  if (u.staging && u.compiled && (cut || !intro.moving || intro.flightOver)) {
    for (const id of u.session.swapInModels()) u.want.delete(id);
    u.staging.removeFromParent();
    u.staging = null;
    u.compiled = false;
  }
}

/** Stop upgrading (the countdown started, or another race loaded): karts staged and not swapped in are freed. */
function dropUpgrade(): void {
  const u = upgrade;
  upgrade = null;
  // (a staging still compiling is freed when its compile is done: its materials must live till then)
  if (u?.staging && u.compiled) freeStaging(u.staging);
}

function freeStaging(g: Group): void {
  g.removeFromParent();
  g.traverse((o) => {
    const m = (o as Mesh).material;
    for (const x of Array.isArray(m) ? m : m ? [m] : []) if (!isShared(x)) x.dispose();
  });
  freeSkeletons(g);
}

/** How much brighter the lights go at a full lightning flash (Meadow Run's storm): sky, ambient, sun. */
const SHIFT_FLASH = Object.freeze({ sky: 1.8, ambient: 2.4, sun: 0.5 });

/**
 * The Final Lap Shift's show beyond its set piece (track-builder mesh/shiftStage.ts): the blizzard's fog,
 * lightning on the lights, its bursts of dust, sparks and fireworks, and its sounds (the game's own, under
 * the shift's sting; heard only while the race screen is up).
 */
function showShift(s: RaceSession, audible: boolean, reduced: boolean): void {
  const st = s.trackScene.stage;
  if (!st) return;
  const fog = scene.fog as Fog | null;
  if (fog) { fog.near = st.fog.near; fog.far = st.fog.far; }
  if (st.flash > 0) {
    hemi.intensity *= 1 + SHIFT_FLASH.sky * st.flash;
    fill.intensity *= 1 + SHIFT_FLASH.ambient * st.flash;
    sun.intensity *= 1 + SHIFT_FLASH.sun * st.flash;
  }
  for (const b of st.bursts) vfx.shiftBurst(b.kind, b.at[0], b.at[1], b.at[2], b.size, b.hue, reduced);
  if (!audible) return;
  for (const c of st.cues) {
    let gain = c.gain, pan = 0;
    if (c.at) {
      // heard from the set piece: fading out over its reach, panned by where it stands
      const dx = c.at[0] - listener.position[0], dz = c.at[2] - listener.position[2];
      gain *= Math.max(0, 1 - Math.hypot(dx, dz) / c.reach);
      if (gain < 0.03) continue;
      pan = 0.7 * Math.sin(Math.atan2(dx, dz) - listener.heading);
    }
    audio.sfx(c.sfx as SfxId, gain, pan);
  }
}

/** Attract mode: a slow TV camera swinging around whoever leads. */
function tvCamera(frameDt: number): void {
  const s = session!;
  const k = s.views[s.leader()].root.position;
  orbit += frameDt * (ui.reducedMotion ? 0.02 : 0.12);
  const r = 16;
  const want: Vec3 = [k.x + Math.sin(orbit) * r, k.y + 5.5, k.z + Math.cos(orbit) * r];
  smoothTo(camPos, want, 0.6, frameDt);
  smoothTo(camLook, [k.x, k.y + 1, k.z], 0.25, frameDt);
  camera.fov = 58;
}

// ---- loop ----
/** dev only: a fixed camera for checking art up close (kart.photo); with `kart`, pos and look are in that kart's frame and the camera rides along */
let photo: { pos: Vec3; look: Vec3; fov: number; kart?: number } | null = null;
const photoAt = new Vector3(), photoLook = new Vector3();
let last = performance.now();
let frames = 0;
const itemDefs = ITEMS_CONFIG.items;

function frame(now: number): void {
  requestAnimationFrame(frame);
  step(now);
}

/** One rendered frame at time `now` (ms). */
function step(now: number): void {
  frames++;
  renderer.info.reset();
  const rawMs = now - last;
  const frameDt = Math.max(0, Math.min(0.25, rawMs / 1000));
  last = now;
  ui.poll(now);
  const s = session;
  if (!s) return;
  // a new race's shaders still compiling (performance/warmup.ts): nothing ticks or draws, the last
  // frame stays up; once they are done, one draw of everything, and the countdown starts after it
  const warmed = warmup.active;
  if (warmed) {
    if (!warmup.ready(now / 1000)) return;
    warmup.finish(scene, () => post!.render(0, 0, true));
  }

  const racing = !attract && ui.app.screen === 'racing';
  ui.touch.show(racing && !ui.paused && !intro);
  const reduced = ui.reducedMotion;
  const nowS = now / 1000;
  WATER_CLOCK.value = nowS % 3600; // every water surface drifts on one clock (wrapped so noise keeps its precision)
  BUBBLE_CLOCK.value = WATER_CLOCK.value;
  // measure only live play (not a course intro's flight, which sees far more of the course than the race does); after a pause or a hidden tab, warm up again before judging
  const measuring = autoQuality() && !ui.paused && !document.hidden && !intro;
  if (measuring && !governing) governor.reset(nowS);
  governing = measuring;
  if (measuring && pendingQuality < 0 && governor.sample(rawMs, nowS)) qualityChanged(nowS);
  // (never mid-flight in a course intro: it waits for the countdown)
  if (pendingQuality >= 0 && !intro && warmup.prepared(nowS) && (calm() || nowS - pendingQuality > CALM_WAIT)) { pendingQuality = -1; applyRender(); governor.reset(nowS); }
  // the course intro (game/intro.ts): its clock runs once the warm-up is over and its first frame drawn,
  // never while paused or hidden; the sim waits at tick 0 until it is over
  const running = !ui.paused && (!document.hidden || devStepping);
  if (intro) {
    if (running && !warmed) {
      if (!intro.moving) { intro.moving = true; ui.introPhase('show'); } else intro.advance(frameDt);
      if (import.meta.env.DEV && devIntroAt !== null) intro.time = Math.min(devIntroAt, intro.plan.duration - 1e-3);
      if (intro.cardLeaving) ui.introPhase('out');
    }
    upgradeKarts();
    if (intro.done) endIntro();
  }
  let simDt = 0;
  if (running && !warmed && !intro) {
    const steps = acc.steps(frameDt * vfx.time.scale(nowS, reduced));
    simDt = steps * SIM_DT;
    for (let i = 0; i < steps; i++) {
      let live: InputState | null = null;
      if (racing) live = input.sample(SIM_DT); else input.sample(SIM_DT);
      // the driving assists (game/assist.ts) go on the sampled input, from the state this tick starts from,
      // before the tick quantizes and logs it: the log holds them, so a replay needs no assist
      if (live && assist && s.player && settings) live = assist.apply(live, s.player, s.state.phase, settings, SIM_DT);
      const ev = s.tick(racing && !autopilot ? live : null);
      vfx.onTick(directFx(ev.race, ev.items, attract || podium?.showing ? null : s.player?.racerId ?? null, fxBuf, confettiFor), kartOf, nowS, reduced);
      if (!attract && s.player) {
        ui.feed(ev.race, ev.items, s.player.racerId);
        // the race's sounds only while its screen is up: the results, GP table and Knockout cut
        // keep the field driving under their own song, engines already quiet
        if (racing) audio.tick(ev.race, ev.items, listener);
      }
    }
  }

  // over the line: the finish celebration (game/celebrate.ts); at its end the results come, the rest of
  // the field cut off as a press on the finish banner does (a press still skips straight to them)
  if (!attract && !celebrating && s.player?.finishTick !== undefined) startCelebration(s);
  if (celebrating && !skipResults && ui.app.screen === 'racing' && finishCam.time >= CELEBRATE.seconds) { s.manager.endRace(); skipResults = true; }
  if (attract && s.finishedFor > 4) startAttract();
  else if (!attract && ui.app.screen === 'racing' && ((!celebrating && s.finishedFor > RESULTS_AFTER) || (skipResults && s.state.phase === 'finished'))) raceOver();

  const cur = session!;
  if (warmup.active) return; // the attract loop just started its next race: compiling
  cur.frame(acc.alpha, frameDt, reduced, intro ? intro.sceneTime(cur.state.time) : undefined);
  if (skyEnv) followSky(cur);
  if (scene.fog && !(scene.fog as Fog).color.equals(cur.horizon)) { (scene.fog as Fog).color.copy(cur.horizon); (scene.background as Color).copy(cur.horizon); }
  applyLight(cur.skyLight, cur.bounce, frameDt, lightSnap, attract ? 0 : chase.tunnel);
  showShift(cur, racing && !ui.paused, reduced);
  if (post) { post.gradeTo = cur.skyLight.grade ?? DAY_GRADE; if (lightSnap) post.snapGrade(); }
  lightSnap = false;
  if (attract) tvCamera(frameDt); else if (intro) introCamera(reduced); else chaseCamera(frameDt, nowS, reduced);
  const ceremony = !attract && (podium?.showing ?? false);
  const liveDt = ui.paused || document.hidden ? 0 : frameDt;
  if (ceremony) podiumCamera(liveDt, reduced); else if (!attract && celebrating) celebrationCamera(liveDt, reduced);
  const pl = cur.player;
  // (no speed lines, lens or FOV kicks over the celebration; the podium's hidden field makes no sparks or dust)
  vfx.frame(frameDt, simDt, nowS, ceremony ? NO_KARTS : cur.state.karts, attract || celebrating || ceremony ? undefined : pl, camPos, reduced);
  if (!attract && !celebrating && !ceremony) camera.fov = kickedFov(camera.fov, vfx.kick.fov(nowS, reduced));
  camera.updateProjectionMatrix();
  const sh = vfx.shake;
  camera.position.set(camPos[0] + sh.x, camPos[1] + sh.y, camPos[2] + sh.z);
  cur.dome?.position.copy(camera.position);
  cur.farRing?.position.set(camera.position.x, 0, camera.position.z);
  camera.lookAt(lookTmp.set(camLook[0], camLook[1], camLook[2]));
  camera.rotateZ(attract ? 0 : intro ? introRoll : vfx.roll(pl));
  if (photo) {
    const rider = photo.kart !== undefined ? cur.views[photo.kart]?.root : undefined;
    if (rider) {
      rider.updateMatrixWorld(true);
      camera.position.copy(rider.localToWorld(photoAt.set(...photo.pos)));
      camera.lookAt(rider.localToWorld(photoLook.set(...photo.look)));
    } else { camera.position.set(...photo.pos); camera.lookAt(...photo.look); }
    camera.fov = photo.fov; camera.updateProjectionMatrix();
  }
  const at = intro ? sunAt : camLook;
  sun.target.position.set(at[0], at[1], at[2]);
  const so = sunOffset(cur.def.environment?.sunDirection);
  sun.position.set(at[0] + so[0], at[1] + so[1], at[2] + so[2]);

  // the ear sits on the camera, facing where it looks
  listener.position[0] = camPos[0]; listener.position[1] = camPos[1]; listener.position[2] = camPos[2];
  listener.heading = Math.atan2(camLook[0] - camPos[0], camLook[2] - camPos[2]);
  const p = cur.player;
  const pi = cur.playerIndex;
  audio.engines(p, pi >= 0 ? cur.inputs[pi].throttle : 0, topSpeed, cur.state.karts, listener, racing && !ui.paused);
  if (racing && !ui.paused) audio.input(p, pi >= 0 ? cur.inputs[pi] : undefined);
  if (p && !attract) {
    // the assists on, for the controls strip's words and Steering assist's badge (lit while it works)
    hudAssist.autoAccelerate = settings?.autoAccelerate ?? false;
    hudAssist.steering = settings?.steeringAssist ?? false;
    hudAssist.working = assist?.lit ?? false;
    ui.race({
      state: cur.state, player: p, shownRank: cur.state.trackers[pi].shownRank,
      coinCap,
      map: cur.track.minimap, itemDefs, trailing: cur.items.isTrailing(pi),
      assist: hudAssist,
    }, now);
  }
  // the governor's Low tier draws only the scenery copies in view (track-builder scene.ts cull): weak and software GPUs
  cur.trackScene.cull(camera, !renderer.shadowMap.enabled, (scene.fog as Fog | null)?.far);
  // the creature, the hazards, the balloons and the coins the lens meets fade as clean ghosts; in the finish camera's close-up the pickups from farther out (scene.ts lens)
  cur.trackScene.lens(camera, !attract && celebrating && !ceremony);
  post!.render(frameDt, attract || celebrating || ceremony ? 0 : vfx.boostLevel(pl, nowS, reduced), reduced);
  // the racer screen's hero (your racer in your current kart) and, with karts picked, the kart screen's (your racer in the focused kart)
  if (ui.app.screen === 'rosterSelect' || ui.app.screen === 'kartSelect') drawTurntable(nowS, reduced);
  // the warm-up draw's time is not the countdown's: the next frame starts from here, the governor warms up again
  if (warmed) { last = performance.now(); governor.reset(last / 1000); }
}

// ---- the racer screen's hero turntable: the focused racer in their paint and body (design §12, §10 rewards) ----
const showroom = new Showroom(scene.environment);
const clearWas = new Color();

/** Render the showroom into the main canvas under the hero box, then copy it into the box's own canvas (over the menu's dim). */
function drawTurntable(nowS: number, reduced: boolean): void {
  const t = ui.turntable();
  if (!t) return;
  const r = t.canvas.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return; // hidden on a small screen
  showroom.show(t.racerId, { ...artLook(t.look), kartId: t.kartId });
  showroom.update(nowS, reduced, r.width / r.height);
  const x = Math.round(r.left), w = Math.round(r.width), h = Math.round(r.height), y = Math.round(innerHeight - r.bottom);
  const alpha = renderer.getClearAlpha();
  renderer.getClearColor(clearWas);
  renderer.setScissorTest(true);
  renderer.setScissor(x, y, w, h);
  renderer.setViewport(x, y, w, h);
  renderer.setClearColor(showroom.background, 1);
  renderer.clear();
  renderer.render(showroom.scene, showroom.camera);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, innerWidth, innerHeight);
  renderer.setClearColor(clearWas, alpha);
  // the box's own canvas, at the drawing buffer's pixels (copied this frame, while the buffer holds them)
  const dpr = renderer.getPixelRatio(), cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(h * dpr));
  if (t.canvas.width !== cw || t.canvas.height !== ch) { t.canvas.width = cw; t.canvas.height = ch; }
  t.canvas.getContext('2d')?.drawImage(renderer.domElement, Math.round(x * dpr), Math.round(r.top * dpr), cw, ch, 0, 0, cw, ch);
}

/**
 * Once the model files are in, get every look ready a piece at a time while the game idles, so neither
 * the racer screen nor a race start waits on it: each alt paint's texture repainted and uploaded, each
 * driver cut for the shared bodies, and the showroom's shaders compiled.
 */
function warmLooks(): void {
  const idle = (f: () => void) => ('requestIdleCallback' in globalThis ? requestIdleCallback(() => f(), { timeout: 2000 }) : setTimeout(f, 60));
  const jobs: (() => void)[] = [
    ...PAINTS.map((p) => () => { const m = RACER_MODELS.paintMaterial(p.racerId, p.id) as MeshStandardMaterial | null; if (m?.map) renderer.initTexture(m.map); }),
    ...CAST.map((c) => () => { RACER_MODELS.driver(c.id); }),
    () => { void showroom.precompile(renderer, 'pip', { body: 'classic', paint: 'pip-alt' }); },
  ];
  const next = () => { const j = jobs.shift(); if (!j) return; j(); idle(next); };
  idle(next);
}
requestAnimationFrame(frame);

// dev hook: tuning and the perf check read the live objects from the console
if (import.meta.env.DEV) {
  /** dev: the last kart.audioLoad()'s files, as they come down, and a way to ask its bank for a song */
  let devAudioLog: unknown[] = [];
  let devSong: ((key: string) => void) | null = null;
  (globalThis as unknown as Record<string, unknown>).kart = {
    get session() { return session; }, ui, audio, vfx, post, renderer, governor, warmup,
    /** dev: run `n` frames of the real loop by hand, `ms` apart (works while the tab is hidden) */
    step: (n = 1, ms = 1000 / 60) => {
      devStepping = true;
      try { for (let i = 0; i < n; i++) step(last + ms); } finally { devStepping = false; }
      // the frames run by hand ran the clock ahead of the page's: the real loop carries on from now,
      // else it stood still (0 s frames) until the page caught up, 11 minutes after a whole race
      last = performance.now();
    },
    /** dev: let the AI drive the player's kart (soak tests); applies to this race and the next */
    autopilot: (on: boolean) => { autopilot = on; if (session) session.ai.drivePlayer = on; },
    /**
     * dev: hold the camera still at `pos` looking at `look` (null to let go), for checking art; with
     * `kart` (a kart index), both are in that kart's frame (+Z its nose, +X its left seen from the
     * driver's seat) and the camera rides along with it, a close-up that keeps up with a race
     */
    photo: (p: { pos: Vec3; look: Vec3; fov?: number; kart?: number } | null) => { photo = p ? { fov: 50, ...p } : null; },
    /** dev: jump straight into a quick race on any track, `opts.kartId` in any kart (design §5, K6) */
    race: (trackId: string, racerId = 'pip', opts: { intro?: IntroKind; mirror?: boolean; kartId?: string } = {}) => {
      // straight to the countdown, as it always was; `intro` flies the course intro first, `mirror` reflects the track
      devNoIntro = true;
      try {
        for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId }, { type: 'pickKart', kartId: kartFor(racerId, opts.kartId) }, { type: 'pickTrack', trackId }] as const) ui.dispatch(a);
      } finally { devNoIntro = false; }
      // from any other screen the menu walk does nothing: load the race directly
      const cfg = configFor({ mode: 'quick', racerId, speedClass: 150, cupId: null, tracks: [trackId], kartId: opts.kartId });
      if (ui.app.screen !== 'racing' || session?.def.id !== trackId || opts.intro || opts.mirror || opts.kartId) load(opts.mirror ? { ...cfg, mirrored: true } : cfg, false, opts.intro ?? null);
    },
    /** dev: hold the course intro at `s` seconds in (null lets it run), for checking its shots */
    introAt: (s: number | null) => { devIntroAt = s; },
    /** dev: the course intro under way (its plan and clock), or null */
    get intro() { return intro; },
    camera, scene, acc,
    /** dev: the PBR look's sky map (?look=pbr; null in the toon look), and a capture of the race's sky into it now */
    skyEnv, paintSkyEnv: () => { if (session) paintSkyEnv(session); },
    /** dev: grant all six design §10 unlocks (three paints, two bodies, Mirror) to try them; saved like any earned unlock */
    unlockAll: () => ui.grantAllUnlocks(),
    /** dev: the podium ceremony on this race's track with these three (1st to 3rd), for checking it (no overlay) */
    ceremony: (ids: string[] = ['pip', 'momo', 'nova']) => { buildPodium(ids); startPodium(); },
    /** dev: the podium, when there is one */
    get podium() { return podium; },
    stats: () => ({ tick: session?.state.tick, frames, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, drawables: session?.trackScene.drawables(), dpr: renderer.getPixelRatio(), low: !renderer.shadowMap.enabled }),
    /**
     * dev: the sound files coming down as the game asks for them on the first key press, for checks
     * under ?mute (which never makes an audio context): the real bank through the real background line
     * at the same turns, the title song asked for once the list is in (and `trackId`'s race song, if
     * given), each file "decoded" by a stand-in that makes silence of its length (128 kbps) so the trim
     * and level analysis runs as it would, and nothing is played. Each file's start and end (ms from the
     * call) and size, in the order they started; kart.audioLog holds it as it fills.
     */
    audioLoad: async (trackId?: string) => {
      const t0 = performance.now(), log: { file: string; start: number; end: number; kb: number }[] = [];
      devAudioLog = log;
      const traced = (async (input: string) => {
        const e = { file: String(input).replace(import.meta.env.BASE_URL, ''), start: Math.round(performance.now() - t0), end: -1, kb: 0 };
        log.push(e);
        const r = await fetch(input);
        const bytes = await r.arrayBuffer();
        e.end = Math.round(performance.now() - t0);
        e.kb = Math.round(bytes.byteLength / 1024);
        return new Response(bytes, { status: r.status });
      }) as unknown as typeof fetch;
      const silence = (bytes: number) => {
        const rate = 44100, length = Math.max(1, Math.round(((bytes * 8) / 128000) * rate)), chs = [new Float32Array(length), new Float32Array(length)];
        return { sampleRate: rate, numberOfChannels: 2, length, duration: length / rate, getChannelData: (c: number) => chs[c] } as unknown as AudioBuffer;
      };
      const stand = { decodeAudioData: async (b: ArrayBuffer) => silence(b.byteLength) } as unknown as BaseAudioContext;
      const bank = new SampleBank(import.meta.env.BASE_URL, traced);
      bank.schedule = audio.bank.schedule;
      const songs: Promise<unknown>[] = [];
      devSong = (key) => songs.push(bank.song(stand, key));
      bank.onManifest = () => { songs.push(bank.song(stand, 'title')); if (trackId) songs.push(bank.song(stand, themeForTrack(trackId))); };
      await bank.load(stand);
      await Promise.all(songs);
      return log;
    },
    /** dev: a race's song asked for from the last kart.audioLoad()'s bank, as a race start asks for it (its turn in the line) */
    audioSong: (trackId: string) => { devSong?.(themeForTrack(trackId)); },
    get audioLog() { return devAudioLog; },
  };
}
