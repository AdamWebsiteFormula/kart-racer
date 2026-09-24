// One race, from its config to its disposal: track, scene objects, race manager, items, AI
// and kart views. The game builds a fresh session for every race, restart and attract loop.
// Tick order is the one every SOP assumes: AI fills inputs → manager.step → items.step → views.
import { Color, Group, type Object3D, type Scene } from 'three';
import { AiDriver } from '../ai-driver/index.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import { SIM_DT } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState } from '../kart-controller/types.ts';
import { KartView } from '../kart-controller/view.ts';
import { Items } from '../items/items.ts';
import type { ItemEvent } from '../items/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import { GhostRecorder, type GhostPath } from '../race-manager/ghost.ts';
import type { RaceConfig, RaceEvent } from '../race-manager/types.ts';
import { buildTrackScene, recolourBackdrop, type Rgb, type TrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { buildRacerMesh, fadeSky, isShared, lightOf, paintSky, SKIES, skyTint, trackAssets, type KartLook, type SkyLight } from '../art-pipeline/index.ts';
import { ExhaustFlames } from '../vfx-juice/flames.ts';
import { GhostView } from './ghostView.ts';
import { ItemsView } from './itemsView.ts';
import { RescueView } from './rescueView.ts';
import { simTick, type SimParts } from './simtick.ts';
import { buildKartMesh, fadeKartNearCamera, ownKartMaterials } from './kartMesh.ts';
import { ROSTER } from './racers.ts';

export class RaceSession {
  readonly track: Track;
  readonly trackScene: TrackScene;
  readonly manager: RaceManager;
  readonly items: Items;
  readonly ai: AiDriver;
  readonly views: KartView[];
  /** the boost flames on each kart's pipes, by kart index */
  private readonly flames: ExhaustFlames[] = [];
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
  private readonly group = new Group();
  private readonly scene: Scene;
  /** the lights the race started under: the horizon ring was coloured for them */
  private readonly startLight: SkyLight;
  /** a Final Lap Shift's sky change under way: the fog and the horizon ring ease from → to with the dome's fade */
  private skyChange: { horizon: [Color, Color]; ring: [Rgb, Rgb]; tint: [Rgb, Rgb] } | null = null;

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
    this.views = this.manager.state.karts.map((s, i) => {
      const r = ROSTER.find((x) => x.id === config.racers[i].racerId) ?? ROSTER[i % ROSTER.length];
      const mesh = buildRacerMesh(config.racers[i].racerId, config.racers[i].isPlayer ? look : {}) ?? buildKartMesh(r.accent, r.secondary);
      const v = new KartView(makeConstants(config.racers[i].archetype, config.speedClass), mesh, s);
      this.flames.push(new ExhaustFlames(mesh, config.racers[i].racerId));
      // a rival against the lens dissolves, flames and all; yours never does
      if (i === this.playerIndex) ownKartMaterials(mesh); else fadeKartNearCamera(mesh);
      this.group.add(v.root);
      return v;
    });
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

  /** One 120 Hz tick. `playerInput` is the live sample, or null to leave the slot to the AI autopilot. */
  tick(playerInput: InputState | null): { race: RaceEvent[]; items: ItemEvent[] } {
    // the same tick the leaderboard server replays (game/simtick.ts)
    const ev = simTick(this.parts, playerInput);
    const st = this.manager.state;
    for (const e of ev.race) {
      if (e.type !== 'trackChanged' || !e.event.sky) continue;
      this.changeSky(e.event.sky);
    }
    for (let k = 0; k < this.views.length; k++) this.views[k].onTick(st.karts[k], SIM_DT);
    this.recorder?.record(st.tick, st.karts[this.playerIndex]);
    if (st.phase === 'finished') this.finishedFor += SIM_DT;
    return ev;
  }

  /** Interpolated visuals for one rendered frame. */
  frame(alpha: number, frameDt: number, reduced = false): void {
    const st = this.manager.state;
    const ch = this.skyChange;
    if (ch) {
      const k = fadeSky(this.dome, frameDt);
      if (k < 1) this.horizon.lerpColors(ch.horizon[0], ch.horizon[1], k); else this.horizon.copy(ch.horizon[1]);
      recolourBackdrop(this.farRing, lerpRgb(ch.ring[0], ch.ring[1], k), lerpRgb(ch.tint[0], ch.tint[1], k));
      if (k >= 1) this.skyChange = null;
    }
    for (let k = 0; k < this.views.length; k++) this.views[k].onFrame(alpha, st.karts[k], this.inputs[k].steer, frameDt);
    this.ghost?.place(st.tick - 1 + alpha, this.playerIndex >= 0 ? this.views[this.playerIndex].root.position : undefined);
    for (let k = 0; k < this.flames.length; k++) this.flames[k].update(st.karts[k].boost.remaining, st.time, reduced);
    this.trackScene.update(st.time, this.manager.lastActiveHazards, { pickups: st.mode === 'timeTrial' ? (this.hiddenBalloons ??= st.pickupStates.map(() => ({ respawnRemaining: 1 }))) : st.pickupStates, coins: st.coinStates });
    this.itemsView.onFrame(this.items, st.karts, this.views.map((v) => v.root as Object3D), alpha, st.time, frameDt, this.track);
    this.rescueView.onFrame(st.trackers, (i) => this.views[i].root.position, frameDt, st.time);
  }

  /** Time Trial: race against this recorded run (a picture only: it never touches the race). */
  setGhost(path: GhostPath, racerId: string, look: KartLook = {}): void {
    if (this.ghost) this.group.remove(this.ghost.root);
    this.ghost = new GhostView(path, racerId, look);
    this.ghost.place(0);
    this.group.add(this.ghost.root);
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
    this.group.traverse((o) => {
      const m = o as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
      // shared placeholder geometries live at module scope; only per-session materials go
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const x of mats) if (!isShared(x as never)) x.dispose();
    });
  }
}

const lerpRgb = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
