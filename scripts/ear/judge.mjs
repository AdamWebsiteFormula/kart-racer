// The judge: Gemini listens to a sound against its brief and the moment it plays in the game, and
// answers in strict JSON (a response schema), so a whole catalog can be scored and compared. Nothing
// is ever played aloud. The key comes from .env.local (scripts/set-gemini-key.sh) and is never printed.
//
//   node scripts/ear/judge.mjs sfx [id ...] [--batch=6]         every catalog sound (or these ids), several clips a request
//   node scripts/ear/judge.mjs batch <id=path> ...              these recordings judged as these sounds, in one request
//   node scripts/ear/judge.mjs file <path> --as=<id>            one recording judged as sound <id> (a new take)
//   node scripts/ear/judge.mjs compare <id> <path,path,...>     takes side by side: which fits the brief best
//   node scripts/ear/judge.mjs song <path> --as=<song> --part=start|middle|seam
//   node scripts/ear/judge.mjs songset <song> <start.wav,middle.wav,seam.wav>   a song's three excerpts, one request
//   node scripts/ear/judge.mjs voices <excerpt.wav> [--from=<s>]  is any human voice in this music excerpt, and when
//          (a plain question with no brief, so nothing leads the ear; --from = the excerpt's start in the song,
//          added to each time). Settle a heard voice with two different cuts that agree on the time.
//   flags: --model=gemini-pro-latest (falls back to gemini-3.1-pro-preview when busy), --thinking=low|high,
//          --budget=8 (US dollars: no call starts once the ledger has spent this much), --patience=10 (minutes)
//
//   node scripts/ear/judge.mjs calibrate --model=<m>            known answers (finalLap brass, airHorn horn, crabClack clicky claw)
//
// Gemini 3.1 Pro (gemini-pro-latest) allows 250 requests a day on this key: batch the clips. A clip much
// under a second is heard as nothing, so every sound effect goes up padded with silence (see `padded`).
// Every call's tokens and cost go to a ledger (GEMINI_LEDGER, else <tmp>/rascal-gemini-ledger.jsonl):
// $2 per million input tokens (audio is 32 tokens a second), $12 per million output and thinking tokens.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { fileFor, MOMENT, SFX, SONG_MOMENT, SONGS } from '../elevenlabs/catalog.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const API = 'https://generativelanguage.googleapis.com/v1beta';
const MIME = { '.mp3': 'audio/mp3', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.m4a': 'audio/aac' };
const PRICE = { input: 2e-6, output: 12e-6 };
const LEDGER = process.env.GEMINI_LEDGER ?? `${tmpdir()}/rascal-gemini-ledger.jsonl`;

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const words = args.filter((a) => !a.startsWith('--'));
const MODELS = flag('model') ? [flag('model')] : ['gemini-pro-latest', 'gemini-3.1-pro-preview'];
const THINKING = flag('thinking', 'low');
const BUDGET = Number(flag('budget', '8'));
const PATIENCE = Number(flag('patience', '10')); // minutes to keep asking a busy model

const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) { console.error('No GEMINI_API_KEY in .env.local. Run: bash scripts/set-gemini-key.sh'); process.exit(1); }
const headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function spent() {
  if (!existsSync(LEDGER)) return 0;
  return readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).reduce((a, l) => a + (JSON.parse(l).usd ?? 0), 0);
}

const SYSTEM = 'You are the audio director of Rascal Rally!, a bright cartoon kart racing game made to the standard of ' +
  'Mario Kart World: original characters, rated G for everyone, no voices, words or singing anywhere, and nothing that sounds ' +
  'like a weapon. You judge recordings strictly and concretely against their brief and the moment they play in the game. ' +
  'You listen to the audio itself; you never guess from the brief.';

const S = (type, extra = {}) => ({ type, ...extra });
const SFX_SCHEMA = S('OBJECT', {
  properties: {
    heard: S('STRING', { description: 'One sentence: what you actually hear, as if you had no brief.' }),
    matchesIntent: S('INTEGER', { description: '0-10: how well it sounds like the brief.' }),
    fitsMomentAndMKWQuality: S('INTEGER', { description: '0-10: how well it works at its moment in a polished Mario Kart World-quality game.' }),
    problems: S('ARRAY', { items: S('STRING') }),
    verdict: S('STRING', { enum: ['keep', 'remake'] }),
  },
  required: ['heard', 'matchesIntent', 'fitsMomentAndMKWQuality', 'problems', 'verdict'],
  propertyOrdering: ['heard', 'matchesIntent', 'fitsMomentAndMKWQuality', 'problems', 'verdict'],
});
/** Several clips in one request (the daily request cap): one result per clip, in order, each naming its id. */
const BATCH_SCHEMA = S('ARRAY', { items: S('OBJECT', {
  properties: { clip: S('INTEGER'), id: S('STRING'), ...SFX_SCHEMA.properties },
  required: ['clip', 'id', ...SFX_SCHEMA.required],
  propertyOrdering: ['clip', 'id', ...SFX_SCHEMA.propertyOrdering],
}) });
const COMPARE_SCHEMA = S('OBJECT', {
  properties: {
    takes: S('ARRAY', { items: S('OBJECT', {
      properties: {
        take: S('STRING', { description: 'Its letter.' }), heard: S('STRING', { description: 'One sentence: what you actually hear in this take.' }),
        matchesIntent: S('INTEGER', { description: '0-10: how well it sounds like the brief.' }),
        fitsMomentAndMKWQuality: S('INTEGER', { description: '0-10: how well it works at its moment in a polished Mario Kart World-quality game.' }),
        problems: S('ARRAY', { items: S('STRING') }),
      },
      required: ['take', 'heard', 'matchesIntent', 'fitsMomentAndMKWQuality', 'problems'],
      propertyOrdering: ['take', 'heard', 'matchesIntent', 'fitsMomentAndMKWQuality', 'problems'],
    }) }),
    best: S('STRING', { description: 'The letter of the take that fits the brief and the moment best.' }),
    reason: S('STRING'),
  },
  required: ['takes', 'best', 'reason'],
  propertyOrdering: ['takes', 'best', 'reason'],
});
const SONG_SCHEMA = S('OBJECT', {
  properties: {
    heard: S('STRING', { description: 'Instruments, groove and mood in one or two sentences.' }),
    moodFit: S('INTEGER', { description: '0-10: how well the mood fits its track or screen.' }),
    energyVsMKWRaceTheme: S('INTEGER', { description: '0-10: energy and polish against a Mario Kart World race theme (for menus and results, against their MKW counterparts).' }),
    vocals: S('STRING', { enum: ['none', 'present'] }),
    vocalsDetail: S('STRING'),
    seamProblems: S('ARRAY', { items: S('STRING'), description: 'For a loop seam excerpt: any click, gap, jump, stumble or break in rhythm, with the time. Empty if none or not a seam.' }),
    problems: S('ARRAY', { items: S('STRING') }),
    verdict: S('STRING', { enum: ['keep', 'remake'] }),
  },
  required: ['heard', 'moodFit', 'energyVsMKWRaceTheme', 'vocals', 'vocalsDetail', 'seamProblems', 'problems', 'verdict'],
  propertyOrdering: ['heard', 'moodFit', 'energyVsMKWRaceTheme', 'vocals', 'vocalsDetail', 'seamProblems', 'problems', 'verdict'],
});

const VOICE_SCHEMA = S('OBJECT', {
  properties: {
    heard: S('STRING', { description: 'The instruments and sounds in this excerpt, in one or two sentences.' }),
    humanVoice: S('STRING', { enum: ['none', 'present'], description: 'Any human voice anywhere in the excerpt: singing, humming, shouting, cheering, a crowd, speech, or a sampled vocal chop.' }),
    voices: S('ARRAY', { items: S('OBJECT', {
      properties: {
        at: S('NUMBER', { description: 'Seconds from the start of this excerpt.' }),
        until: S('NUMBER', { description: 'Seconds from the start of this excerpt.' }),
        kind: S('STRING', { enum: ['singing', 'humming', 'shout', 'cheer', 'crowd', 'speech', 'vocal sample', 'other voice'] }),
        what: S('STRING', { description: 'What it sounds like, and any word you can make out.' }),
        certainty: S('INTEGER', { description: '0-10: how sure you are that this is a human voice, not an instrument.' }),
      },
      required: ['at', 'until', 'kind', 'what', 'certainty'],
      propertyOrdering: ['at', 'until', 'kind', 'what', 'certainty'],
    }), description: 'Every human voice you hear, one entry each. Empty when there is none.' }),
    lookalikes: S('ARRAY', { items: S('STRING'), description: 'Instrument sounds here that could be mistaken for a voice (a trombone slide, a brass stab, a synth), each with its time in seconds.' }),
  },
  required: ['heard', 'humanVoice', 'voices', 'lookalikes'],
  propertyOrdering: ['heard', 'humanVoice', 'voices', 'lookalikes'],
});

/**
 * The clip as the model gets it: Gemini hears nothing in a clip much under a second (a 0.5 s coin came
 * back "no audio was provided", 12 audio tokens), so every sound effect goes up as 16-bit WAV, a quarter
 * second of silence before it and silence after it to at least 2.5 s (macOS afconvert decodes the MP3).
 */
const WORK = mkdtempSync(join(tmpdir(), 'rascal-judge-'));
let clips = 0;
function padded(path) {
  const wav = join(WORK, `c${clips++}.wav`);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16', path, wav]);
  const b = readFileSync(wav);
  let o = 12, ch = 2, rate = 44100, data = null;
  while (o < b.length) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(o + 10); rate = b.readUInt32LE(o + 12); }
    if (id === 'data') data = b.subarray(o + 8, o + 8 + size);
    o += 8 + size + (size & 1);
  }
  const frame = ch * 2, lead = Math.round(0.25 * rate) * frame;
  const total = Math.max(Math.round(2.5 * rate) * frame, lead + data.length + Math.round(0.25 * rate) * frame);
  const out = Buffer.alloc(44 + total);
  out.write('RIFF', 0); out.writeUInt32LE(36 + total, 4); out.write('WAVE', 8); out.write('fmt ', 12); out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); out.writeUInt16LE(ch, 22); out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * frame, 28); out.writeUInt16LE(frame, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(total, 40);
  data.copy(out, 44 + lead);
  return out;
}
/** A sound effect padded (see `padded`); a long file (a song excerpt, already WAV) as it is. */
const audioPart = (path, pad = true) => pad
  ? { inline_data: { mime_type: 'audio/wav', data: padded(path).toString('base64') } }
  : { inline_data: { mime_type: MIME[extname(path).toLowerCase()] ?? 'audio/mp3', data: readFileSync(path).toString('base64') } };

/** One request, through the models in turn; a busy model is retried with a growing wait. Logs its cost. */
async function generate(parts, schema, label) {
  if (spent() >= BUDGET) throw new Error(`budget: the ledger has spent $${spent().toFixed(2)} of $${BUDGET}`);
  let thinking = THINKING;
  let last = '';
  // the Pro models are often busy (503): go round them, waiting longer each round, until --patience runs out
  const deadline = Date.now() + PATIENCE * 60000;
  const spentOut = new Set(); // models whose daily quota is used up
  for (let round = 0; Date.now() < deadline && spentOut.size < MODELS.length; round++) for (const model of MODELS) {
    if (spentOut.has(model)) continue;
    if (round) await sleep(Math.min(60000, 5000 * 2 ** Math.min(round, 4)));
    for (let attempt = 0; attempt < 2; attempt++) {
      const generationConfig = { responseMimeType: 'application/json', responseSchema: schema };
      if (thinking) generationConfig.thinkingConfig = { thinkingLevel: thinking };
      const body = JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts }], generationConfig });
      const r = await fetch(`${API}/models/${model}:generateContent`, { method: 'POST', headers, body }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: String(e) } }) }));
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const u = j.usageMetadata ?? {};
        const input = u.promptTokenCount ?? 0, output = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
        const usd = input * PRICE.input + output * PRICE.output;
        appendFileSync(LEDGER, `${JSON.stringify({ at: new Date().toISOString(), label, model, input, output, usd })}\n`);
        const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        try {
          const v = JSON.parse(text);
          if (Array.isArray(v)) return Object.assign(v, { model, usd: Number(usd.toFixed(5)) });
          return { ...v, model, usd: Number(usd.toFixed(5)) };
        } catch { return { error: 'not JSON', text: text.slice(0, 300), model, usd }; }
      }
      last = `${model} ${r.status}: ${j.error?.message?.slice(0, 200) ?? ''}`;
      // a model that does not know the thinking level: ask again without it
      if (r.status === 400 && /thinking/i.test(last) && thinking) { thinking = ''; attempt--; continue; }
      // a daily quota used up: this model is done for today (the cap resets at midnight Pacific)
      if (r.status === 429 && /per ?day|quota/i.test(last)) { spentOut.add(model); break; }
      if (r.status === 503 || r.status === 500 || r.status === 429 || r.status === 0) { await sleep(2000); continue; }
      return { error: last }; // a bad request: asking again will not help
    }
  }
  return { error: last };
}

const spec = (id) => SFX.find((s) => s.id === id);
function brief(id) {
  const s = spec(id);
  if (!s) throw new Error(`no catalog sound ${id}`);
  return `Sound: "${id}".\nBrief (what it was made to be): ${s.prompt}\nIn-game moment: ${MOMENT[id]}\n` +
    `Requested length: about ${s.seconds} s${s.loop ? ', a seamless loop' : ''}. The game trims silence before and after the sound, ` +
    `levels its loudness and fades its edges, so judge the sound itself: its character, clarity, length and punch, not its volume. ` +
    `The clip you get has a quarter second of silence before the sound and silence after it; the silence is not part of the sound.`;
}
const SFX_ASK = 'Judge this sound effect. matchesIntent: does it sound like the brief? fitsMomentAndMKWQuality: would it work at ' +
  'that moment in a polished Mario Kart World-quality game (reads instantly over music and engines, the right size and length ' +
  'for the moment, character, not tiring when frequent, nothing harsh, no voice, nothing weapon-like)? List concrete problems. ' +
  "verdict 'remake' only when it is clearly wrong for the moment or clearly below that quality bar; otherwise 'keep'.";

async function judgeSfx(id, path) {
  return { id, file: basename(path), ...(await generate([{ text: brief(id) }, audioPart(path), { text: SFX_ASK }], SFX_SCHEMA, `sfx ${id} ${basename(path)}`)) };
}

/** Several sounds (id + recording) judged in one request; results come back per clip, in order. */
async function judgeBatch(items) {
  const parts = [{ text: `You will hear ${items.length} separate sound-effect clips, each introduced by its brief. Judge each clip on its own.` }];
  items.forEach(({ id, path }, i) => parts.push({ text: `Clip ${i + 1}.\n${brief(id)}` }, audioPart(path)));
  parts.push({ text: `${SFX_ASK}\nReturn a JSON array with exactly ${items.length} objects, one per clip in order (clip = its number, id = its sound).` });
  const r = await generate(parts, BATCH_SCHEMA, `batch x${items.length} ${items.map((x) => x.id).join(',')}`);
  if (!Array.isArray(r)) return items.map(({ id, path }) => ({ id, file: basename(path), ...r }));
  const usd = Number(((r.usd ?? 0)).toFixed?.(5) ?? 0);
  return items.map(({ id, path }, i) => {
    const x = r.find((y) => y.clip === i + 1) ?? r[i] ?? {};
    return { id, file: basename(path), ...x, idEcho: x.id, model: r.model, usd: r.usd / items.length };
  });
}

async function compare(id, paths) {
  const letters = 'ABCDEFGH';
  const parts = [{ text: `${brief(id)}\n\nHere are ${paths.length} takes of this sound, labelled.` }];
  paths.forEach((p, i) => { parts.push({ text: `Take ${letters[i]}:` }, audioPart(p)); });
  parts.push({ text: `${SFX_ASK}\nJudge each take that way, then pick the one take that best fits the brief and the moment (best: its letter) and say why in one or two sentences.` });
  const r = await generate(parts, COMPARE_SCHEMA, `compare ${id} x${paths.length}`);
  const i = letters.indexOf(r.best ?? '?');
  return { id, takes: paths.map((p, k) => `${letters[k]}=${basename(p)}`), bestFile: i >= 0 ? basename(paths[i]) : null, ...r };
}

async function judgeSong(path, id, part) {
  const s = SONGS.find((x) => x.id === id);
  const what = part === 'seam'
    ? 'This excerpt is the loop seam exactly as the game plays it: the last 5 seconds before the loop end run straight into the first 5 seconds after the loop start, at the 5 second mark. Listen closely there for any click, gap, jump, change of level, stumble or break in the rhythm.'
    : `This excerpt is from the ${part} of the song's loop.`;
  const text = `Song: "${id}".\nBrief: ${s?.prompt ?? ''}\nWhere it plays: ${SONG_MOMENT[id] ?? ''}\n${what}\n` +
    'Judge the mood fit to its track or screen, the energy and polish against a Mario Kart World race theme (for the title and results, against their MKW counterparts), ' +
    "whether there is any singing, voice or words (there must be none), and any problems. verdict 'remake' only if it clearly fails its place.";
  return { id, part, file: basename(path), ...(await generate([{ text }, audioPart(path, false)], SONG_SCHEMA, `song ${id} ${part}`)) };
}

/** A song's three excerpts (start, middle, seam) in one request: one result per excerpt. */
async function judgeSongSet(id, paths) {
  const parts = [];
  const names = ['start', 'middle', 'seam'];
  const s = SONGS.find((x) => x.id === id);
  parts.push({ text: `Song: "${id}".\nBrief: ${s?.prompt ?? ''}\nWhere it plays: ${SONG_MOMENT[id] ?? ''}\nYou will hear ${paths.length} excerpts of it.` });
  paths.forEach((p, i) => parts.push({ text: names[i] === 'seam'
    ? `Excerpt ${i + 1} (seam): the loop seam exactly as the game plays it: the last 5 seconds before the loop end run straight into the first 5 seconds after the loop start, at the 5 second mark; listen there for any click, gap, jump, change of level, stumble or break in the rhythm.`
    : `Excerpt ${i + 1} (${names[i]}): from the ${names[i]} of the loop.` }, audioPart(p, false)));
  parts.push({ text: 'Judge each excerpt: mood fit to its track or screen, energy and polish against a Mario Kart World race theme (for the title and results, their MKW counterparts), ' +
    "any singing, voice, shout, cheer or words (there must be none: give the time if you hear any), and any problems. verdict 'remake' only if it clearly fails its place. " +
    `Return a JSON array with exactly ${paths.length} objects, one per excerpt in order.` });
  const r = await generate(parts, S('ARRAY', { items: S('OBJECT', { properties: { excerpt: S('INTEGER'), ...SONG_SCHEMA.properties }, required: ['excerpt', ...SONG_SCHEMA.required], propertyOrdering: ['excerpt', ...SONG_SCHEMA.propertyOrdering] }) }), `songset ${id}`);
  if (!Array.isArray(r)) return paths.map((p, i) => ({ id, part: names[i], file: basename(p), ...r }));
  return paths.map((p, i) => ({ id, part: names[i], file: basename(p), ...(r.find((x) => x.excerpt === i + 1) ?? r[i] ?? {}), model: r.model, usd: r.usd / paths.length }));
}

/** Seconds in a PCM WAV file (its data chunk over its byte rate). */
function wavSeconds(path) {
  const b = readFileSync(path);
  let o = 12, rate = 0, bytes = 0;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') rate = b.readUInt32LE(o + 16);
    if (id === 'data') bytes = size;
    o += 8 + size + (size & 1);
  }
  return rate ? bytes / rate : 0;
}

/**
 * Is there a human voice in this music excerpt? A plain question: no brief, no song name and no hint of
 * where a voice was heard before, so nothing leads the ear. Times come back from the excerpt's start;
 * `from` (the excerpt's start in the song) is added to give song times, so two cuts can be matched.
 */
async function voices(path, from) {
  const secs = wavSeconds(path);
  const text = `This is a ${secs.toFixed(1)} second excerpt of a music track. Listen to all of it closely. ` +
    'Is there any human voice anywhere in it: singing, humming, shouting, cheering, a crowd, speech, or a sampled vocal chop? ' +
    'Answer only from what you hear. For each voice, give its time in seconds from the start of this excerpt and how sure you are. ' +
    'Also list any instrument sounds that could be mistaken for a voice, with their times.';
  const r = await generate([{ text }, audioPart(path, false)], VOICE_SCHEMA, `voices ${basename(path)}`);
  const at = (t) => (typeof t === 'number' ? Number((t + from).toFixed(2)) : t);
  return { file: basename(path), from, seconds: Number(secs.toFixed(2)), ...r, songTimes: (r.voices ?? []).map((v) => [at(v.at), at(v.until)]) };
}

const out = (r) => console.log(JSON.stringify(r));
const [mode, ...rest] = words;
const BATCH = Number(flag('batch', '1'));
if (mode === 'sfx') {
  const ids = rest.length ? rest : SFX.map((s) => s.id);
  const items = ids.map((id) => ({ id, path: `${ROOT}public/audio/sfx/${fileFor(id)}` }));
  if (BATCH > 1) for (let i = 0; i < items.length; i += BATCH) for (const r of await judgeBatch(items.slice(i, i + BATCH))) out(r);
  else for (const { id, path } of items) out(await judgeSfx(id, path));
} else if (mode === 'batch') {
  // judge.mjs batch <id=path> <id=path> ...: recordings judged as the sounds named, all in one request
  const items = rest.map((w) => { const k = w.indexOf('='); return { id: w.slice(0, k), path: w.slice(k + 1) }; });
  for (const r of await judgeBatch(items)) out(r);
} else if (mode === 'file') {
  out(await judgeSfx(flag('as'), rest[0]));
} else if (mode === 'compare') {
  out(await compare(rest[0], rest[1].split(',')));
} else if (mode === 'calibrate') {
  // judge.mjs calibrate --model=<m>: three known answers in one request; a model that misses any is not used
  const known = { finalLap: /brass|fanfare|trumpet|bugle/i, airHorn: /horn/i, crabClack: /click|clack|clip|snap|claw|pincer/i };
  const items = Object.keys(known).map((id) => ({ id, path: `${ROOT}public/audio/sfx/${fileFor(id)}` }));
  const rs = await judgeBatch(items);
  for (const r of rs) out({ ...r, knownAnswer: known[r.id].test(r.heard ?? '') });
  console.error(rs.every((r) => known[r.id].test(r.heard ?? '')) ? 'calibration: PASS' : 'calibration: FAIL (do not use this model for judging)');
} else if (mode === 'songset') {
  // judge.mjs songset <song> <start.wav,middle.wav,seam.wav>: the three excerpts in one request
  for (const r of await judgeSongSet(rest[0], rest[1].split(','))) out(r);
} else if (mode === 'song') {
  out(await judgeSong(rest[0], flag('as'), flag('part', 'start')));
} else if (mode === 'voices') {
  out(await voices(rest[0], Number(flag('from', '0'))));
} else {
  console.error('usage: judge.mjs sfx [id ...] | file <path> --as=<id> | compare <id> <paths> | song <path> --as=<song> --part=<start|middle|seam> | voices <excerpt.wav> [--from=<s>]');
  process.exit(1);
}
console.error(`gemini ledger: $${spent().toFixed(3)} spent in all (${LEDGER})`);
