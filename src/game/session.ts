// One race, from its config to its disposal: track, scene objects, race manager, items, AI
// and kart views. The game builds a fresh session for every race, restart and attract loop.
// Tick order is the one every SOP assumes: AI fills inputs → manager.step → items.step → views.
import { type Color, Group, type Object3D, type Scene } from 'three';
import { AiDriver } from '../ai-driver/index.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import { SIM_DT } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState } from '../kart-controller/types.ts';
import { KartView } from '../kart-controller/view.ts';
import { Items } from '../items/items.ts';
import type { ItemEvent } from '../items/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig, RaceEvent } from '../race-manager/types.ts';
import { buildTrackScene, type TrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { buildRacerMesh, isShared, paintSky, trackAssets } from '../art-pipeline/index.ts';
import { ItemsView } from './itemsView.ts';
import { buildKartMesh } from './kartMesh.ts';
import { ROSTER } from './racers.ts';

export class RaceSession {
  readonly track: Track;
  readonly trackScene: TrackScene;
  readonly manager: RaceManager;
  readonly items: Items;
  readonly ai: AiDriver;
  readonly views: KartView[];
  readonly itemsView: ItemsView;
  readonly config: RaceConfig;
  readonly def: TrackDefinition;
  /** index into karts[] of the player, or -1 (attract mode) */
  readonly playerIndex: number;
  readonly inputs: InputState[];
  /** the painted sky's horizon colour; the fog matches it so the far road melts into the sky */
  horizon: Color;
  /** seconds since the phase became `finished` */
  finishedFor = 0;
  private readonly group = new Group();
  private readonly scene: Scene;

  constructor(scene: Scene, def: TrackDefinition, config: RaceConfig) {
    this.scene = scene;
    this.def = def;
    this.config = config;
    this.track = buildTrack(def);
    this.trackScene = buildTrackScene(this.track, trackAssets());
    this.horizon = paintSky(this.trackScene.group, this.trackScene.sky);
    this.manager = new RaceManager(this.track, config);
    this.items = new Items(this.track, this.manager);
    this.ai = new AiDriver(this.track, config, this.manager.state, { itemRoles: this.items.roles });
    this.playerIndex = this.manager.state.karts.findIndex((k) => k.isPlayer);
    this.inputs = this.manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
    this.group.add(this.trackScene.group);
    this.itemsView = new ItemsView();
    this.group.add(this.itemsView.root);
    this.views = this.manager.state.karts.map((s, i) => {
      const r = ROSTER.find((x) => x.id === config.racers[i].racerId) ?? ROSTER[i % ROSTER.length];
      const mesh = buildRacerMesh(config.racers[i].racerId) ?? buildKartMesh(r.accent, r.secondary);
      const v = new KartView(makeConstants(config.racers[i].archetype, config.speedClass), mesh, s);
      this.group.add(v.root);
      return v;
    });
    scene.add(this.group);
  }

  get state() { return this.manager.state; }
  get player() { return this.playerIndex >= 0 ? this.manager.state.karts[this.playerIndex] : undefined; }

  /** One 120 Hz tick. `playerInput` is the live sample, or null to leave the slot to the AI autopilot. */
  tick(playerInput: InputState | null): { race: RaceEvent[]; items: ItemEvent[] } {
    const { manager, ai, items, inputs, views } = this;
    ai.fill(manager.state, manager.lastActiveHazards, inputs);
    const p = this.playerIndex;
    if (p >= 0 && playerInput && manager.state.karts[p].finishTick === undefined) inputs[p] = playerInput;
    const race = manager.step(inputs);
    for (const e of race) if (e.type === 'trackChanged' && e.event.sky) this.horizon = paintSky(this.trackScene.group, e.event.sky);
    const itemEvents = items.step(inputs, race, SIM_DT);
    for (let k = 0; k < views.length; k++) ai.threatened[k] = items.threatened[k];
    for (let k = 0; k < views.length; k++) views[k].onTick(manager.state.karts[k], SIM_DT);
    if (manager.state.phase === 'finished') this.finishedFor += SIM_DT;
    return { race, items: itemEvents };
  }

  /** Interpolated visuals for one rendered frame. */
  frame(alpha: number, frameDt: number): void {
    const st = this.manager.state;
    for (let k = 0; k < this.views.length; k++) this.views[k].onFrame(alpha, st.karts[k], this.inputs[k].steer, frameDt);
    this.trackScene.update(st.time, this.manager.lastActiveHazards, { pickups: st.pickupStates, coins: st.coinStates });
    this.itemsView.onFrame(this.items, st.karts, this.views.map((v) => v.root as Object3D), alpha, st.time);
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
    this.group.traverse((o) => {
      const m = o as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
      // shared placeholder geometries live at module scope; only per-session materials go
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const x of mats) if (!isShared(x as never)) x.dispose();
    });
  }
}
