// The race's sounds against the real sim, fed the way main.ts feeds them: the player first in
// racer order (so on the back row) with the AI at the wheel, the director seeded with the
// player's grid rank at load, the ear on the chase camera 12 m behind the player, and the race
// screen closing RESULTS_AFTER seconds after the race is over.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { simTick, type SimParts } from '../game/simtick.ts';
import { Items } from '../items/items.ts';
import { SIM_DT, SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type Vec3 } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import VOICE from '../../public/audio/voice.json';
import { Barker, type TakeCount } from './barks.ts';
import { direct, resetDirector, type Listener } from './director.ts';
import type { Bark, BarkCue } from './types.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
/** main.ts: the results screen opens this long after the race is over */
const RESULTS_AFTER = 2.5;

function race(def: TrackDefinition, seed: number, player = CAST[0].id) {
  const config: RaceConfig = {
    mode: 'quick', trackId: def.id, speedClass: 150, seed,
    // main.ts roster(): the player first in racer order
    racers: [...CAST.filter((c) => c.id === player), ...CAST.filter((c) => c.id !== player)].map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: c.id === player })),
  };
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  ai.drivePlayer = true; // the dev autopilot
  const pi = manager.playerIndex;
  const parts: SimParts = { manager, items, ai, inputs: manager.state.karts.map(() => ({ ...NEUTRAL_INPUT })), playerIndex: pi, playerSlot: { ...NEUTRAL_INPUT } };
  const st = manager.state;
  const ear: Vec3 = [0, 0, 0];
  const l: Listener = { playerId: player, position: ear, heading: 0, positionOf: (id) => st.karts.find((k) => k.racerId === id)?.position };
  const follow = () => {
    const k = st.karts[pi];
    ear[0] = k.position[0] - Math.sin(k.heading) * 12; ear[1] = k.position[1]; ear[2] = k.position[2] - Math.cos(k.heading) * 12;
    l.heading = k.heading;
  };
  const hear = (ev: ReturnType<typeof simTick>) => { follow(); return direct(ev.race, ev.items, l).cues; };
  return { st, pi, player, l, follow, tick: () => simTick(parts, null), hear };
}

describe('the race\'s sounds, end to end', () => {
  for (const def of Object.values(FILES)) {
    it(`${def.id}: the first place change off the back row is a gain, and a contact is one bump`, () => {
      const r = race(def, 11);
      const grid = r.st.trackers[r.pi].shownRank;
      expect(grid, 'the player starts on the back row').toBe(r.st.karts.length);
      resetDirector(grid); // GameAudio.newRace, from main.ts load()
      let first: string | undefined;
      let contacts = 0;
      // the countdown, the go and the jostle of the pack just after it
      for (let t = 0; t < 12 * SIM_HZ; t++) {
        const ev = r.tick();
        const cues = r.hear(ev);
        const place = ev.race.some((e) => e.type === 'positionChange' && e.racerId === r.player);
        if (place && !first) first = cues.find((c) => c.sfx === 'gainPlace' || c.sfx === 'losePlace')?.sfx;
        // collide.ts raises a bump on both karts of a contact, a bumper car one on its kart;
        // the director plays each contact once
        const bumps = ev.race.filter((e) => e.type === 'kart' && e.event.type === 'bump').length;
        const shoves = ev.race.filter((e) => e.type === 'hazardHit' && e.hit === 'bump').length;
        contacts += bumps / 2;
        expect(cues.filter((c) => c.sfx === 'bump').length, `${def.id} t=${(t * SIM_DT).toFixed(2)}`).toBeLessThanOrEqual(bumps / 2 + shoves);
      }
      expect(first, def.id).toBe('gainPlace');
      expect(contacts, 'the pack touched').toBeGreaterThan(0);
    });
  }

  it('the finish fanfare plays before the results open; after, the field still makes race noise, so main.ts stops feeding it', () => {
    const r = race(FILES['../track-builder/tracks/canyon-rush.json'], 11);
    resetDirector(r.st.trackers[r.pi].shownRank);
    let fanfare = false, over = 0, after = 0;
    for (let t = 0; t < 400 * SIM_HZ && over <= RESULTS_AFTER + 30; t++) {
      const cues = r.hear(r.tick());
      if (r.st.phase === 'finished') over += SIM_DT;
      if (over <= RESULTS_AFTER) fanfare ||= cues.some((c) => c.sfx === 'finish' || c.sfx === 'finishLow');
      else after += cues.length;
    }
    expect(over, 'the race ended').toBeGreaterThan(RESULTS_AFTER + 30);
    expect(fanfare, 'the finish cue plays while the race screen is up').toBe(true);
    expect(after, 'bumps, pads and creatures the results screen would play').toBeGreaterThan(0);
  });

  // Sprocket once counted laps and Boulder said sorry after bumps: the two racers with habits of their
  // own, on Frostbite Pass (where the most is said) and Boardwalk Nights, and Pip on Harbour Loop
  for (const [file, player] of [['frostbite-pass', 'sprocket'], ['boardwalk-nights', 'boulder'], ['harbour-loop', 'pip']] as const) {
    it(`${file}, ${player}: a whole race says a few lines, at Mario Kart World's moments (barks.ts)`, () => {
      const voices = VOICE as Record<string, Partial<Record<Bark, string[]>>>;
      const takes: TakeCount = (r, b) => voices[r]?.[b]?.length ?? 0;
      const r = race(FILES[`../track-builder/tracks/${file}.json`], 11, player);
      const b = new Barker(11);
      b.reset(r.st.trackers[r.pi].shownRank);
      const lines: BarkCue[] = [];
      let finish = 0;
      for (let t = 0; t < 400 * SIM_HZ && !finish; t++) {
        const ev = r.tick();
        r.follow();
        const now = t * SIM_DT;
        const c = b.pick(ev.race, ev.items, r.l, now, takes);
        // a line rings for about as long as the recorded ones do (1.4 s on average)
        if (c) { lines.push(c); b.until = now + 1.4; }
        if (ev.race.some((e) => e.type === 'finish' && e.racerId === player)) finish = now;
      }
      expect(finish, 'the race ended').toBeGreaterThan(0);
      const said = lines.map((c) => `${c.racerId}:${c.bark}`);
      // being hit is always voiced, as in World, so a hard race says more; the rest stays a handful (over 96
      // whole races: 3.3 a race, 8 at most; it was 14)
      const chatter = lines.filter((c) => !(c.racerId === player && ['hit', 'win', 'good', 'lose'].includes(c.bark)));
      expect(chatter.length, said.join(' ')).toBeLessThanOrEqual(6);
      // the player's own lines, at the moments World's racers speak at; a rival only cries out at the player's hit
      for (const c of lines) {
        if (c.racerId === player) expect(['start', 'hit', 'trick', 'hitRival', 'win', 'good', 'lose'], said.join(' ')).toContain(c.bark);
        else expect(c.bark, said.join(' ')).toBe('hit');
      }
      expect(said.filter((s) => /:(win|good|lose)$/.test(s)), 'one finish line').toHaveLength(1);
    });
  }
});
