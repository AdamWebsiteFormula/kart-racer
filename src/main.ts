// Test drive: Harbour Loop, you plus 7 AI, placeholder karts. Not the game — the
// smallest thing that lets the handling be felt. No items, no menus, no real art.
// Order per tick is the one the SOPs assume: AI fills inputs → manager.step → scene.
import {
  ACESFilmicToneMapping, AmbientLight, Color, DirectionalLight, Fog, PCFSoftShadowMap,
  PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import './style.css';
import { AiDriver } from './ai-driver/index.ts';
import { makeConstants } from './kart-controller/constants.ts';
import { InputSource } from './kart-controller/input.ts';
import { SIM_DT } from './kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type Vec3 } from './kart-controller/types.ts';
import { KartView } from './kart-controller/view.ts';
import { RaceManager } from './race-manager/index.ts';
import type { RaceConfig } from './race-manager/types.ts';
import { buildTrackScene } from './track-builder/mesh/index.ts';
import { buildTrack } from './track-builder/track.ts';
import harbourLoop from './track-builder/tracks/harbour-loop.json';
import type { TrackDefinition } from './track-builder/types.ts';
import { CAM, fovFor, idealPose, smoothTo } from './game/camera.ts';
import { hudNumbers } from './game/hud.ts';
import { buildKartMesh } from './game/kartMesh.ts';
import { Accumulator } from './game/loop.ts';
import { ROSTER } from './game/racers.ts';

const SPEED_CLASS = 100; // 100cc = Normal AI (ai-driver Decisions 2026-09-21); 150 is Hard
const PLAYER = 0; // index into ROSTER: you drive Pip

// ---- race ----
const track = buildTrack(harbourLoop as TrackDefinition);
const config: RaceConfig = {
  mode: 'quick', trackId: track.id, speedClass: SPEED_CLASS, seed: 1,
  racers: ROSTER.map((r, i) => ({ racerId: r.id, archetype: r.archetype, isPlayer: i === PLAYER })),
};
const manager = new RaceManager(track, config);
const ai = new AiDriver(track, config, manager.state, {});
const input = new InputSource();
const inputs: InputState[] = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));

// ---- scene ----
const scene = new Scene();
const trackScene = buildTrackScene(track);
scene.add(trackScene.group);
scene.background = new Color(...trackScene.palette.background);
scene.fog = new Fog(new Color(...trackScene.fog.color), 120, 800);

const sun = new DirectionalLight(0xfff4e0, 2.2);
sun.position.set(60, 120, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const cam = sun.shadow.camera;
cam.left = -60; cam.right = 60; cam.top = 60; cam.bottom = -60; cam.far = 400;
scene.add(sun, sun.target);
scene.add(new AmbientLight(0xbcd8ff, 1.1));

const views = manager.state.karts.map((s, i) => {
  const r = ROSTER[i];
  const view = new KartView(makeConstants(r.archetype, SPEED_CLASS), buildKartMesh(r.accent, r.secondary), s);
  scene.add(view.root);
  return view;
});

const camera = new PerspectiveCamera(fovFor(0), 1, 0.3, 1400);
const camPos: Vec3 = [...manager.state.karts[PLAYER].position];
const camLook: Vec3 = [...camPos];

const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // plan §6.4
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.toneMapping = ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---- hud ----
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <div class="banner"></div>
  <div class="corner tl"><span class="lap"></span><span class="time"></span></div>
  <div class="corner bl"><span class="place"></span></div>
  <div class="corner br"><span class="speed"></span><span class="drift"></span><span class="boost"></span></div>
  <div class="keys">↑ drive · ← → steer · ↓ brake · SHIFT drift · Q look back · R restart</div>`;
document.body.appendChild(hud);
const el = {
  banner: hud.querySelector('.banner') as HTMLElement,
  lap: hud.querySelector('.lap') as HTMLElement,
  time: hud.querySelector('.time') as HTMLElement,
  place: hud.querySelector('.place') as HTMLElement,
  speed: hud.querySelector('.speed') as HTMLElement,
  drift: hud.querySelector('.drift') as HTMLElement,
  boost: hud.querySelector('.boost') as HTMLElement,
};

// ---- loop ----
const acc = new Accumulator();

const player = manager.state.karts[PLAYER];
const tiers = makeConstants(ROSTER[PLAYER].archetype, SPEED_CLASS).driftTiers;
let last = performance.now();
let paused = false;

addEventListener('visibilitychange', () => {
  paused = document.hidden;
  if (!paused) { last = performance.now(); acc.reset(); }
});
addEventListener('keydown', (e) => { if (e.code === 'KeyR') location.reload(); });

// dev hook: tuning and the perf check read the live objects from the console
if (import.meta.env.DEV) {
  (globalThis as unknown as Record<string, unknown>).kart = {
    manager, ai, track, trackScene, views, renderer, camera, acc, scene, inputs,
    /** sim ticks and rendered frames since the page loaded */
    stats: () => ({ tick: manager.state.tick, frames, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, drawables: trackScene.drawables() }),
  };
}

let frames = 0;

function frame(now: number) {
  frames++;
  requestAnimationFrame(frame);
  const frameDt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (paused) return;

  const steps = acc.steps(frameDt);
  for (let i = 0; i < steps; i++) {
    ai.fill(manager.state, manager.lastActiveHazards, inputs);
    inputs[PLAYER] = player.finishTick === undefined ? input.sample(SIM_DT) : inputs[PLAYER];
    manager.step(inputs);
    for (let k = 0; k < views.length; k++) views[k].onTick(manager.state.karts[k], SIM_DT);
  }

  const alpha = acc.alpha;
  for (let k = 0; k < views.length; k++) views[k].onFrame(alpha, manager.state.karts[k], inputs[k].steer, frameDt);
  trackScene.update(manager.state.time, manager.lastActiveHazards);

  // chase camera on the player's interpolated pose
  const root = views[PLAYER].root.position;
  const pose = idealPose([root.x, root.y, root.z], views[PLAYER].root.rotation.y, player.speed, inputs[PLAYER].lookBack);
  const lag = inputs[PLAYER].lookBack ? CAM.flipLag : CAM.lag;
  smoothTo(camPos, pose.position, lag, frameDt);
  smoothTo(camLook, pose.target, lag, frameDt);
  camera.fov = fovFor(player.speed);
  camera.updateProjectionMatrix();
  camera.position.set(camPos[0], camPos[1], camPos[2]);
  camera.lookAt(new Vector3(camLook[0], camLook[1], camLook[2]));
  sun.target.position.copy(views[PLAYER].root.position);

  const h = hudNumbers(manager.state, player, tiers);
  el.banner.textContent = h.banner;
  el.lap.textContent = h.lap;
  el.time.textContent = h.time;
  el.place.textContent = h.position;
  el.speed.textContent = h.speed;
  el.drift.textContent = h.drift;
  el.boost.textContent = h.boost;

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
