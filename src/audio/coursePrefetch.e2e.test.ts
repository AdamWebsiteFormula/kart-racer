// @vitest-environment jsdom
// The chosen course's music comes down from its choice, not before (28 Sept 2026): through the real menus (UiRoot) and the
// real bank, the sound wired as main.ts wires it (host.startRace: GameAudio.courseChosen before the race is built; the
// Daily's at its pick on the Mode screen; a series' next course under the results). Browsing the Track screen fetches
// nothing; the pick fetches the chosen course's intro piece and race song, and no other course's, in the pick's own
// turn, before the race is built, at SONG_NOW_TIER (main.ts: at once, outside the line); a series' next course's at
// SONG_AHEAD_TIER, behind the results song; under ?mute nothing is fetched. The context is the stand-in (standIn.ts):
// plain objects, nothing is heard.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dailySeed, dailyTrack } from '../backend-leaderboard/rules.ts';
import { nextRace, createGrandPrix } from '../race-manager/series.ts';
import { UiRoot, type RacePlan, type UiHost } from '../ui-hud/ui.ts';
import type { AppState } from '../ui-hud/types.ts';
import { GameAudio } from './audio.ts';
import { AudioBus } from './bus.ts';
import { songForTrack } from './music/patterns.ts';
import { SampleBank, SONG_AHEAD_TIER, SONG_NOW_TIER, SONG_TIER, themeForTrack } from './samples.ts';
import { StandInContext } from './standIn.ts';

/** The six courses (main.ts TRACKS), and the recordings' list: the title, the results, the race songs, one course's intro piece. */
const TRACKS = ['harbour-loop', 'meadow-run', 'canyon-rush', 'frostbite-pass', 'boardwalk-nights', 'skyline-circuit'];
const MUSIC: Record<string, { url: string; bpm: number }> = { 'intro:meadow-run': { url: 'audio/music/intro-meadow-run.mp3', bpm: 146 } };
for (const k of ['title', 'results', ...new Set(TRACKS.map(themeForTrack))]) MUSIC[k] = { url: `audio/music/${k}.mp3`, bpm: 146 };
/** A course's music as the page asks for it: its intro piece (when listed) and its race song. */
const musicOf = (trackId: string) => [MUSIC[`intro:${trackId}`]?.url, MUSIC[themeForTrack(trackId)].url].filter(Boolean).map((u) => `/${u}`);
const COURSE_MUSIC = /\/audio\/music\/(race-|intro-)/;

const g = globalThis as { AudioContext?: unknown };
const live: { audio: GameAudio; ui: UiRoot }[] = [];
beforeEach(() => { g.AudioContext = StandInContext; document.body.innerHTML = ''; });
afterEach(() => {
  delete g.AudioContext;
  for (const { audio, ui } of live.splice(0)) { clearInterval((audio as unknown as { timer: ReturnType<typeof setInterval> }).timer); ui.dispose(); }
});

/** The game as main.ts builds it, for its sound: the files as a server gives them (small, so the stand-in decodes fast). */
function game(opts: { mute?: boolean } = {}) {
  const got: string[] = [];
  const f = (async (u: string) => {
    got.push(String(u));
    if (String(u).endsWith('voice.json')) return { ok: false };
    return { ok: true, json: async () => ({ sfx: {}, music: MUSIC }), arrayBuffer: async () => new ArrayBuffer(32000) };
  }) as unknown as typeof fetch;
  const bank = new SampleBank('/', f);
  // the turns each song's file was asked for at (main.ts ranks them in its line by these)
  const asked: { song?: string; tier: number }[] = [];
  bank.schedule = (job, tier, song) => { asked.push({ song, tier }); return job(); };
  const audio = new GameAudio(opts.mute ? AudioBus.silent() : new AudioBus(), bank);
  const started: string[] = [];
  /** how many files had been asked for when each race was built */
  const builtAt: number[] = [];
  let series: ReturnType<typeof createGrandPrix> | null = null;
  const host: UiHost = {
    builtTracks: new Set(TRACKS), medalTimes: new Map(), availableModes: new Set(['quick', 'grandPrix', 'daily']), creditsMarkdown: '',
    // main.ts startRace: the race's config (a series' first course, the Daily's, the Track screen's), its music chosen, then the race built
    startRace: (p: RacePlan) => {
      series = p.mode === 'grandPrix' && p.cupId ? createGrandPrix({ id: p.cupId, trackIds: p.tracks }, [], p.speedClass, 1) : null;
      const trackId = series ? nextRace(series)!.trackId : p.mode === 'daily' ? dailyTrack(dailySeed(), TRACKS) : p.tracks[0];
      audio.courseChosen(trackId);
      // main.ts load(): the race is built (half a second to a second of script), then its sound asks for its songs to decode
      builtAt.push(got.length);
      audio.raceChosen();
      audio.newRace(songForTrack(trackId), trackId, 8);
      started.push(trackId);
    },
    nextRace: () => undefined, restartRace: () => undefined, quitRace: () => undefined, setPaused: () => undefined, settingsChanged: () => undefined,
    pressedStart: () => audio.unlock(),
    // main.ts screenChanged: the Daily's course is chosen with it
    screenChanged: (app: AppState) => { if (app.mode === 'daily' && (app.screen === 'rosterSelect' || app.screen === 'kartSelect')) audio.courseChosen(dailyTrack(dailySeed(), TRACKS)); },
  };
  const ui = new UiRoot(document.body, host, null);
  live.push({ audio, ui });
  /** main.ts raceOver in a series with a race to come: the results song, then the next course's music under it */
  const raceOver = () => {
    const s = series!;
    s.raceIndex++;
    audio.play('results');
    audio.courseChosen(nextRace(s)!.trackId, true);
    return nextRace(s)!.trackId;
  };
  return { audio, bank, ui, got, asked, started, builtAt, raceOver };
}

const key = (k: string, code = k) => dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true, cancelable: true }));
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0)); };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The title up and pressed through (the one context, the title song), then the Mode screen. */
async function toModes(ui: UiRoot) {
  ui.dispatch({ type: 'boot' });
  key('Enter');
  await flush();
  ui.dispatch({ type: 'start' });
}

describe('the chosen course\'s music comes down from its choice, not before (28 Sept 2026)', () => {
  it('Quick Race: the menus and browsing the Track screen fetch no course\'s music; the pick fetches the chosen course\'s, alone, in its own turn', async () => {
    const { ui, got, asked, started, builtAt } = game();
    await toModes(ui);
    ui.dispatch({ type: 'pickMode', mode: 'quick' });
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    expect(ui.app.screen).toBe('trackSelect');
    // browse the cards: every course is looked at, none chosen
    await wait(300);
    const seen = new Set<string>();
    for (let i = 0; i < TRACKS.length + 1; i++) { key('ArrowRight'); await wait(20); seen.add((document.activeElement as HTMLElement | null)?.dataset.id ?? ''); }
    await flush();
    expect(seen.size, 'the focus went across the cards').toBeGreaterThan(2);
    expect(got.filter((u) => COURSE_MUSIC.test(u)), 'no course\'s music before the choice').toEqual([]);
    // the choice: its files are asked for in the pick's own turn, before the race is built (no await between)
    ui.dispatch({ type: 'pickTrack', trackId: 'meadow-run' });
    expect(started).toEqual(['meadow-run']);
    expect(got.slice(0, builtAt[0]).filter((u) => COURSE_MUSIC.test(u)), 'asked for before the race is built').toEqual(musicOf('meadow-run'));
    expect(asked.filter((a) => a.song && a.song !== 'title')).toEqual([{ song: 'intro:meadow-run', tier: SONG_NOW_TIER }, { song: 'race-meadow', tier: SONG_NOW_TIER }]);
    // the race loading asks for them again (to decode): nothing more comes down
    await flush();
    expect(got.filter((u) => COURSE_MUSIC.test(u))).toEqual(musicOf('meadow-run'));
  });

  it('?mute: the same menus and pick fetch no course\'s music at all', async () => {
    const { ui, got, started } = game({ mute: true });
    await toModes(ui);
    ui.dispatch({ type: 'pickMode', mode: 'quick' });
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    ui.dispatch({ type: 'pickTrack', trackId: 'meadow-run' });
    await flush();
    expect(started).toEqual(['meadow-run']);
    expect(got.filter((u) => u.includes('/audio/music/')), 'no song of any kind').toEqual([]);
  });

  it('the Daily: its course (the day\'s) is chosen with it on the Mode screen, and comes down while the racer is picked', async () => {
    const { ui, got, started } = game();
    const today = dailyTrack(dailySeed(), TRACKS);
    await toModes(ui);
    await flush();
    expect(got.filter((u) => COURSE_MUSIC.test(u))).toEqual([]);
    ui.dispatch({ type: 'pickMode', mode: 'daily' });
    expect(ui.app.screen).toBe('rosterSelect');
    expect(got.filter((u) => COURSE_MUSIC.test(u))).toEqual(musicOf(today));
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    await flush();
    expect(started).toEqual([today]);
    expect(got.filter((u) => COURSE_MUSIC.test(u)), 'each file once').toEqual(musicOf(today));
  });

  it('a Grand Prix: the Cup screen\'s pick fetches its first course\'s music alone; the next course\'s comes under the results, behind the results song', async () => {
    const { ui, got, asked, raceOver } = game();
    await toModes(ui);
    ui.dispatch({ type: 'pickMode', mode: 'grandPrix' });
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    expect(ui.app.screen).toBe('cupSelect');
    await flush();
    expect(got.filter((u) => COURSE_MUSIC.test(u))).toEqual([]);
    ui.dispatch({ type: 'pickCup', cupId: 'summit' });
    expect(got.filter((u) => COURSE_MUSIC.test(u)), 'the first course alone, not the cup\'s other two').toEqual(musicOf('frostbite-pass'));
    expect(asked.filter((a) => a.song === 'race-frost'), 'at once (main.ts: outside the line)').toEqual([{ song: 'race-frost', tier: SONG_NOW_TIER }]);
    await flush();
    // the first race over: its results, and the next course known
    const n = asked.length;
    const next = raceOver();
    expect(next).toBe('boardwalk-nights');
    expect(got.filter((u) => COURSE_MUSIC.test(u))).toEqual([...musicOf('frostbite-pass'), ...musicOf('boardwalk-nights')]);
    expect(asked.slice(n).filter((a) => a.song), 'the results song wanted now; the next course\'s well ahead of its race').toEqual([
      { song: 'results', tier: SONG_TIER }, { song: 'race-boardwalk', tier: SONG_AHEAD_TIER },
    ]);
  });
});
