// Make takes of every racer voice line with Gemini text to speech (scripts/voice/catalog.ts). Nothing
// is played; the key comes from .env.local (scripts/set-gemini-key.sh) and is never printed.
//   node scripts/voice/generate.ts [--takes=2] [--only=pip,gus] [--keys=pip-trick-1,...] [--out=<dir>]
// Takes land in <out>/<racer>-<bark>-<n>-t<k>.wav (24 kHz mono); a take already there is kept, so a
// stopped run picks up where it left off. The model allows 10 requests a minute: one starts every
// 6.6 s, several in flight (a take takes 20-30 s to come back, so one at a time ran at 2 a minute).
// A take much longer than its words (the model read the direction aloud, or rambled) is made again, once.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { allLines, CAST, MODEL, prompt } from './catalog.ts';

const args = process.argv.slice(2);
const flag = (name: string, dflt?: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const TAKES = Number(flag('takes', '2'));
const OUT = flag('out', `${homedir()}/.cache/rascal-voice/takes`)!;
const only = flag('only')?.split(',');
const keys = flag('keys')?.split(',');
const GAP_MS = 6600;

const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) { console.error('No GEMINI_API_KEY in .env.local. Run: bash scripts/set-gemini-key.sh'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function wav(pcm: Buffer, rate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
/** Seconds of a 16-bit mono WAV. */
const seconds = (w: Buffer) => (w.length - 44) / 2 / w.readUInt32LE(24);
/** The longest a take of these words may run: speech at about 2.2 words a second, plus room for a laugh. */
const maxSeconds = (line: string) => 1.6 + line.split(/\s+/).length * 0.55;

let last = 0;
let dayRefusals = 0;
async function speak(text: string, voice: string): Promise<Buffer | 'quota' | null> {
  const at = Math.max(Date.now(), last + GAP_MS);
  last = at;
  if (at > Date.now()) await sleep(at - Date.now());
  const body = { contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key!, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  if (!r) return null;
  const t = await r.json().catch(() => ({}));
  if (r.status === 429) {
    const v = (t.error?.details ?? []).flatMap((d: { violations?: { quotaId?: string; quotaValue?: string }[] }) => d.violations ?? []);
    console.error(`  429: ${v.map((x: { quotaId?: string; quotaValue?: string }) => `${x.quotaId} ${x.quotaValue}`).join(', ') || 'no detail'}`);
    // a per-minute limit passes; a per-day one ends the run once it has refused three times in a row
    if (v.some((x: { quotaId?: string }) => /PerDay/i.test(x.quotaId ?? '')) && ++dayRefusals >= 3) return 'quota';
    await sleep(60000);
    return null;
  }
  dayRefusals = 0;
  if (!r.ok) { console.error(`  ${r.status} ${JSON.stringify(t).slice(0, 160)}`); return null; }
  const part = t.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData);
  if (!part) return null;
  const pcm = Buffer.from(part.inlineData.data, 'base64');
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1] ?? 24000);
  return pcm.subarray(0, 4).toString() === 'RIFF' ? pcm : wav(pcm, rate);
}

const jobs = allLines().filter((l) => (!only || only.includes(l.racerId)) && (!keys || keys.includes(l.key)));
let made = 0, kept = 0, failed = 0, stop = false;
const todo: { l: (typeof jobs)[number]; k: number; file: string }[] = [];
for (const l of jobs) for (let k = 1; k <= TAKES; k++) {
  const file = `${OUT}/${l.key}-t${k}.wav`;
  if (existsSync(file)) kept++; else todo.push({ l, k, file });
}
async function one({ l, k, file }: (typeof todo)[number]): Promise<void> {
  for (let attempt = 0; attempt < 3 && !stop; attempt++) {
    const w = await speak(prompt(l.racerId, l.bark, l.line), CAST[l.racerId].voice);
    if (w === 'quota') { stop = true; console.error('The daily limit is reached: run again tomorrow (takes so far are kept).'); return; }
    if (w && seconds(w) <= maxSeconds(l.line)) {
      writeFileSync(file, w);
      made++;
      console.log(`${l.key} t${k}: ${seconds(w).toFixed(2)} s  "${l.line}"`);
      return;
    }
    if (w) console.error(`  ${l.key} t${k}: ${seconds(w).toFixed(1)} s is too long for "${l.line}", again`);
  }
  if (!stop) { failed++; console.error(`${l.key} t${k}: no usable take`); }
}
const IN_FLIGHT = 5;
let next = 0;
await Promise.all(Array.from({ length: IN_FLIGHT }, async () => {
  while (next < todo.length && !stop) await one(todo[next++]);
}));
console.log(`made ${made}, kept ${kept}, failed ${failed} (${OUT})`);
