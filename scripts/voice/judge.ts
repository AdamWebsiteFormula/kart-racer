// Gemini Pro listens to the takes of the racers' voice lines and scores each against its brief
// (scripts/voice/catalog.ts): the words, the character, the acting, the audio. Nothing is played; the
// key comes from .env.local and is never printed. A take already judged is skipped.
//   node scripts/voice/judge.ts [--only=pip,gus] [--takes=<dir>] [--batch=12]
// Verdicts land in <takes>/judge/<key>-t<k>.json; build.ts picks from them.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { allLines, CAST, MOMENTS } from './catalog.ts';

const args = process.argv.slice(2);
const flag = (name: string, dflt?: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const TAKES = flag('takes', `${homedir()}/.cache/rascal-voice/takes`)!;
const BATCH = Number(flag('batch', '12'));
const only = flag('only')?.split(',');
const OUT = `${TAKES}/judge`;
const LEDGER = process.env.GEMINI_LEDGER ?? `${tmpdir()}/rascal-gemini-ledger.jsonl`;
const MODELS = ['gemini-pro-latest', 'gemini-3.1-pro-preview'];
mkdirSync(OUT, { recursive: true });

const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) { console.error('No GEMINI_API_KEY in .env.local. Run: bash scripts/set-gemini-key.sh'); process.exit(1); }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Verdict {
  heardWords: string; wordsMatch: boolean; characterFit: number; acting: number; audioQuality: number; gameReady: number;
  soundsLikeTTS: boolean; gRated: boolean; resemblesKnownCharacterOrPerson: string; problems: string[]; oneLine: string;
}

const lines = new Map(allLines().map((l) => [l.key, l]));
const files = readdirSync(TAKES).filter((f) => /^[a-z]+-[a-zA-Z]+-\d+-t\d+\.wav$/.test(f)).sort();
const todo = files.filter((f) => {
  const k = f.replace(/-t\d+\.wav$/, '');
  return lines.has(k) && (!only || only.includes(lines.get(k)!.racerId)) && !existsSync(`${OUT}/${f.replace('.wav', '.json')}`);
});
// one racer a request, so the judge hears each character's takes side by side
const batches: string[][] = [];
for (const racer of Object.keys(CAST)) {
  const mine = todo.filter((f) => f.startsWith(`${racer}-`));
  for (let i = 0; i < mine.length; i += BATCH) batches.push(mine.slice(i, i + BATCH));
}

const schema = {
  type: 'OBJECT', properties: { clips: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
    label: { type: 'STRING' }, heardWords: { type: 'STRING' }, wordsMatch: { type: 'BOOLEAN' },
    characterFit: { type: 'INTEGER' }, acting: { type: 'INTEGER' }, audioQuality: { type: 'INTEGER' }, gameReady: { type: 'INTEGER' },
    soundsLikeTTS: { type: 'BOOLEAN' }, gRated: { type: 'BOOLEAN' }, resemblesKnownCharacterOrPerson: { type: 'STRING' },
    problems: { type: 'ARRAY', items: { type: 'STRING' } }, oneLine: { type: 'STRING' },
  }, required: ['label', 'heardWords', 'wordsMatch', 'characterFit', 'acting', 'audioQuality', 'gameReady', 'soundsLikeTTS', 'gRated', 'resemblesKnownCharacterOrPerson', 'problems', 'oneLine'] } } },
  required: ['clips'],
};

let spent = 0;
for (const batch of batches) {
  const parts: object[] = [{ text: `You are the voice director of a new family kart-racing game whose bar is Nintendo's Mario Kart World: every racer has short voice "barks" (one-word or short-phrase exclamations) recorded by professional character actors. You will hear ${batch.length} clips, labelled in order. For each, judge it against its brief. Be strict and concrete: a clip that sounds like generic text-to-speech, a narrator, an adult reading a line, or that has any glitch, click, cut-off word, odd breath, robotic artifact (unless the character is a robot), echo or noise must score low on quality or acting. A short laugh or giggle that fits the character is fine. The game is rated G: nothing rude or scary. Score characterFit, acting, audioQuality and gameReady each from 1 (unusable) to 10 (as good as Mario Kart World's shipped voices); 7 means shippable.` }];
  batch.forEach((f, i) => {
    const l = lines.get(f.replace(/-t\d+\.wav$/, ''))!;
    const c = CAST[l.racerId];
    parts.push({ text: `Clip ${i + 1}. Character: ${c.name}: ${c.profile} Moment: ${MOMENTS[l.bark].scene.replace('NAME', c.name)} ${MOMENTS[l.bark].style} Intended words: "${l.line}".` });
    parts.push({ inlineData: { mimeType: 'audio/wav', data: readFileSync(`${TAKES}/${f}`).toString('base64') } });
  });
  parts.push({ text: 'Answer for every clip, in order.' });
  const body = JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 } });
  let got: { clips: Verdict[] } | null = null, used = '';
  for (let attempt = 0; attempt < 4 && !got; attempt++) {
    used = MODELS[attempt % MODELS.length];
    // a verdict comes back in about 8 s; on 28 Sept some requests hung 5 min or more, so give up after 90 s and try again
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${used}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(90000) }).catch(() => null);
    const t = r ? await r.json().catch(() => ({})) : {};
    if (r?.status === 429) { console.error(`${used}: the daily limit; stopping (judged takes are kept)`); process.exit(2); }
    if (!r?.ok) { console.error(`${used}: ${r?.status ?? 'no answer'}, trying again`); await sleep(20000); continue; }
    const u = t.usageMetadata ?? {};
    const usd = (u.promptTokenCount ?? 0) * 2e-6 + ((u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0)) * 12e-6;
    spent += usd;
    appendFileSync(LEDGER, `${JSON.stringify({ at: new Date().toISOString(), tool: 'voice-judge', model: used, usd })}\n`);
    try { got = JSON.parse(t.candidates[0].content.parts.map((p: { text?: string }) => p.text ?? '').join('')); } catch { got = null; }
    if (got && got.clips.length !== batch.length) got = null;
  }
  if (!got) { console.error(`no verdict for ${batch[0]} … (${batch.length} takes)`); continue; }
  got.clips.forEach((v, i) => {
    writeFileSync(`${OUT}/${batch[i].replace('.wav', '.json')}`, JSON.stringify({ ...v, model: used }, null, 1));
    console.log(`${batch[i].padEnd(28)} ready ${v.gameReady} fit ${v.characterFit} act ${v.acting} audio ${v.audioQuality}${v.wordsMatch ? '' : ` WORDS: "${v.heardWords}"`}${v.resemblesKnownCharacterOrPerson ? ` RESEMBLES ${v.resemblesKnownCharacterOrPerson}` : ''}`);
  });
}
console.log(`judged ${todo.length} takes in ${batches.length} requests, $${spent.toFixed(3)}`);
