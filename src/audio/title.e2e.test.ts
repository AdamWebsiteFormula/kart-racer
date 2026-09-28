// @vitest-environment jsdom
// The title music from the start screen's first press, end to end as main.ts wires it (Adam, 28 Sept 2026, on the
// title: "The game should have music playing here"). The title song's file comes down while the start screen waits
// (bytes only: no context); the first keydown builds the one context and starts the title song at once, looping,
// and the start screen gives way to the menu with nothing picked; with no recording the synth plays the title,
// looping; under ?mute no context is ever built, whatever is pressed. The context is the stand-in (standIn.ts):
// plain objects, nothing is heard.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UiRoot, type UiHost } from '../ui-hud/ui.ts';
import { GameAudio } from './audio.ts';
import { AudioBus } from './bus.ts';
import type { Sequencer } from './music/sequencer.ts';
import { SampleBank } from './samples.ts';
import { StandInContext, type StandInNode, type StandInSource } from './standIn.ts';

/** public/audio/music/title.mp3's size: 64 s at 128 kbps, as the stand-in decodes it */
const TITLE_BYTES = 1_024_462;

/** The game's files as a server gives them: the recordings' list (with the title song or without), its bytes; no voice lines. */
function server(withTitle: boolean): { fetch: typeof fetch; got: string[] } {
  const got: string[] = [];
  const manifest = { sfx: {}, music: withTitle ? { title: { url: 'audio/music/title.mp3', bpm: 128 } } : {} };
  const f = (async (u: string) => {
    got.push(String(u));
    if (String(u).endsWith('voice.json')) return { ok: false };
    return { ok: true, json: async () => manifest, arrayBuffer: async () => new ArrayBuffer(TITLE_BYTES) };
  }) as unknown as typeof fetch;
  return { fetch: f, got };
}

const g = globalThis as { AudioContext?: unknown };
let made = 0;
/** the browser's AudioContext, as the stand-in: every one built is counted */
class Counted extends StandInContext { constructor() { super(); made++; } }
const live: { audio: GameAudio; ui: UiRoot }[] = [];

beforeEach(() => { made = 0; g.AudioContext = Counted; document.body.innerHTML = ''; });
afterEach(() => {
  delete g.AudioContext;
  for (const { audio, ui } of live.splice(0)) { clearInterval((audio as unknown as { timer: ReturnType<typeof setInterval> }).timer); ui.dispose(); }
});

/** The game as main.ts builds it: the sound (silent under ?mute), the menus, the start screen's press handed to the sound. */
function game(opts: { mute?: boolean; withTitle?: boolean } = {}) {
  const files = server(opts.withTitle ?? true);
  const bank = new SampleBank('/', files.fetch);
  const audio = new GameAudio(opts.mute ? AudioBus.silent() : new AudioBus(), bank);
  const host: UiHost = {
    builtTracks: new Set(['harbour-loop']), medalTimes: new Map(), availableModes: new Set(['quick']), creditsMarkdown: '',
    startRace: () => undefined, nextRace: () => undefined, restartRace: () => undefined, quitRace: () => undefined,
    setPaused: () => undefined, settingsChanged: () => undefined,
    pressedStart: () => audio.unlock(),
  };
  const ui = new UiRoot(document.body, host, null);
  live.push({ audio, ui });
  // main.ts: the attract race asks for the title song before any press
  audio.play('title');
  return { audio, bank, ui, files };
}

const enter = () => dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true, cancelable: true }));
const songs = (ctx: StandInContext) => ctx.started.filter((s) => s.kind === 'buffer' && s.loop);
async function until(ok: () => boolean, ms = 5000): Promise<void> {
  for (const t0 = Date.now(); !ok(); await new Promise((r) => setTimeout(r, 5))) if (Date.now() - t0 > ms) throw new Error('timed out');
}

describe('the title music from the start screen\'s first press (28 Sept 2026)', () => {
  it('the first keydown on the title starts the title song\'s recording at once (its file came while the start screen waited), looping; no synth stands in', async () => {
    const { audio, bank, ui, files } = game();
    // main.ts backgroundFiles: the title song's file while the start screen waits, bytes only
    await bank.prefetch('title');
    ui.dispatch({ type: 'boot' });
    expect(files.got).toEqual(['/audio/manifest.json', '/audio/music/title.mp3']);
    expect([made, audio.bus.ctx, bank.fetched('title')], 'no context before the press').toEqual([0, null, true]);
    enter();
    expect(made, 'the one context, from the press').toBe(1);
    expect([ui.app.screen, ui.app.pressed, (document.activeElement as HTMLElement).dataset.id], 'the menu, nothing picked').toEqual(['title', true, 'start']);
    const ctx = audio.bus.ctx as unknown as StandInContext;
    const inner = audio as unknown as { seq: unknown };
    expect(inner.seq, 'no synth stand-in: the recording is only a decode away').toBeNull();
    await until(() => songs(ctx).length > 0);
    const song = songs(ctx)[0] as StandInSource;
    expect(song.buffer!.duration).toBeCloseTo((TITLE_BYTES * 8) / 128000, 1);
    // it loops: the source's own loop, between the song's loop points
    expect(song.loop).toBe(true);
    expect(song.loopEnd).toBeGreaterThan(song.loopStart);
    expect(song.loopEnd).toBeLessThanOrEqual(song.buffer!.duration);
    // booked to start 50 ms after its decode: at once (the stand-in's clock is the page's, so within a millisecond)
    expect(song.startedAt! - song.calledAt).toBeCloseTo(0.05, 3);
    // on the music bus (its gain, then the bus)
    expect(((song.to[0] as StandInNode).to)).toContain(audio.bus.music);
    expect(ctx.started.filter((s) => s.kind === 'osc'), 'not one synth note').toHaveLength(0);
    // the file came down once: the press fetched nothing more for it
    expect(files.got.filter((u) => u.endsWith('title.mp3'))).toHaveLength(1);
  });

  it('with no recording of it, the first keydown has the synth play the title, and it loops', async () => {
    const { audio, ui } = game({ withTitle: false });
    ui.dispatch({ type: 'boot' });
    enter();
    expect(made).toBe(1);
    const ctx = audio.bus.ctx as unknown as StandInContext;
    const inner = audio as unknown as { seq: Sequencer | null; songId: unknown; pump(): void };
    expect(inner.songId).toBe('title');
    const seq = inner.seq!;
    // run the scheduler over two passes of the song on the context's clock: the second pass books the first's notes again
    let t = ctx.currentTime;
    ctx.now = () => t;
    const t0 = seq.timeOfBeat(0), loop = seq.timeOfBeat(seq.song.bars * 4) - t0;
    for (; t < t0 + 2 * loop + 0.2; t += 0.025) inner.pump();
    const at = ctx.started.filter((s) => s.kind === 'osc').map((s) => s.startedAt! - t0);
    const first = at.filter((x) => x < loop - 1e-6).map((x) => x.toFixed(3));
    const second = at.filter((x) => x >= loop - 1e-6 && x < 2 * loop - 1e-6).map((x) => (x - loop).toFixed(3));
    expect(first.length).toBeGreaterThan(20);
    expect(second).toEqual(first);
    expect(ui.app.pressed).toBe(true);
  });

  it('?mute: no context is ever built, whatever is pressed (a key, a click, a tap, a pad\'s press through the start screen); the menu still comes', async () => {
    const { audio, bank, ui } = game({ mute: true });
    await bank.prefetch('title'); // bytes only: the page may still fetch them
    ui.dispatch({ type: 'boot' });
    enter();
    dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    dispatchEvent(new Event('touchend'));
    audio.unlock(); // the start screen's call for a pad's press
    audio.play('title');
    expect([made, audio.bus.ctx, audio.bus.running]).toEqual([0, null, false]);
    expect([ui.app.screen, ui.app.pressed]).toEqual(['title', true]);
  });
});
