// Build the game's voice lines from the judged takes: for every line, the best take that passed the
// judge (scripts/voice/judge.ts), trimmed, levelled and encoded to public/audio/voice/<key>.mp3, and
// the list the game loads, public/audio/voice.json (samples.ts loadVoices). Nothing is played.
//   node scripts/voice/build.ts [--from=<racer>:<gemini|eleven>,...] [--min=7] [--dry]
// Each racer's lines all come from one source (one voice): by default the source whose takes the
// judge scored higher for that racer, among those that cover every line.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { allLines, CAST } from './catalog.ts';
import type { Bark } from '../../src/audio/types.ts';

const args = process.argv.slice(2);
const flag = (name: string, dflt?: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const MIN = Number(flag('min', '7'));
const DRY = args.includes('--dry');
const ROOT = new URL('../../', import.meta.url).pathname;
const SOURCES = { gemini: `${homedir()}/.cache/rascal-voice/takes`, eleven: `${homedir()}/.cache/rascal-voice/takes-el` } as const;
type Source = keyof typeof SOURCES;
const forced = Object.fromEntries((flag('from')?.split(',') ?? []).map((p) => p.split(':'))) as Record<string, Source>;
/** A judge's "sounds like" naming a famous character or a real person rules a take out (no look-alikes, CLAUDE.md). */
const FAMOUS = /mario|luigi|toad|peach|yoshi|bowser|wario|waluigi|donkey|nintendo|sonic|tails|knuckles|disney|pixar|mickey|minnie|donald|goofy|spongebob|santa|chipmunk|alvin|homer|simpson|bugs bunny|daffy|road ?runner/i;

interface Verdict { heardWords: string; wordsMatch: boolean; characterFit: number; acting: number; audioQuality: number; gameReady: number; gRated: boolean; resemblesKnownCharacterOrPerson: string }
interface Take { source: Source; file: string; v: Verdict; score: number }

function verdict(source: Source, file: string): Verdict | null {
  const p = `${SOURCES[source]}/judge/${file.replace('.wav', '.json')}`;
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}
const usable = (v: Verdict) => v.wordsMatch && v.gRated && v.gameReady >= MIN && !FAMOUS.test(v.resemblesKnownCharacterOrPerson ?? '');
const score = (v: Verdict) => v.gameReady * 2 + v.acting + v.characterFit + v.audioQuality;

/** Every judged take of a line, best first. */
function takes(key: string, source: Source): Take[] {
  const dir = SOURCES[source];
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.startsWith(`${key}-t`) && f.endsWith('.wav'))
    .map((file) => ({ source, file, v: verdict(source, file) }))
    .filter((t): t is Take => !!t.v && usable(t.v))
    .map((t) => ({ ...t, score: score(t.v) }))
    .sort((a, b) => b.score - a.score);
}

// ---- audio: 16-bit mono WAV in, trimmed and levelled samples out, MP3 through ffmpeg
function readWav(path: string): { rate: number; x: Float32Array } {
  const b = readFileSync(path);
  const rate = b.readUInt32LE(24);
  let o = 12;
  while (o + 8 <= b.length && b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const n = Math.min(b.readUInt32LE(o + 4), b.length - o - 8) >> 1;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = b.readInt16LE(o + 8 + i * 2) / 32768;
  return { rate, x };
}
/** Cut the silence off both ends (−45 dB under the peak), keep 20 ms before and 80 ms after, peak at −3 dBFS, fade the edges. */
function shape(x: Float32Array, rate: number): Float32Array {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  if (peak === 0) return x;
  const floor = peak * 10 ** (-45 / 20), win = Math.round(rate * 0.01);
  const loud = (i: number) => { let s = 0; for (let j = i; j < Math.min(x.length, i + win); j++) s = Math.max(s, Math.abs(x[j])); return s > floor; };
  let a = 0; while (a < x.length && !loud(a)) a += win;
  let b = x.length - win; while (b > a && !loud(b)) b -= win;
  a = Math.max(0, a - Math.round(rate * 0.02));
  b = Math.min(x.length, b + win + Math.round(rate * 0.08));
  const y = x.slice(a, b), g = 10 ** (-3 / 20) / peak;
  const fin = Math.round(rate * 0.005), fout = Math.round(rate * 0.03);
  for (let i = 0; i < y.length; i++) {
    let e = g;
    if (i < fin) e *= i / fin;
    if (i > y.length - fout) e *= (y.length - i) / fout;
    y[i] *= e;
  }
  return y;
}
function ffmpeg(): string {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { return execFileSync('which', ['ffmpeg']).toString().trim(); } catch { /* not on the path */ }
  const venv = `${homedir()}/.cache/rise/venv/lib`;
  for (const py of existsSync(venv) ? readdirSync(venv) : []) {
    const dir = `${venv}/${py}/site-packages/imageio_ffmpeg/binaries`;
    const bin = existsSync(dir) ? readdirSync(dir).find((f) => f.startsWith('ffmpeg')) : undefined;
    if (bin) return `${dir}/${bin}`;
  }
  throw new Error('no ffmpeg: set FFMPEG=/path/to/ffmpeg');
}
function encode(y: Float32Array, rate: number, out: string): void {
  const pcm = Buffer.alloc(y.length * 2);
  for (let i = 0; i < y.length; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(y[i] * 32767))), i * 2);
  execFileSync(ffmpeg(), ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '64k', out], { input: pcm });
}

// ---- pick a source per racer, then a take per line
const lines = allLines();
const manifest: Record<string, Partial<Record<Bark, string[]>>> = {};
const report: string[] = [];
const outDir = `${ROOT}public/audio/voice`;
if (!DRY) { rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true }); }
for (const racer of Object.keys(CAST)) {
  const mine = lines.filter((l) => l.racerId === racer);
  const mean = (s: Source) => { const best = mine.map((l) => takes(l.key, s)[0]).filter(Boolean); return best.length === mine.length ? best.reduce((t, x) => t + x.score, 0) / best.length : -1; };
  const source: Source | undefined = forced[racer] ?? (['eleven', 'gemini'] as Source[]).filter((s) => mean(s) > 0).sort((p, q) => mean(q) - mean(p))[0];
  if (!source) { report.push(`${racer}: no source covers every line yet (gemini ${mean('gemini').toFixed(1)}, eleven ${mean('eleven').toFixed(1)})`); continue; }
  const moments: Partial<Record<Bark, string[]>> = {};
  let missing = 0;
  for (const l of mine) {
    const best = takes(l.key, source)[0];
    if (!best) { missing++; report.push(`  ${l.key}: no take passed ("${l.line}")`); continue; }
    const url = `audio/voice/${l.key}.mp3`;
    if (!DRY) { const w = readWav(`${SOURCES[source]}/${best.file}`); encode(shape(w.x, w.rate), w.rate, `${ROOT}public/${url}`); }
    (moments[l.bark] ??= []).push(url);
  }
  // the lap lines say which lap: both or neither
  if (moments.lap && moments.lap.length !== CAST[racer].lines.lap?.length) delete moments.lap;
  manifest[racer] = moments;
  report.push(`${racer}: ${source}, ${mine.length - missing}/${mine.length} lines, mean score ${mean(source).toFixed(1)}`);
}
if (!DRY) writeFileSync(`${ROOT}public/audio/voice.json`, `${JSON.stringify(manifest, null, 1)}\n`);
console.log(report.join('\n'));
