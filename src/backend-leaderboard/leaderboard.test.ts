import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { NEUTRAL_INPUT, type InputState } from '../kart-controller/types.ts';
import { Items } from '../items/items.ts';
import { lookAheadDriver } from '../race-manager/__tests__/drivers.ts';
import { RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { simTick } from '../game/simtick.ts';
import { decodeLog, encodeLog, quantize } from './inputlog.ts';
import { CLIENT_VERSION, checkSubmission, cleanName, DAILY_GRACE_MINUTES, dailySeed, dailyTrack, ipBucket, soloConfig, type BoardMode } from './rules.ts';
import { CLAIM_TOLERANCE_MS, verifyRun } from './verify.ts';

const TRACKS = Object.fromEntries(Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>).map((d) => [d.id, d]));
const IDS = Object.keys(TRACKS);

/** A "client" run exactly as the game plays it: the shared sim tick, a scripted player, the race's own input log. */
function clientRun(trackId: string, mode: BoardMode, racerId: string, seed: number) {
  const config = soloConfig(mode, trackId, racerId, seed);
  const track = buildTrack(TRACKS[trackId]);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts = { manager, items, ai, inputs, playerIndex: 0, playerSlot: { ...NEUTRAL_INPUT } };
  const drive = lookAheadDriver(26, 0);
  let wobble = 0;
  while (manager.state.phase !== 'finished' && manager.state.tick < 120 * 400) {
    const i = drive(manager.state.karts[0], track);
    wobble += 0.37; // unrounded analogue values, like a real stick
    simTick(parts, { ...i, steer: i.steer * (0.97 + 0.03 * Math.sin(wobble)), throttle: i.throttle * 0.9991 });
  }
  return { result: manager.results().ranks[0], log: manager.state.inputLog };
}

describe('input log', () => {
  it('round-trips quantised inputs exactly and compresses runs', () => {
    const log: InputState[] = [];
    for (let i = 0; i < 3000; i++) {
      const raw = { steer: Math.sin(i / 50) * 1.3, throttle: i % 400 < 300 ? 1 : 0.42, brake: i % 700 < 20 ? 1 : 0, drift: i % 90 < 30, item: i === 1000, lookBack: false, horn: i % 1000 === 5 };
      log.push(quantize(raw, { ...NEUTRAL_INPUT }));
    }
    const s = encodeLog(log);
    expect(decodeLog(s)).toEqual(log);
    const still = encodeLog(Array.from({ length: 10000 }, () => ({ ...NEUTRAL_INPUT, throttle: 1 })));
    expect(still.length).toBeLessThan(20);
  });
  it('quantise is idempotent and clamps', () => {
    const a = quantize({ ...NEUTRAL_INPUT, steer: 2, throttle: 0.123456, brake: -1 }, { ...NEUTRAL_INPUT });
    expect(a.steer).toBe(1);
    expect(a.brake).toBe(0);
    expect(quantize(a, { ...NEUTRAL_INPUT })).toEqual(a);
  });
  it('rejects malformed logs instead of expanding forever', () => {
    expect(() => decodeLog(btoa(String.fromCharCode(2, 1, 0, 0, 0, 0)))).toThrow(/version/);
    expect(() => decodeLog(btoa(String.fromCharCode(1, 0xff, 0xff, 0xff, 0x7f, 0, 0, 0, 0)))).toThrow(/long/);
    expect(() => decodeLog(btoa(String.fromCharCode(1, 5, 0)))).toThrow(/truncated/);
  });
});

describe('submission rules', () => {
  const good = { name: 'Adam 2', trackId: 'harbour-loop', mode: 'timeTrial', speedClass: 150, timeMs: 95000, racerId: 'pip', inputLog: 'AQ==', clientVersion: CLIENT_VERSION };
  it('accepts a well-formed payload and rejects every bad field', () => {
    expect(checkSubmission(good, IDS)).toBeNull();
    for (const bad of [
      { name: '' }, { name: 'x'.repeat(17) }, { name: '<script>' }, { name: 'sh1t head' },
      { trackId: 'moon' }, { mode: 'quick' }, { speedClass: 100 }, { racerId: 'mario' },
      { timeMs: 29999 }, { timeMs: 95000.5 }, { inputLog: '' }, { clientVersion: '0' },
    ]) expect(checkSubmission({ ...good, ...bad }, IDS), JSON.stringify(bad)).not.toBeNull();
  });
  it('daily runs must be today (or yesterday in the first minutes after midnight) on the day\'s track', () => {
    const seed = dailySeed(new Date(Date.UTC(2026, 8, 30, 12)));
    expect(seed).toBe(20260930);
    const track = dailyTrack(seed, IDS);
    const d = { ...good, mode: 'daily', dailySeed: seed, trackId: track };
    expect(checkSubmission(d, IDS, seed)).toBeNull();
    expect(checkSubmission(d, IDS, 20261001, 5)).toBeNull(); // yesterday, five minutes after midnight UTC
    expect(checkSubmission(d, IDS, 20261001, DAILY_GRACE_MINUTES)).not.toBeNull(); // closed after the grace
    expect(checkSubmission(d, IDS, 20261003, 0)).not.toBeNull();
    expect(checkSubmission({ ...d, trackId: IDS.find((x) => x !== track) }, IDS, seed)).not.toBeNull();
    expect(dailyTrack(seed, [...IDS].reverse())).toBe(track); // order-proof
  });
  it('the word filter sees through spacing and leetspeak but passes normal names', () => {
    expect(cleanName('Rascal_Racer')).toBe(true);
    expect(cleanName('F U C K')).toBe(false);
    expect(cleanName('b1tch')).toBe(false);
  });
});

describe('re-simulation (SOP gate)', () => {
  const run = clientRun('harbour-loop', 'timeTrial', 'momo', 0);
  const log = encodeLog(run.log);
  it('a real run replays to exactly the same time', () => {
    expect(run.result.dnf).toBe(false);
    const v = verifyRun(TRACKS['harbour-loop'], 'timeTrial', 'momo', 0, log, run.result.timeMs);
    expect(v).toMatchObject({ ok: true, timeMs: run.result.timeMs, lapTimesMs: run.result.lapTimesMs });
  });
  it('a forged time is rejected, and a near miss is stored as the replay time, never the claim', () => {
    for (const forged of [run.result.timeMs - 1500, run.result.timeMs - 5000, 30000]) {
      const v = verifyRun(TRACKS['harbour-loop'], 'timeTrial', 'momo', 0, log, forged);
      expect(v.ok, String(forged)).toBe(false);
    }
    const near = verifyRun(TRACKS['harbour-loop'], 'timeTrial', 'momo', 0, log, run.result.timeMs - 500);
    expect(near).toMatchObject({ ok: true, timeMs: run.result.timeMs });
  });
  it('a tampered log, the wrong racer or the wrong track does not verify', () => {
    const tampered = decodeLog(log);
    for (let i = 2000; i < 2000 + 120 * 4; i++) tampered[i] = { ...tampered[i], throttle: 0 }; // 4 s off the gas
    expect(CLAIM_TOLERANCE_MS).toBeLessThan(4000);
    expect(verifyRun(TRACKS['harbour-loop'], 'timeTrial', 'momo', 0, encodeLog(tampered), run.result.timeMs).ok).toBe(false);
    expect(verifyRun(TRACKS['harbour-loop'], 'timeTrial', 'gus', 0, log, run.result.timeMs).ok).toBe(false);
    expect(verifyRun(TRACKS['meadow-run'], 'timeTrial', 'momo', 0, log, run.result.timeMs).ok).toBe(false);
    expect(verifyRun(TRACKS['harbour-loop'], 'timeTrial', 'momo', 0, 'not base64!!', run.result.timeMs).ok).toBe(false);
  });
  it('a daily run with balloons live replays exactly too', () => {
    const seed = 20260930;
    const track = dailyTrack(seed, IDS);
    const d = clientRun(track, 'daily', 'otto', seed);
    expect(verifyRun(TRACKS[track], 'daily', 'otto', seed, encodeLog(d.log), d.result.timeMs)).toMatchObject({ ok: true });
  });
});

describe('red-team hardening (2026-09-23)', () => {
  const run = clientRun('harbour-loop', 'timeTrial', 'pip', 0);
  const verify = (log: string) => verifyRun(TRACKS['harbour-loop'], 'timeTrial', 'pip', 0, log, run.result.timeMs);

  it('the stored log is canonical: padding after the finish and horn presses make no new run', () => {
    const base = verify(encodeLog(run.log));
    if (!base.ok) throw new Error(base.reason);
    // junk after the finish line
    const padded = verify(encodeLog([...run.log, ...Array.from({ length: 500 }, () => ({ ...run.log[0], steer: 0.5, horn: true }))]));
    // the horn honked all race
    const honking = verify(encodeLog(run.log.map((i) => ({ ...i, horn: true }))));
    expect(padded.ok && honking.ok).toBe(true);
    if (padded.ok && honking.ok) {
      expect(padded.canonicalLog).toBe(base.canonicalLog);
      expect(honking.canonicalLog).toBe(base.canonicalLog);
    }
    // and the canonical log itself replays to the same time
    const again = verify(base.canonicalLog);
    expect(again).toMatchObject({ ok: true, timeMs: base.timeMs });
  });

  it('IPv6 counts by its /64, IPv4 and mapped IPv4 as they are', () => {
    expect(ipBucket('203.0.113.9')).toBe('203.0.113.9');
    expect(ipBucket('::ffff:203.0.113.9')).toBe('203.0.113.9');
    const a = ipBucket('2001:db8:85a3:1234:aaaa:bbbb:cccc:1');
    expect(a).toBe('2001:db8:85a3:1234::/64');
    expect(ipBucket('2001:0db8:85a3:1234::ffff')).toBe(a); // same /64, other host, zero-padded
    expect(ipBucket('2001:db8:85a3::1')).toBe('2001:db8:85a3:0::/64');
    expect(ipBucket('2001:db8:85a3:1235::1')).not.toBe(a);
  });
});
