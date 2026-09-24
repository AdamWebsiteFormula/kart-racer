// FINAL LAP against the real sim: the same tick the game runs, the AI driving all eight karts, the
// HUD memory and the audio director fed exactly as main.ts feeds them. Each racer in turn is read
// as the player (the player's id only filters the events), so one race covers the leader, who
// starts the last lap on the same tick as the Final Lap Shift, and the trailers, who start it later.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { direct } from '../audio/director.ts';
import { simTick, type SimParts } from '../game/simtick.ts';
import { ITEM_DEFINITIONS } from '../items/data.ts';
import { Items } from '../items/items.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from './data/cast.ts';
import { feedHud, hudModel, newHudMemory } from './hudModel.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = new Map(Object.values(FILES).map((d) => [d.id, d]));
const defs = ITEM_DEFINITIONS.map((d) => ({ id: d.id, name: d.name }));

describe('final lap, end to end', () => {
  it('FINAL LAP, the fanfare and the lift come on each racer\'s own last lap; before it the shift shows only its label', () => {
    const config: RaceConfig = {
      mode: 'quick', trackId: 'meadow-run', speedClass: 150, seed: 1,
      racers: CAST.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: false })),
    };
    const track = buildTrack(TRACKS.get(config.trackId)!);
    const manager = new RaceManager(track, config);
    const items = new Items(track, manager);
    const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
    const parts: SimParts = { manager, items, ai, inputs: manager.state.karts.map(() => ({ ...NEUTRAL_INPUT })), playerIndex: -1, playerSlot: { ...NEUTRAL_INPUT } };
    const st = manager.state;
    const ids = st.karts.map((k) => k.racerId);
    const mem = new Map(ids.map((id) => [id, newHudMemory()]));
    type Seen = { kind: string; text: string; sub: string; lap: string; sfx: string[]; music: string[] };
    const atShift = new Map<string, Seen>(), atOwn = new Map<string, Seen>();
    let label = '';
    for (let t = 0; t < 300 * SIM_HZ && st.phase !== 'finished'; t++) {
      const ev = simTick(parts, null);
      const clock = t / SIM_HZ;
      const shift = ev.race.some((e) => e.type === 'phase' && e.phase === 'finalLap');
      for (const e of ev.race) if (e.type === 'trackChanged') label = e.event.label;
      st.karts.forEach((k, i) => {
        const m = mem.get(k.racerId)!;
        feedHud(m, ev.race, ev.items, k.racerId, clock);
        const own = ev.race.some((e) => e.type === 'lap' && e.racerId === k.racerId && e.isFinal);
        if (!shift && !own) return;
        const heard = direct(ev.race, ev.items, { playerId: k.racerId, position: [0, 0, 0], heading: 0, positionOf: () => undefined });
        const vm = hudModel(st, k, st.trackers[i].shownRank, 10, m, clock, defs, 0);
        const seen = {
          kind: vm.banner?.kind ?? '', text: vm.banner?.text ?? '', sub: vm.banner?.sub ?? '', lap: vm.lap,
          sfx: heard.cues.map((c) => c.sfx), music: heard.music.map((c) => c.type),
        };
        if (shift) atShift.set(k.racerId, seen);
        if (own) atOwn.set(k.racerId, seen);
      });
    }
    expect(label).not.toBe('');
    const leader = ids.filter((id) => atOwn.has(id) && atShift.has(id) && atOwn.get(id) === atShift.get(id));
    const trailers = ids.filter((id) => atShift.get(id)?.lap === '2/3');
    expect(leader.length, 'the leader starts the last lap on the shift\'s tick').toBe(1);
    expect(trailers.length, 'someone is still on lap 2 when the shift fires').toBeGreaterThan(0);
    for (const id of trailers) {
      // the leader's last lap: the shift's label on its own, no fanfare, no lift, the counter on 2/3
      expect(atShift.get(id), id).toMatchObject({ kind: 'shift', text: label, sub: '', lap: '2/3' });
      expect(atShift.get(id)!.sfx, id).not.toContain('finalLap');
      expect(atShift.get(id)!.music, id).not.toContain('finalLap');
    }
    for (const id of ids) {
      if (!atOwn.has(id)) continue; // lapped and flagged before their last lap
      // their own last lap: FINAL LAP under the shift's label, the fanfare and the lift, once
      expect(atOwn.get(id), id).toMatchObject({ kind: 'finalLap', text: 'FINAL LAP', sub: label, lap: '3/3' });
      expect(atOwn.get(id)!.sfx.filter((s) => s === 'finalLap'), id).toHaveLength(1);
      expect(atOwn.get(id)!.music.filter((s) => s === 'finalLap'), id).toHaveLength(1);
    }
    expect(atOwn.size).toBeGreaterThan(trailers.length);
  });
});
