// Makes the game's sounds and songs with ElevenLabs and writes public/audio/manifest.json.
// The API key comes from .env.local (scripts/set-elevenlabs-key.sh) and is never printed.
//
//   node scripts/elevenlabs/generate.ts --credits      how many credits are left
//   node scripts/elevenlabs/generate.ts --list         what exists and what is missing
//   node scripts/elevenlabs/generate.ts sfx            make every missing sound effect and loop
//   node scripts/elevenlabs/generate.ts music          make every missing song
//   node scripts/elevenlabs/generate.ts go title       make just these ids
//   add --force to remake files that already exist, --budget=N to cap the credits one run may spend
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileFor, SFX, SONGS, type SfxSpec, type SongSpec } from './catalog.ts';

const ROOT = new URL('../../', import.meta.url);
const OUT = new URL('public/audio/', ROOT);
const API = 'https://api.elevenlabs.io';
/** stop before the account runs this low, so the month is never emptied by one run */
const CREDIT_FLOOR = 2000;
const MUSIC_MODELS = ['music_v2_5', 'music_v1'];

const args = process.argv.slice(2);
const force = args.includes('--force');
const words = args.filter((a) => !a.startsWith('--'));
/** the most credits one run may spend (each response says what it cost) */
const budget = Number(args.find((a) => a.startsWith('--budget='))?.slice(9) ?? 12000);
let spent = 0;
const charge = (r: Response): number => { const c = Number(r.headers.get('character-cost') ?? 0); spent += c; return c; };

async function apiKey(): Promise<string> {
  const env = await readFile(new URL('.env.local', ROOT), 'utf8').catch(() => '');
  const m = /^ELEVENLABS_API_KEY=(.+)$/m.exec(env);
  if (!m || !m[1].trim()) {
    console.error('No ELEVENLABS_API_KEY in .env.local. Run: bash scripts/set-elevenlabs-key.sh');
    process.exit(1);
  }
  return m[1].trim();
}

/** Credits left this month, or null when the key may not read the account. */
async function credits(key: string): Promise<{ left: number; limit: number; resetsAt: string } | null> {
  const r = await fetch(`${API}/v1/user/subscription`, { headers: { 'xi-api-key': key } });
  if (!r.ok) return null;
  const s = (await r.json()) as { character_count: number; character_limit: number; next_character_count_reset_unix?: number };
  const reset = s.next_character_count_reset_unix ? new Date(s.next_character_count_reset_unix * 1000).toISOString().slice(0, 10) : '?';
  return { left: s.character_limit - s.character_count, limit: s.character_limit, resetsAt: reset };
}

const sfxPath = (s: SfxSpec) => new URL(`sfx/${fileFor(s.id)}`, OUT);
const songPath = (s: SongSpec) => new URL(`music/${fileFor(s.id)}`, OUT);

/** The API's own words on failure: status and message, never the request headers. */
async function failure(r: Response): Promise<string> {
  const body = await r.text().catch(() => '');
  let msg = body.slice(0, 300);
  try {
    const j = JSON.parse(body) as { detail?: { message?: string; status?: string } | string };
    msg = typeof j.detail === 'string' ? j.detail : j.detail?.message ?? j.detail?.status ?? msg;
  } catch { /* not JSON */ }
  return `${r.status} ${msg}`;
}

async function post(key: string, path: string, body: unknown): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    });
    // busy or rate limited: wait and try again, a few times
    if ((r.status === 429 || r.status >= 500) && attempt < 4) {
      await r.body?.cancel();
      await new Promise((ok) => setTimeout(ok, 2000 * 2 ** attempt));
      continue;
    }
    return r;
  }
}

async function save(url: URL, r: Response): Promise<number> {
  const bytes = new Uint8Array(await r.arrayBuffer());
  await mkdir(new URL('./', url), { recursive: true });
  // write then rename: a stopped run never leaves half a file that looks finished
  const tmp = new URL(`${url.href}.part`);
  await writeFile(tmp, bytes);
  await rename(tmp, url);
  return bytes.length;
}

async function makeSfx(key: string, s: SfxSpec): Promise<string> {
  const r = await post(key, '/v1/sound-generation?output_format=mp3_44100_128', {
    text: s.prompt, duration_seconds: s.seconds, prompt_influence: s.influence ?? 0.35, loop: s.loop ?? false, model_id: 'eleven_text_to_sound_v2',
  });
  if (!r.ok) return `FAILED ${await failure(r)}`;
  const cost = charge(r);
  return `${Math.round((await save(sfxPath(s), r)) / 1024)} KB, ${cost} credits`;
}

let musicModel = 0;
async function makeSong(key: string, s: SongSpec): Promise<string> {
  for (;;) {
    const r = await post(key, '/v1/music?output_format=mp3_44100_128', {
      prompt: s.prompt, music_length_ms: s.seconds * 1000, model_id: MUSIC_MODELS[musicModel], force_instrumental: true,
    });
    if (r.ok) { const cost = charge(r); return `${Math.round((await save(songPath(s), r)) / 1024)} KB, ${cost} credits (${MUSIC_MODELS[musicModel]})`; }
    const why = await failure(r);
    // an unknown or locked model: fall back to the older one once
    if ((r.status === 400 || r.status === 403 || r.status === 422) && /model/i.test(why) && musicModel < MUSIC_MODELS.length - 1) { musicModel++; continue; }
    return `FAILED ${why}`;
  }
}

/** The runtime's list: only files that exist, so the game never asks for a missing one. */
async function writeManifest(): Promise<void> {
  const sfx: Record<string, { url: string; loop?: true }> = {};
  for (const s of SFX) if (existsSync(sfxPath(s))) sfx[s.id] = s.loop ? { url: `audio/sfx/${fileFor(s.id)}`, loop: true } : { url: `audio/sfx/${fileFor(s.id)}` };
  const music: Record<string, { url: string; bpm: number }> = {};
  for (const s of SONGS) if (existsSync(songPath(s))) music[s.id] = { url: `audio/music/${fileFor(s.id)}`, bpm: s.bpm };
  await mkdir(OUT, { recursive: true });
  await writeFile(new URL('manifest.json', OUT), `${JSON.stringify({ sfx, music }, null, 1)}\n`);
  console.log(`manifest: ${Object.keys(sfx).length}/${SFX.length} sounds, ${Object.keys(music).length}/${SONGS.length} songs`);
}

async function main(): Promise<void> {
  if (args.includes('--list')) {
    for (const s of SFX) console.log(`${existsSync(sfxPath(s)) ? 'have' : '----'}  sfx    ${s.id}`);
    for (const s of SONGS) console.log(`${existsSync(songPath(s)) ? 'have' : '----'}  music  ${s.id}`);
    return;
  }
  const key = await apiKey();
  const before = await credits(key);
  if (args.includes('--credits')) {
    console.log(before ? `credits left: ${before.left} of ${before.limit} (resets ${before.resetsAt})` : 'credits: this key may not read the account (that is fine for making sounds)');
    return;
  }
  if (words.length === 0) {
    await writeManifest();
    return;
  }
  const wantAll = (kind: string) => words.includes(kind);
  const sfxJobs = SFX.filter((s) => (wantAll('sfx') || words.includes(s.id)) && (force || !existsSync(sfxPath(s))));
  const songJobs = SONGS.filter((s) => (wantAll('music') || words.includes(s.id)) && (force || !existsSync(songPath(s))));
  console.log(`to make: ${sfxJobs.length} sounds, ${songJobs.length} songs${before ? ` · credits left ${before.left}` : ''}`);

  let left = before?.left ?? Infinity;
  const guard = async (): Promise<boolean> => {
    const c = await credits(key);
    if (c) left = c.left;
    if (left < CREDIT_FLOOR) { console.log(`stopping: only ${left} credits left (floor ${CREDIT_FLOOR})`); return false; }
    if (spent >= budget) { console.log(`stopping: this run spent ${spent} credits (budget ${budget})`); return false; }
    return true;
  };

  // sound effects two at a time; songs one at a time (long requests)
  for (let i = 0; i < sfxJobs.length; i += 2) {
    if (!(await guard())) break;
    const batch = sfxJobs.slice(i, i + 2);
    const results = await Promise.all(batch.map((s) => makeSfx(key, s)));
    batch.forEach((s, k) => console.log(`sfx    ${s.id.padEnd(16)} ${results[k]}`));
  }
  for (const s of songJobs) {
    if (!(await guard())) break;
    console.log(`music  ${s.id.padEnd(16)} ${await makeSong(key, s)}`);
  }
  const after = await credits(key);
  console.log(`credits spent this run: ${spent}${after ? ` · left: ${after.left}` : ''}`);
  await writeManifest();
}

await main();
