// The strong ear: Gemini listens to sound files and answers in words. Nothing is played aloud.
//   node scripts/ear/gemini.mjs <file,file,...> ["question"] [--model=gemini-...]
// The key comes from .env.local (scripts/set-gemini-key.sh) and is never printed. Each file goes up
// inline (under ~15 MB; cut long songs into excerpts first). Without --model it tries the best listeners in turn (PREFER).
import { readFileSync } from 'node:fs';
import { extname, basename } from 'node:path';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const MIME = { '.mp3': 'audio/mp3', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.m4a': 'audio/aac', '.aac': 'audio/aac' };
const ASK = 'You are an expert game audio director. Describe exactly what you hear: sound sources, instruments, mood, loudness over time, any voices, words or singing, and any problems (clicks, pops, distortion, clipping, hiss, abrupt cuts, a bad loop seam). Be concrete and brief.';

const args = process.argv.slice(2);
const files = args.find((a) => !a.startsWith('--'))?.split(',') ?? [];
const question = args.filter((a) => !a.startsWith('--'))[1] ?? ASK;
const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) { console.error('No GEMINI_API_KEY in .env.local. Run: bash scripts/set-gemini-key.sh'); process.exit(1); }
const headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' };

/** Best listeners first: the Pro line, the audio-native omni model, then the newest Flash models. */
const PREFER = ['gemini-pro-latest', 'gemini-3.1-pro-preview', 'gemini-omni-1.1-flash', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-pro', 'gemini-flash-latest', 'gemini-2.5-flash'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function models() {
  const want = args.find((a) => a.startsWith('--model='))?.slice(8);
  if (want) return [want];
  const r = await fetch(`${API}/models?pageSize=200`, { headers });
  if (!r.ok) throw new Error(`listing models: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const have = new Set((await r.json()).models.filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.slice(7)));
  const list = PREFER.filter((m) => have.has(m));
  if (!list.length) throw new Error('none of the preferred Gemini models is available to this key');
  return list;
}

/** One file through the models in order: a busy model (503) is retried twice, a used-up one (429) skipped. */
async function ask(list, file, mime) {
  const body = JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mime, data: readFileSync(file).toString('base64') } }, { text: question }] }], generationConfig: { temperature: 0.2 } });
  let last = '';
  for (const model of list) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(`${API}/models/${model}:generateContent`, { method: 'POST', headers, body });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return `(${model}) ${j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() || '(no answer)'}`;
      last = `${model} ${r.status}: ${j.error?.message?.slice(0, 160) ?? ''}`;
      if (r.status !== 503) break; // quota, bad request: try the next model
      await sleep(2000 * (attempt + 1));
    }
  }
  return `error: ${last}`;
}

const list = await models();
for (const file of files) {
  const mime = MIME[extname(file).toLowerCase()];
  console.log(`== ${basename(file)}\n${mime ? await ask(list, file, mime) : 'skipped: not an audio file'}\n`);
}
