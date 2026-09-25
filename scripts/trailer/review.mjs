import { readFileSync } from 'node:fs';
const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
const video = readFileSync(process.argv[2]).toString('base64');
const ask = process.argv[3];
const body = JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: 'video/mp4', data: video } }, { text: ask }] }], generationConfig: { temperature: 0.3 } });
for (let round = 0; round < 8; round++) {
  for (const m of ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3-flash-preview']) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { console.log(`(${m})\n${j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim()}`); process.exit(0); }
    console.error(`${m} ${r.status}`);
  }
  await new Promise((res) => setTimeout(res, 15000 * (round + 1)));
}
process.exit(1);
