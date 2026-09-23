// The game: renderer, lights, camera, the ui-hud overlay, and one RaceSession at a time.
// Behind the menus an all-AI race runs as the attract mode; picking a race swaps in a new
// session with the player. Fixed 120 Hz sim with render interpolation (plan §6.4).
import {
  ACESFilmicToneMapping, AmbientLight, Color, DirectionalLight, Fog, HemisphereLight, PCFShadowMap,
  PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import creditsMarkdown from '../CREDITS.md?raw';
import { GameAudio, songForTrack, type Listener } from './audio/index.ts';
import { dailySeed, dailyTrack, soloConfig, CLIENT_VERSION, isBoardMode } from './backend-leaderboard/rules.ts';
import { encodeLog } from './backend-leaderboard/inputlog.ts';
import { leaderboardClient } from './backend-leaderboard/client.ts';
import { Post, Vfx, directFx, newEffects } from './vfx-juice/index.ts';
import { dprCap, Governor } from './performance/governor.ts';
import { InputSource } from './kart-controller/input.ts';
import { SIM_DT } from './kart-controller/step.ts';
import type { InputState, SpeedClass, Vec3 } from './kart-controller/types.ts';
import { ITEMS_CONFIG } from './items/data.ts';
import { makeConstants } from './kart-controller/constants.ts';
import { applyResults, createGrandPrix, createKnockout, isDone, nextRace } from './race-manager/series.ts';
import type { GrandPrixState, RaceConfig, RaceMode, RacerConfig, SeriesState } from './race-manager/types.ts';
import type { TrackDefinition } from './track-builder/types.ts';
import { CAM, chaseYaw, easedSpeed, fovFor, idealPose, smoothTo, travelYaw } from './game/camera.ts';
import { Accumulator } from './game/loop.ts';
import { RaceSession } from './game/session.ts';
import { CAST, UiRoot, browserBackend, trackCard, type RacePlan, type Settings, type UiHost } from './ui-hud/index.ts';
import './ui-hud/ui.css';

// ---- content: every track file present is a built track ----
const TRACK_FILES = import.meta.glob('./track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = new Map<string, TrackDefinition>(Object.values(TRACK_FILES).map((d) => [d.id, d]));
const FIRST_TRACK = [...TRACKS.keys()][0];
const ALL_MODES: ReadonlySet<RaceMode> = new Set<RaceMode>(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']);
const ATTRACT_CC: SpeedClass = 150;
/** seconds the finished race stays on screen before the results slide in */
const RESULTS_AFTER = 2.5;

// ---- renderer, scene, lights ----
const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.info.autoReset = false; // the post chain renders several passes; count the whole frame
renderer.domElement.className = 'game';
let post: Post | null = null; // made once the camera exists
document.body.appendChild(renderer.domElement);

const scene = new Scene();
const sun = new DirectionalLight(0xfff4e0, 2.2);
sun.position.set(60, 120, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 400 });
const EARTH = new Color(0x7a6a4f);
const hemi = new HemisphereLight(0xcfe8ff, EARTH, 0.9);
scene.add(sun, sun.target, hemi, new AmbientLight(0xbcd8ff, 0.5));

const camera = new PerspectiveCamera(fovFor(0), 1, 0.3, 1400);
const vfx = new Vfx(scene, camera);
post = new Post(renderer, scene, camera);
const fxBuf = newEffects();
const camPos: Vec3 = [0, 20, 40];
const camLook: Vec3 = [0, 0, 0];
const lookTmp = new Vector3();
let camYaw = 0;
let camSpeed = 0;
let orbit = 0;

let settings: Settings | null = null;
// quality Auto: the governor trades resolution, then shadows and post, to hold 55+ fps
const coarse = matchMedia('(pointer: coarse)').matches;
const governor = new Governor(dprCap(devicePixelRatio, coarse));
let governing = false;
const autoQuality = () => (settings?.quality ?? 'auto') === 'auto';
function applyRender(): void {
  const auto = autoQuality();
  const low = settings?.quality === 'low' || (auto && governor.low);
  renderer.setPixelRatio(dprCap(devicePixelRatio, coarse) * (settings?.resolutionScale ?? 1) * (auto ? governor.scale : 1));
  renderer.shadowMap.enabled = !low;
  post?.setEnabled(!low);
  resize();
}
function resize(): void {
  renderer.setSize(innerWidth, innerHeight);
  post?.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---- sessions ----
/** dev only: the AI drives the player (soak tests through the real loop), and frames stepped by hand */
let autopilot = false;
let devStepping = false;
let session: RaceSession | null = null;
let attract = true;
let series: SeriesState | null = null;
let overSent = false;
let coinCap = 10;
let topSpeed = 25;
const audio = new GameAudio();
/** racerId → kart index for the current session (audio needs positions by racer) */
const indexOf = new Map<string, number>();
const kartOf = (id: string) => { const i = indexOf.get(id); return i === undefined ? undefined : session?.state.karts[i]; };
const listener: Listener = {
  playerId: null, position: [0, 0, 0], heading: 0,
  positionOf: (id) => { const i = indexOf.get(id); return i === undefined ? undefined : session?.state.karts[i].position; },
};
const input = new InputSource();
const acc = new Accumulator();

function roster(playerId: string | null): RacerConfig[] {
  // the player first in racer order; race-manager puts them on the back row
  const cast = playerId ? [...CAST.filter((c) => c.id === playerId), ...CAST.filter((c) => c.id !== playerId)] : [...CAST];
  return cast.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: c.id === playerId }));
}

function load(config: RaceConfig, isAttract: boolean): void {
  session?.dispose();
  const def = TRACKS.get(config.trackId) ?? TRACKS.get(FIRST_TRACK)!;
  session = new RaceSession(scene, def, { ...config, trackId: def.id });
  attract = isAttract;
  overSent = false;
  const pi = session.playerIndex;
  const kc = makeConstants(session.config.racers[Math.max(0, pi)].archetype, session.config.speedClass);
  coinCap = kc.coinCap;
  topSpeed = kc.topSpeed;
  indexOf.clear();
  session.state.karts.forEach((k, i) => indexOf.set(k.racerId, i));
  listener.playerId = session.player?.racerId ?? null;
  if (isAttract) audio.play('title'); else audio.newRace(songForTrack(def.id), def.id);
  if (governor.newRace(performance.now() / 1000) && autoQuality()) applyRender();
  if (import.meta.env.DEV) session.ai.drivePlayer = autopilot;
  scene.background = session.horizon.clone();
  scene.fog = new Fog(session.horizon.clone(), 140, 850);
  acc.reset();
  vfx.reset();
  const k = session.player ?? session.state.karts[0];
  camYaw = k.heading;
  camSpeed = 0;
  camPos[0] = k.position[0] - Math.sin(k.heading) * 12; camPos[1] = k.position[1] + 6; camPos[2] = k.position[2] - Math.cos(k.heading) * 12;
  camLook[0] = k.position[0]; camLook[1] = k.position[1]; camLook[2] = k.position[2];
}

function startAttract(): void {
  series = null;
  const seed = Math.floor(Math.random() * 1e6); // attract only: never recorded, never replayed
  load({ mode: 'quick', trackId: FIRST_TRACK, speedClass: ATTRACT_CC, seed, racers: roster(null) }, true);
}

function configFor(p: RacePlan): RaceConfig {
  // leaderboard modes are the exact solo race the server replays (backend-leaderboard/rules.ts)
  if (p.mode === 'timeTrial') return soloConfig('timeTrial', p.tracks[0] ?? FIRST_TRACK, p.racerId, 0);
  if (p.mode === 'daily') { const seed = dailySeed(); return soloConfig('daily', dailyTrack(seed, [...TRACKS.keys()]), p.racerId, seed); }
  return { mode: p.mode, trackId: p.tracks[0] ?? FIRST_TRACK, speedClass: p.speedClass, seed: Date.now() % 1_000_000, racers: roster(p.racerId) };
}

const host: UiHost = {
  builtTracks: new Set(TRACKS.keys()),
  availableModes: ALL_MODES,
  creditsMarkdown,
  leaderboard: leaderboardClient(),
  startRace(p) {
    series = null;
    const racers = roster(p.racerId);
    const seed = Date.now() % 1_000_000;
    if (p.mode === 'grandPrix' && p.cupId) series = createGrandPrix({ id: p.cupId, trackIds: p.tracks }, racers, p.speedClass, seed);
    if (p.mode === 'knockout' && p.cupId) series = createKnockout({ id: p.cupId, trackIds: p.tracks }, racers, p.speedClass, seed);
    load(series ? nextRace(series)! : configFor(p), false);
  },
  nextRace() {
    const next = series ? nextRace(series) : undefined;
    if (next) load(next, false); else startAttract();
  },
  restartRace() {
    if (session) load(session.config, false);
  },
  quitRace() { startAttract(); },
  setPaused(p) {
    if (!p) acc.reset();
  },
  settingsChanged(s) { settings = s; governor.reset(performance.now() / 1000); applyRender(); audio.setVolumes({ master: s.masterVolume, music: s.musicVolume, sfx: s.sfxVolume }); },
  uiSound(kind) { audio.ui(kind); },
  screenChanged(app) {
    // leaving the race screens for the menus brings the attract race back
    if (!attract && (app.screen === 'modeSelect' || app.screen === 'title')) startAttract();
  },
};

const ui = new UiRoot(document.body, host, browserBackend());
settings = ui.save.settings;
audio.setVolumes({ master: settings.masterVolume, music: settings.musicVolume, sfx: settings.sfxVolume });
applyRender();
startAttract();

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
  if (series) {
    const before = series.kind === 'grandPrix' ? structuredClone(series) : null;
    applyResults(series, results); // mutates
    if (series.kind === 'grandPrix') gp = { before, after: series };
    else ko = { after: series };
    const playerOut = series.kind === 'knockout' && player !== undefined && series.eliminated.includes(player.racerId);
    seriesHasNext = !isDone(series) && !playerOut;
  }
  audio.play('results');
  // Time Trial and Daily runs can go on the leaderboard: the whole input log, from tick 0
  const mode = session.config.mode;
  const mine = results.ranks.find((r) => r.racerId === player?.racerId);
  const board = isBoardMode(mode) && player && mine && !mine.dnf ? {
    mode, dailySeed: mode === 'daily' ? session.config.seed : null,
    draft: {
      trackId: session.def.id, mode, ...(mode === 'daily' ? { dailySeed: session.config.seed } : {}), speedClass: 150 as const,
      timeMs: mine.timeMs, lapTimesMs: mine.lapTimesMs, racerId: player.racerId,
      inputLog: encodeLog(session.state.inputLog), clientVersion: CLIENT_VERSION,
    },
  } : undefined;
  ui.raceOver({
    results, trackName: trackCard(session.def.id)?.name ?? session.def.name, playerId: player?.racerId ?? null,
    gp, ko, seriesHasNext, board,
    medalTimesMs: mode === 'timeTrial' ? session.def.medalTimesMs : undefined,
  });
}

// ---- cameras ----
function chaseCamera(frameDt: number): void {
  const s = session!;
  const i = s.playerIndex >= 0 ? s.playerIndex : s.leader();
  const k = s.state.karts[i];
  const root = s.views[i].root.position;
  const lookBack = s.inputs[i]?.lookBack ?? false;
  const want = travelYaw(s.views[i].root.rotation.y, k.speed, k.lateralVelocity, k.drift.active);
  camYaw = chaseYaw(camYaw, want, lookBack ? CAM.flipLag : CAM.yawLag, frameDt);
  camSpeed = easedSpeed(camSpeed, k.speed, frameDt);
  const pose = idealPose([root.x, root.y, root.z], camYaw, camSpeed, lookBack);
  const lag = lookBack ? CAM.flipLag : CAM.lag;
  smoothTo(camPos, pose.position, lag, frameDt);
  smoothTo(camLook, pose.target, lag, frameDt);
  camera.fov = fovFor(camSpeed);
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
/** dev only: a fixed camera for checking art up close (kart.photo) */
let photo: { pos: Vec3; look: Vec3; fov: number } | null = null;
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

  const racing = !attract && ui.app.screen === 'racing';
  const reduced = ui.reducedMotion;
  const nowS = now / 1000;
  // measure only live play; after a pause or a hidden tab, warm up again before judging
  const measuring = autoQuality() && !ui.paused && !document.hidden;
  if (measuring && !governing) governor.reset(nowS);
  governing = measuring;
  if (measuring && governor.sample(rawMs, nowS)) applyRender();
  let simDt = 0;
  if (!ui.paused && (!document.hidden || devStepping)) {
    const steps = acc.steps(frameDt * vfx.time.scale(nowS, reduced));
    simDt = steps * SIM_DT;
    for (let i = 0; i < steps; i++) {
      let live: InputState | null = null;
      if (racing) live = input.sample(SIM_DT); else input.sample(SIM_DT);
      const ev = s.tick(racing && !autopilot ? live : null);
      vfx.onTick(directFx(ev.race, ev.items, attract ? null : s.player?.racerId ?? null, fxBuf), kartOf, nowS, reduced);
      if (!attract && s.player) {
        ui.feed(ev.race, ev.items, s.player.racerId);
        audio.tick(ev.race, ev.items, listener);
      }
    }
  }

  if (attract && s.finishedFor > 4) startAttract();
  else if (!attract && s.finishedFor > RESULTS_AFTER && ui.app.screen === 'racing') raceOver();

  const cur = session!;
  cur.frame(acc.alpha, frameDt, reduced);
  if (scene.fog && !(scene.fog as Fog).color.equals(cur.horizon)) { (scene.fog as Fog).color.copy(cur.horizon); (scene.background as Color).copy(cur.horizon); }
  hemi.groundColor.copy(cur.bounce ?? EARTH);
  if (attract) tvCamera(frameDt); else chaseCamera(frameDt);
  const pl = cur.player;
  vfx.frame(frameDt, simDt, nowS, cur.state.karts, attract ? undefined : pl, camPos, reduced);
  if (!attract) camera.fov += vfx.kick.fov(nowS, reduced);
  camera.updateProjectionMatrix();
  const sh = vfx.shake;
  camera.position.set(camPos[0] + sh.x, camPos[1] + sh.y, camPos[2] + sh.z);
  cur.dome?.position.copy(camera.position);
  camera.lookAt(lookTmp.set(camLook[0], camLook[1], camLook[2]));
  camera.rotateZ(attract ? 0 : vfx.roll(pl, reduced));
  if (photo) { camera.position.set(...photo.pos); camera.lookAt(...photo.look); camera.fov = photo.fov; camera.updateProjectionMatrix(); }
  sun.target.position.set(camLook[0], camLook[1], camLook[2]);
  sun.position.set(camLook[0] + 60, camLook[1] + 120, camLook[2] + 40);

  // the ear sits on the camera, facing where it looks
  listener.position[0] = camPos[0]; listener.position[1] = camPos[1]; listener.position[2] = camPos[2];
  listener.heading = Math.atan2(camLook[0] - camPos[0], camLook[2] - camPos[2]);
  const p = cur.player;
  const pi = cur.playerIndex;
  audio.engines(p, pi >= 0 ? cur.inputs[pi].throttle : 0, topSpeed, cur.state.karts, listener, racing && !ui.paused);
  if (racing && !ui.paused) audio.input(p, pi >= 0 ? cur.inputs[pi] : undefined);
  if (p && !attract) {
    ui.race({
      state: cur.state, player: p, shownRank: cur.state.trackers[pi].shownRank,
      coinCap,
      map: cur.track.minimap, itemDefs,
    }, now);
  }
  post!.render(frameDt, !attract && !!pl && pl.boost.remaining > 0, reduced);
}
requestAnimationFrame(frame);

// dev hook: tuning and the perf check read the live objects from the console
if (import.meta.env.DEV) {
  (globalThis as unknown as Record<string, unknown>).kart = {
    get session() { return session; }, ui, audio, vfx, post, renderer, governor,
    /** dev: run `n` frames of the real loop by hand, `ms` apart (works while the tab is hidden) */
    step: (n = 1, ms = 1000 / 60) => {
      devStepping = true;
      try { for (let i = 0; i < n; i++) step(last + ms); } finally { devStepping = false; }
    },
    /** dev: let the AI drive the player's kart (soak tests); applies to this race and the next */
    autopilot: (on: boolean) => { autopilot = on; if (session) session.ai.drivePlayer = on; },
    /** dev: hold the camera still at `pos` looking at `look` (null to let go), for checking art */
    photo: (p: { pos: Vec3; look: Vec3; fov?: number } | null) => { photo = p ? { fov: 50, ...p } : null; },
    /** dev: jump straight into a quick race on any track */
    race: (trackId: string, racerId = 'pip') => { ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' }); ui.dispatch({ type: 'pickRacer', racerId }); load({ ...configFor({ mode: 'quick', racerId, speedClass: 150, cupId: null, tracks: [trackId] }) }, false); }, camera, scene, acc,
    stats: () => ({ tick: session?.state.tick, frames, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, drawables: session?.trackScene.drawables(), dpr: renderer.getPixelRatio(), low: !renderer.shadowMap.enabled }),
  };
}
