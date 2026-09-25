// Watches a public video of another game (YouTube) with Gemini and answers in words: our eyes on Mario
// Kart World, which we cannot play. Nothing is downloaded or played here; Gemini fetches the video itself.
//   node scripts/headless/watch.mjs <youtube-url> "<question>" [--from=90] [--to=600] [--fps=1] [--model=a,b] [--rounds=6] [--hi]
// --from/--to: seconds into the video (keep a window to a few minutes: tokens scale with its length);
// --hi: full media resolution (small text on a HUD), else low. Flash by default: fine for video, and
// Gemini Pro's 250 requests a day are kept for the sound judge (scripts/ear/judge.mjs).
import { readFileSync } from 'node:fs';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const [url, question] = args.filter((a) => !a.startsWith('--'));
if (!url || !question) { console.error('usage: watch.mjs <youtube-url> "<question>" [--from=s] [--to=s] [--fps=n] [--hi]'); process.exit(1); }
const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) { console.error('No GEMINI_API_KEY in .env.local. Run: bash scripts/set-gemini-key.sh'); process.exit(1); }

const meta = { fps: Number(flag('fps', '1')) };
if (flag('from', '')) meta.startOffset = `${Number(flag('from', '0'))}s`;
if (flag('to', '')) meta.endOffset = `${Number(flag('to', '0'))}s`;
const body = JSON.stringify({
  contents: [{ parts: [{ fileData: { fileUri: url }, videoMetadata: meta }, { text: question }] }],
  generationConfig: { temperature: 0.2, mediaResolution: args.includes('--hi') ? 'MEDIA_RESOLUTION_HIGH' : 'MEDIA_RESOLUTION_LOW' },
});
const headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' };
let last = '';
// a busy model (503) is common at peak hours: go round the list for up to --rounds rounds, waiting longer each round
const models = flag('model', 'gemini-3.5-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.8-flash,gemini-3-flash-preview,gemini-flash-latest').split(',');
const dead = new Set();
for (let round = 0; round < Number(flag('rounds', '6')); round++) {
  for (const model of models) {
    if (dead.has(model)) continue;
    const r = await fetch(`${API}/models/${model}:generateContent`, { method: 'POST', headers, body });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const u = j.usageMetadata ?? {};
      console.log(`(${model}, ${u.promptTokenCount ?? '?'} in / ${u.candidatesTokenCount ?? '?'} out)\n${j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() || '(no answer)'}`);
      process.exit(0);
    }
    last = `${model} ${r.status}: ${j.error?.message?.slice(0, 300) ?? ''}`;
    console.error(`  ${last.slice(0, 120)}`);
    if (r.status !== 503 && r.status !== 500) dead.add(model); // quota, gone, bad request: not this model again
  }
  if (dead.size === models.length) break;
  await new Promise((res) => setTimeout(res, 15000 * (round + 1)));
}
console.error(`error: ${last}`);
process.exit(1);
