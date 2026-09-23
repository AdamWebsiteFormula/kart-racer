// The game: renderer, lights, camera, the ui-hud overlay, and one RaceSession at a time.
// Behind the menus an all-AI race runs as the attract mode; picking a race swaps in a new
// session with the player. Fixed 120 Hz sim with render interpolation (plan §6.4).
import {
  ACESFilmicToneMapping, AmbientLight, Color, DirectionalLight, Fog, HemisphereLight, PCFSoftShadowMap,
  PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import creditsMarkdown from '../CREDITS.md?raw';
import { GameAudio, songForTrack, type Listener } from './audio/index.ts';
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
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.domElement.className = 'game';
document.body.appendChild(renderer.domElement);

const scene = new Scene();
const sun = new DirectionalLight(0xfff4e0, 2.2);
sun.position.set(60, 120, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 400 });
scene.add(sun, sun.target, new HemisphereLight(0xcfe8ff, 0x7a6a4f, 0.9), new AmbientLight(0xbcd8ff, 0.5));

const camera = new PerspectiveCamera(fovFor(0), 1, 0.3, 1400);
const camPos: Vec3 = [0, 20, 40];
const camLook: Vec3 = [0, 0, 0];
const lookTmp = new Vector3();
let camYaw = 0;
let camSpeed = 0;
let orbit = 0;

let settings: Settings | null = null;
function applyRender(): void {
  const scale = settings?.resolutionScale ?? 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * scale);
  renderer.shadowMap.enabled = settings?.quality !== 'low';
  resize();
}
function resize(): void {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---- sessions ----
let session: RaceSession | null = null;
let attract = true;
let series: SeriesState | null = null;
let overSent = false;
let coinCap = 10;
let topSpeed = 25;
const audio = new GameAudio();
/** racerId → kart index for the current session (audio needs positions by racer) */
const indexOf = new Map<string, number>();
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
  if (isAttract) audio.play('title'); else audio.newRace(songForTrack(def.id));
  scene.background = session.horizon.clone();
  scene.fog = new Fog(session.horizon.clone(), 140, 850);
  acc.reset();
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

function dailySeed(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function configFor(p: RacePlan): RaceConfig {
  const seed = p.mode === 'daily' ? dailySeed() : Date.now() % 1_000_000;
  const trackId = p.mode === 'daily' ? [...TRACKS.keys()][seed % TRACKS.size] : p.tracks[0] ?? FIRST_TRACK;
  const racers = p.mode === 'timeTrial' ? roster(p.racerId).slice(0, 1) : roster(p.racerId);
  return { mode: p.mode, trackId, speedClass: p.mode === 'timeTrial' ? 150 : p.speedClass, seed, racers };
}

const host: UiHost = {
  builtTracks: new Set(TRACKS.keys()),
  availableModes: ALL_MODES,
  creditsMarkdown,
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
  settingsChanged(s) { settings = s; applyRender(); audio.setVolumes({ master: s.masterVolume, music: s.musicVolume, sfx: s.sfxVolume }); },
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
  ui.raceOver({
    results, trackName: trackCard(session.def.id)?.name ?? session.def.name, playerId: player?.racerId ?? null,
    gp, ko, seriesHasNext,
    medalTimesMs: session.config.mode === 'timeTrial' ? session.def.medalTimesMs : undefined,
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
let last = performance.now();
let frames = 0;
const itemDefs = ITEMS_CONFIG.items;

function frame(now: number): void {
  frames++;
  requestAnimationFrame(frame);
  const frameDt = Math.min(0.25, (now - last) / 1000);
  last = now;
  ui.poll(now);
  const s = session;
  if (!s) return;

  const racing = !attract && ui.app.screen === 'racing';
  if (!ui.paused && !document.hidden) {
    const steps = acc.steps(frameDt);
    for (let i = 0; i < steps; i++) {
      let live: InputState | null = null;
      if (racing) live = input.sample(SIM_DT); else input.sample(SIM_DT);
      const ev = s.tick(racing ? live : null);
      if (!attract && s.player) {
        ui.feed(ev.race, ev.items, s.player.racerId);
        audio.tick(ev.race, ev.items, listener);
      }
    }
  }

  if (attract && s.finishedFor > 4) startAttract();
  else if (!attract && s.finishedFor > RESULTS_AFTER && ui.app.screen === 'racing') raceOver();

  const cur = session!;
  cur.frame(acc.alpha, frameDt);
  if (scene.fog && !(scene.fog as Fog).color.equals(cur.horizon)) { (scene.fog as Fog).color.copy(cur.horizon); (scene.background as Color).copy(cur.horizon); }
  if (attract) tvCamera(frameDt); else chaseCamera(frameDt);
  camera.updateProjectionMatrix();
  camera.position.set(camPos[0], camPos[1], camPos[2]);
  camera.lookAt(lookTmp.set(camLook[0], camLook[1], camLook[2]));
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
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// dev hook: tuning and the perf check read the live objects from the console
if (import.meta.env.DEV) {
  (globalThis as unknown as Record<string, unknown>).kart = {
    get session() { return session; }, ui, audio, renderer, camera, scene, acc,
    stats: () => ({ tick: session?.state.tick, frames, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, drawables: session?.trackScene.drawables() }),
  };
}
