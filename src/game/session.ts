// One race, from its config to its disposal: track, scene objects, race manager, items, AI
// and kart views. The game builds a fresh session for every race, restart and attract loop.
// Tick order is the one every SOP assumes: AI fills inputs → manager.step → items.step → views.
import { Color, Group, type Material, type Object3D, type Scene } from 'three';
import { AiDriver } from '../ai-driver/index.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import { gestureFor } from '../kart-controller/driverAnim.ts';
import { SIM_DT } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type Vec3 } from '../kart-controller/types.ts';
import { KartView } from '../kart-controller/view.ts';
import { Items } from '../items/items.ts';
import type { ItemEvent } from '../items/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import { GhostRecorder, type GhostPath } from '../race-manager/ghost.ts';
import type { RaceConfig, RaceEvent } from '../race-manager/types.ts';
import { buildTrackScene, recolourBackdrop, type Rgb, type TrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { buildRacerMesh, comboOwnerOf, fadeSky, freeSkeletons, isShared, lightOf, paintSky, RACER_MODELS, SKIES, skyTint, trackAssets, type KartLook, type SkyLight } from '../art-pipeline/index.ts';
import { ExhaustFlames } from '../vfx-juice/flames.ts';
import { splitShadowDepth } from '../performance/shadowDepth.ts';
import { GhostView } from './ghostView.ts';
import { ItemsView } from './itemsView.ts';
import { RescueView } from './rescueView.ts';
import { simTick, type SimParts } from './simtick.ts';
import { KartFader } from './kartFade.ts';
import { buildKartMesh, ownKartMaterials } from './kartMesh.ts';
import { ROSTER } from './racers.ts';

/** Seconds before GO the player's rigged driver stops looking at the camera and faces the road. */
export const FACE_CAMERA_UNTIL = 1.1;

export class RaceSession {
  readonly track: Track;
  readonly trackScene: TrackScene;
  readonly manager: RaceManager;
  readonly items: Items;
  readonly ai: AiDriver;
  readonly views: KartView[];
  /** the boost flames on each kart's pipes, by kart index */
  private readonly flames: ExhaustFlames[] = [];
  /** a rival near the lens turns to a see-through ghost (kartFade.ts); yours never does */
  private readonly fader: KartFader;
  readonly itemsView: ItemsView;
  readonly rescueView = new RescueView();
  readonly config: RaceConfig;
  readonly def: TrackDefinition;
  /** index into karts[] of the player, or -1 (attract mode) */
  readonly playerIndex: number;
  readonly inputs: InputState[];
  /** the painted sky's horizon colour; the fog matches it so the far road melts into the sky (eased through a Final Lap Shift) */
  readonly horizon: Color;
  /** light from below: the sky's lower band on tracks with no ground (sky islands), else null for the earth tone */
  bounce: Color | null;
  /** the sky dome; the game keeps it centred on the camera so the horizon sits at eye level */
  readonly dome: Object3D | undefined;
  /** the far horizon ring (track-builder backdrop.ts); the game keeps it round the camera too */
  readonly farRing: Object3D | undefined;
  /** the lights the current sky wants (a sunset, a night); the game eases towards them */
  skyLight: SkyLight;
  /** seconds since the phase became `finished` */
  finishedFor = 0;
  /** Time Trial: the player's run as a ghost path, recorded to the finish (race-manager/ghost.ts) */
  private readonly recorder: GhostRecorder | null;
  /** Time Trial: the best run to race against, drawn see-through */
  private ghost: GhostView | null = null;
  /** Time Trial has no items (design §9): every balloon drawn popped (the sim's own pickup timers stay as they are for the replay) */
  private hiddenBalloons: { respawnRemaining: number }[] | null = null;
  private readonly parts: SimParts;
  /** each kart's view root, and the live pickups and coins, reused every frame (no garbage per frame) */
  private readonly roots: Object3D[];
  private readonly live: { pickups: readonly { respawnRemaining: number }[]; coins: RaceSession['state']['coinStates'] } = { pickups: [], coins: [] };
  private readonly group = new Group();
  private readonly scene: Scene;
  /** the lights the race started under: the horizon ring was coloured for them */
  private readonly startLight: SkyLight;
  /** a Final Lap Shift's sky change under way: the fog and the horizon ring ease from → to with the dome's fade */
  private skyChange: { horizon: [Color, Color]; ring: [Rgb, Rgb]; tint: [Rgb, Rgb] } | null = null;
  /** the race time the Final Lap Shift fired at (its set piece plays from there; visuals only), or -1 */
  private shiftAt = -1;
  /** each kart's look (the player's paint and body), and whether it was built code-only because its racer's model file was not in yet */
  private readonly looks: KartLook[] = [];
  private readonly coded: boolean[] = [];
  /** Time Trial's ghost as asked for, and whether it too waits for its racer's model */
  private ghostSpec: { path: GhostPath; racerId: string; look: KartLook; coded: boolean } | null = null;
  /** model karts built beside the race, ready to swap in (stageModels, swapInModels) */
  private staged: { i: number; mesh: Object3D; flames: ExhaustFlames }[] = [];
  private stagedGhost: GhostView | null = null;
  /** the camera's place (main.ts points it at its own each frame): a rigged driver looks at it on the grid and over the line */
  eye: Vec3 | null = null;

  /** `look`: the player's paint and body (design §10, cosmetic only); rivals always wear their own */
  constructor(scene: Scene, def: TrackDefinition, config: RaceConfig, look: KartLook = {}) {
    this.scene = scene;
    this.def = def;
    this.config = config;
    this.track = buildTrack(def);
    this.trackScene = buildTrackScene(this.track, trackAssets(def.biome));
    this.horizon = paintSky(this.trackScene.group, this.trackScene.sky);
    this.bounce = this.skyBounce(this.trackScene.sky);
    this.skyLight = lightOf(this.trackScene.sky);
    this.startLight = this.skyLight;
    this.trackScene.setPickupGlow(this.skyLight.glow ?? 0, true);
    this.dome = this.trackScene.group.getObjectByName('sky');
    this.farRing = this.trackScene.group.getObjectByName('horizon');
    this.manager = new RaceManager(this.track, config);
    this.items = new Items(this.track, this.manager);
    this.ai = new AiDriver(this.track, config, this.manager.state, { itemRoles: this.items.roles });
    this.playerIndex = this.manager.state.karts.findIndex((k) => k.isPlayer);
    this.recorder = config.mode === 'timeTrial' && this.playerIndex >= 0 ? new GhostRecorder() : null;
    this.recorder?.record(0, this.manager.state.karts[this.playerIndex]);
    this.inputs = this.manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
    this.parts = { manager: this.manager, items: this.items, ai: this.ai, inputs: this.inputs, playerIndex: this.playerIndex, playerSlot: { ...NEUTRAL_INPUT } };
    this.group.add(this.trackScene.group);
    this.itemsView = new ItemsView();
    this.group.add(this.rescueView.root);
    this.group.add(this.itemsView.root);
    this.fader = new KartFader(scene);
    this.views = this.manager.state.karts.map((s, i) => {
      const r = ROSTER.find((x) => x.id === config.racers[i].racerId) ?? ROSTER[i % ROSTER.length];
      this.looks.push(config.racers[i].isPlayer ? look : {});
      this.coded.push(!isReady(config.racers[i].racerId, config.racers[i].kartId));
      const mesh = buildRacerMesh(config.racers[i].racerId, this.lookFor(i)) ?? buildKartMesh(r.accent, r.secondary);
      const v = new KartView(makeConstants(config.racers[i].archetype, config.speedClass), mesh, s, i);
      this.flames.push(new ExhaustFlames(mesh, config.racers[i].racerId));
      // a rival against the lens turns to a ghost, flames and all; yours never does
      if (i === this.playerIndex) ownKartMaterials(mesh); else this.fader.add(mesh);
      this.group.add(v.root);
      return v;
    });
    this.roots = this.views.map((v) => v.root);
    splitShadowDepth(this.group);
    scene.add(this.group);
  }

  /** A Final Lap Shift's new sky: the dome starts its fade, the lights, fog, ring and pickups follow. */
  changeSky(sky: string): void {
    const was = this.skyChange;
    // from wherever the ring stands now (a second change mid-fade starts from its current colours)
    const k = was ? fadeSky(this.dome, 0) : 1;
    const to = paintSky(this.trackScene.group, sky);
    this.bounce = this.skyBounce(sky);
    this.skyLight = lightOf(sky);
    this.trackScene.setPickupGlow(this.skyLight.glow ?? 0);
    const ring = this.farRing?.getObjectByName('horizon-rings')?.userData;
    const rgb = (c: Color): Rgb => [c.r, c.g, c.b];
    const ringFrom: Rgb = was ? lerpRgb(was.ring[0], was.ring[1], k) : (ring?.horizon as Rgb | undefined) ?? rgb(this.horizon);
    const tintFrom: Rgb = was ? lerpRgb(was.tint[0], was.tint[1], k) : [1, 1, 1];
    this.skyChange = { horizon: [this.horizon.clone(), to], ring: [ringFrom, rgb(to)], tint: [tintFrom, skyTint(this.startLight, this.skyLight)] };
  }

  private skyBounce(sky: string | undefined): Color | null {
    return this.def.environment?.ground?.kind === 'none' && sky && SKIES[sky] ? new Color(SKIES[sky].ground) : null;
  }

  get state() { return this.manager.state; }
  get player() { return this.playerIndex >= 0 ? this.manager.state.karts[this.playerIndex] : undefined; }

  /** Kart index i's look, with the kart it races in (design §5; the sim's own, kart-controller karts.ts): `this.looks[i]`'s paint and body plus `config.racers[i].kartId`. */
  private lookFor(i: number): KartLook {
    return { ...this.looks[i], kartId: this.config.racers[i].kartId };
  }

  /** A racer's kart index (-1: not in this race). */
  private indexOf(racerId: string): number {
    const ks = this.manager.state.karts;
    for (let i = 0; i < ks.length; i++) if (ks[i].racerId === racerId) return i;
    return -1;
  }

  /** One 120 Hz tick. `playerInput` is the live sample, or null to leave the slot to the AI autopilot. */
  tick(playerInput: InputState | null): { race: RaceEvent[]; items: ItemEvent[] } {
    // the same tick the leaderboard server replays (game/simtick.ts)
    const ev = simTick(this.parts, playerInput);
    const st = this.manager.state;
    for (const e of ev.race) {
      if (e.type !== 'trackChanged') continue;
      splitShadowDepth(this.group); // the shift's rebuilt instancers
      if (e.event.sky) this.changeSky(e.event.sky);
      this.shiftAt = st.time; // its set piece plays from this tick (frame)
    }
    // an item used: the rigged driver throws it forward, tosses it back or holds it up (kart-controller driverAnim.ts)
    for (const e of ev.items) {
      if (e.type !== 'itemUsed') continue;
      const k = this.indexOf(e.racerId);
      if (k >= 0 && this.views[k].rigged) this.views[k].driver.itemUsed(gestureFor(this.items.roles[e.itemId], this.inputs[k].lookBack));
    }
    // what each driver can see: the others, and the camera (the player turns to it on the grid until just before GO)
    const toGo = (st.goTick - st.tick) * SIM_DT;
    for (let k = 0; k < this.views.length; k++) {
      const look = this.views[k].look;
      look.eye = this.eye;
      look.karts = st.karts;
      look.self = k;
      look.faceEye = st.phase === 'countdown' && k === this.playerIndex && toGo > FACE_CAMERA_UNTIL;
    }
    // the views read the tick's karts and inputs (the kart animation, kart-controller anim.ts); they never write them
    for (let k = 0; k < this.views.length; k++) this.views[k].onTick(st.karts[k], SIM_DT, this.inputs[k]);
    this.recorder?.record(st.tick, st.karts[this.playerIndex]);
    if (st.phase === 'finished') this.finishedFor += SIM_DT;
    return ev;
  }

  /**
   * Interpolated visuals for one rendered frame. `sceneTime`: the race time to draw the course's
   * creatures and hazards at instead of the sim's (the course intro, game/intro.ts, runs them on
   * toward the countdown while the sim waits at tick 0; drawn only, the sim never reads it).
   */
  frame(alpha: number, frameDt: number, reduced = false, sceneTime?: number): void {
    const st = this.manager.state;
    const ch = this.skyChange;
    if (ch) {
      const k = fadeSky(this.dome, frameDt);
      if (k < 1) this.horizon.lerpColors(ch.horizon[0], ch.horizon[1], k); else this.horizon.copy(ch.horizon[1]);
      recolourBackdrop(this.farRing, lerpRgb(ch.ring[0], ch.ring[1], k), lerpRgb(ch.tint[0], ch.tint[1], k));
      if (k >= 1) this.skyChange = null;
    }
    // while the sim waits (the course intro) the rigged drivers still look about on the grid
    if (sceneTime !== undefined && frameDt > 0) {
      for (let k = 0; k < this.views.length; k++) {
        const look = this.views[k].look;
        look.eye = this.eye; look.karts = st.karts; look.self = k; look.faceEye = false;
        this.views[k].idle(st.karts[k], frameDt);
      }
    }
    for (let k = 0; k < this.views.length; k++) this.views[k].onFrame(alpha, st.karts[k], this.inputs[k].steer, frameDt, reduced, this.track);
    this.ghost?.place(st.tick - 1 + alpha, this.playerIndex >= 0 ? this.views[this.playerIndex].root.position : undefined);
    for (let k = 0; k < this.flames.length; k++) this.flames[k].update(st.karts[k], st.time, reduced);
    const live = this.live;
    live.pickups = st.mode === 'timeTrial' ? (this.hiddenBalloons ??= st.pickupStates.map(() => ({ respawnRemaining: 1 }))) : st.pickupStates;
    live.coins = st.coinStates;
    if (sceneTime === undefined) this.trackScene.update(st.time, this.manager.lastActiveHazards, live);
    else this.trackScene.update(sceneTime, undefined, live);
    // the Final Lap Shift's set piece (track-builder mesh/shiftStage.ts), from the shift's own tick; the
    // fireworks go up ahead of the kart the camera follows
    const stage = this.trackScene.stage;
    if (stage) {
      const fk = st.karts[this.playerIndex >= 0 ? this.playerIndex : this.leader()];
      stage.update(this.shiftAt < 0 ? -1 : st.time - this.shiftAt + alpha * SIM_DT, sceneTime ?? st.time, fk.position, fk.heading, reduced);
    }
    this.itemsView.onFrame(this.items, st.karts, this.roots, alpha, st.time, frameDt, this.track);
    this.rescueView.onFrame(st.trackers, (i) => this.views[i].root.position, frameDt, st.time);
  }

  /** Time Trial: race against this recorded run (a picture only: it never touches the race). */
  setGhost(path: GhostPath, racerId: string, look: KartLook = {}): void {
    this.ghost?.dispose();
    this.ghost = new GhostView(path, racerId, look);
    this.ghostSpec = { path, racerId, look, coded: !RACER_MODELS.has(racerId) };
    this.ghost.place(0);
    this.group.add(this.ghost.root);
  }

  /**
   * The racers whose karts (or ghost) are code-built only because their model file was not in when
   * the race was built (a race picked early on a slow line): the player's first. main.ts asks for
   * them first and swaps them in during the course intro (stageModels, swapInModels).
   */
  waitingForModels(): string[] {
    const out: string[] = [];
    const add = (id: string) => { if (!out.includes(id)) out.push(id); };
    // a combo (design §5) waits on the kart owner's model too, never the kart owner's own driver
    const addSlot = (i: number) => { add(this.config.racers[i].racerId); const owner = comboOwnerOf(this.config.racers[i].racerId, this.lookFor(i)); if (owner) add(owner); };
    if (this.playerIndex >= 0 && this.coded[this.playerIndex]) addSlot(this.playerIndex);
    if (this.ghostSpec?.coded) add(this.ghostSpec.racerId);
    this.coded.forEach((c, i) => { if (c) addSlot(i); });
    return out.filter((id) => !RACER_MODELS.settled(id) || RACER_MODELS.has(id));
  }

  /**
   * Model karts for the waiting racers whose models are in now (of `ids`), built as the race would
   * build them (the player's own look and materials, the flames, a rival's see-through copies) into
   * `into`, beside the race, so their shaders compile and textures upload before swapInModels() puts
   * them in place. `into` is the caller's (hidden, never inside the race's group: a compile under
   * way must not see its materials freed with the race). A combo (design §5) stages only once both
   * its driver's and its kart owner's models are in, so it is never swapped in half-finished (its
   * own kart, silently, forever). Returns how many were built.
   */
  stageModels(ids: ReadonlySet<string>, into: Object3D): number {
    let n = 0;
    this.coded.forEach((c, i) => {
      const id = this.config.racers[i].racerId, owner = comboOwnerOf(id, this.lookFor(i));
      if (!c || !(ids.has(id) || (owner && ids.has(owner))) || !isReady(id, this.config.racers[i].kartId) || this.staged.some((x) => x.i === i)) return;
      const mesh = buildRacerMesh(id, this.lookFor(i));
      if (!mesh) return;
      const flames = new ExhaustFlames(mesh, id);
      if (i === this.playerIndex) ownKartMaterials(mesh); else this.fader.add(mesh);
      into.add(mesh);
      this.staged.push({ i, mesh, flames });
      n++;
    });
    const g = this.ghostSpec;
    if (g?.coded && ids.has(g.racerId) && RACER_MODELS.has(g.racerId) && !this.stagedGhost) {
      this.stagedGhost = new GhostView(g.path, g.racerId, g.look);
      into.add(this.stagedGhost.root);
      n++;
    }
    return n;
  }

  /** Put the staged model karts in place of the code-built ones (the animation carries on); the old ones are freed. Returns the racers swapped. */
  swapInModels(): string[] {
    const out: string[] = [];
    for (const { i, mesh, flames } of this.staged) {
      const old = this.views[i].setChassis(mesh);
      if (i !== this.playerIndex) this.fader.remove(old);
      this.flames[i] = flames;
      this.coded[i] = false;
      freeKart(old);
      out.push(this.config.racers[i].racerId);
    }
    this.staged = [];
    const g = this.stagedGhost, spec = this.ghostSpec;
    if (g && spec) {
      this.ghost?.dispose();
      this.ghost = g;
      spec.coded = false;
      g.place(this.manager.state.tick);
      this.group.add(g.root);
      if (!out.includes(spec.racerId)) out.push(spec.racerId);
    }
    this.stagedGhost = null;
    splitShadowDepth(this.group);
    return out;
  }

  /** Time Trial: this run's ghost path so far ('' when not recording). Complete once the player has finished. */
  ghostPath(): string {
    return this.recorder?.encode() ?? '';
  }

  /** The kart index leading the race (for the attract camera). */
  leader(): number {
    const st = this.manager.state;
    let best = 0;
    for (let i = 1; i < st.karts.length; i++) if (st.karts[i].rank > 0 && st.karts[i].rank < st.karts[best].rank) best = i;
    return best;
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.group.remove(this.trackScene.group);
    this.trackScene.dispose();
    this.rescueView.dispose();
    this.itemsView.dispose();
    this.fader.dispose();
    this.group.traverse((o) => {
      const m = o as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
      // shared placeholder geometries live at module scope; only per-session materials go
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const x of mats) if (!isShared(x as never)) x.dispose();
    });
    freeSkeletons(this.group);
  }
}

/** A kart's own materials, freed (the racers' shared ones stay: every race and the showroom use them), and a rigged one's bone texture. */
function freeKart(root: Object3D): void {
  root.removeFromParent();
  root.traverse((o) => {
    const m = (o as unknown as { material?: Material | Material[] }).material;
    for (const x of Array.isArray(m) ? m : m ? [m] : []) if (!isShared(x as never)) x.dispose();
  });
  freeSkeletons(root);
}

const lerpRgb = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** `racerId` in `kartId` (design §5) has everything its mesh needs in already: its own model, and, for another racer's kart, that racer's model too. */
function isReady(racerId: string, kartId: string | undefined): boolean {
  if (!RACER_MODELS.has(racerId)) return false;
  const owner = comboOwnerOf(racerId, { kartId });
  return !owner || RACER_MODELS.has(owner);
}
