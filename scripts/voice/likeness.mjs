// One clip per request: does this voice sound like a famous character? No character is named in the
// question, so nothing leads the ear. Nothing is played; the key is never printed.
//   node likeness.mjs <file> [<file> ...]
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
const key = /^GEMINI_API_KEY=(.+)$/m.exec(readFileSync(new URL('../../.env.local', import.meta.url), 'utf8'))[1].trim();
const schema = { type: 'OBJECT', properties: {
  description: { type: 'STRING' }, soundsLikeAFamousCharacter: { type: 'BOOLEAN' }, who: { type: 'STRING' },
  howStrongly: { type: 'INTEGER' }, why: { type: 'STRING' } }, required: ['description', 'soundsLikeAFamousCharacter', 'who', 'howStrongly', 'why'] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const f of process.argv.slice(2)) {
  const body = JSON.stringify({ contents: [{ parts: [
    { text: 'You are a casting director checking a new, original cartoon voice for a family video game. Describe the voice in one sentence. Then say honestly whether it sounds like, or could be mistaken for, the voice of any specific famous character from video games, cartoons or films. If yes, name who and rate how strongly from 0 (not at all) to 10 (a clear imitation), and say what makes it similar. If it is just a generic cartoon voice, say no and rate 0-2.' },
    { inlineData: { mimeType: f.endsWith('.mp3') ? 'audio/mp3' : 'audio/wav', data: readFileSync(f).toString('base64') } },
  ] }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 } });
  let out = null;
  for (let a = 0; a < 4 && !out; a++) {
    const model = a % 2 ? 'gemini-3.1-pro-preview' : 'gemini-pro-latest';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body }).catch(() => null);
    if (r?.ok) { const t = await r.json(); out = JSON.parse(t.candidates[0].content.parts.map((p) => p.text ?? '').join('')); }
    else { if (r?.status === 429) { console.log('quota'); process.exit(2); } await sleep(15000); }
  }
  console.log(`${basename(f).padEnd(24)} like=${out?.soundsLikeAFamousCharacter} strength=${out?.howStrongly} who=${out?.who} | ${out?.description?.slice(0, 90)}`);
}
