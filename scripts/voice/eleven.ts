// The ElevenLabs route for the racers' voices: Voice Design v3 makes each racer's voice from a
// description, the judge picks one of its previews, and Eleven v3 speaks every line in it. Nothing is
// played; the key comes from .env.local and is never printed. The key needs the Text to Speech and
// Voices (write) permissions (Developers → API Keys → edit the key).
//   node scripts/voice/eleven.ts check                         which permissions the key has
//   node scripts/voice/eleven.ts design <racer> [--seed=n]     three previews → ~/.cache/rascal-voice/design/<racer>-s<seed>-p<k>.mp3 (+ .json)
//   node scripts/voice/eleven.ts save <racer> <generated_voice_id>   add that voice to the account; its id goes in eleven-voices.json
//   node scripts/voice/eleven.ts speak [--only=pip,gus] [--takes=2]   every line in the saved voices → ~/.cache/rascal-voice/takes-el/<key>-t<k>.wav
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { allLines, CAST } from './catalog.ts';
import type { Bark } from '../../src/audio/types.ts';

const API = 'https://api.elevenlabs.io';
const HOME = `${homedir()}/.cache/rascal-voice`;
const VOICES = new URL('./eleven-voices.json', import.meta.url);
const args = process.argv.slice(2);
const flag = (name: string, dflt?: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const words = args.filter((a) => !a.startsWith('--'));
const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const key = /^ELEVENLABS_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) { console.error('No ELEVENLABS_API_KEY in .env.local. Run: bash scripts/set-elevenlabs-key.sh'); process.exit(1); }
const headers = { 'xi-api-key': key, 'Content-Type': 'application/json' };

/**
 * Each racer's voice, described for Voice Design (20-1000 characters). Every one is asked to be an
 * original voice: the Gemini takes of Pip were heard as a famous kart racer's mushroom character (26
 * Sept 2026), so no squeak, no nasal chipmunk, nothing that imitates a known character or person.
 */
export const DESIGN: Readonly<Record<string, string>> = {
  pip: 'An original cartoon voice for Pip, a tiny hyperactive hummingbird courier (male) in a family kart-racing game. A light, bright, boyish young tenor with a slight rasp, very fast and breathless, upbeat, clear General American accent. Not squeaky, not nasal, not a chipmunk and not like any famous cartoon character. Crisp studio recording.',
  momo: 'An original cartoon voice for Momo, a cool cat mechanic (female adult) in a family kart-racing game. Low-medium pitch, dry, deadpan and unhurried, a little smug, with a soft purr in the tone. Clear General American accent, crisp studio recording.',
  nova: 'An original cartoon voice for Nova, a dreamy moth astronaut (young woman) in a family kart-racing game. Soft, airy and wonder-struck, gently breathy, a little spacey and slow, sweet and warm, medium-high pitch. Clear General American accent, crisp studio recording.',
  juniper: 'An original cartoon voice for Juniper, a cheerful fox park ranger (young woman) in a family kart-racing game. Bright, upbeat and energetic, a friendly rule-follower with a fierce competitive streak, medium-high pitch. Clear General American accent, crisp studio recording.',
  otto: 'An original cartoon voice for Otto, a laid-back otter lifeguard (young man) in a family kart-racing game. Relaxed and sunny, an easygoing surfer drawl, warm and friendly, medium pitch. West Coast American accent, crisp studio recording.',
  sprocket: 'An original cartoon voice for Sprocket, a cheerful wind-up tin toy robot in a family kart-racing game. Precise, clipped and literal, with a light metallic, mechanical buzz in the tone, medium pitch, friendly and upbeat. Clear, crisp studio recording.',
  boulder: 'An original cartoon voice for Boulder, a big round friendly rock golem (male) in a family kart-racing game. Very deep, slow, warm and rumbly, soft-spoken and kind, a gentle giant who apologizes a lot. Clear General American accent, crisp studio recording.',
  gus: 'An original cartoon voice for Big Gus, a huge jolly walrus chef (male) in a family kart-racing game. Deep, booming, warm and hearty with a rich belly laugh, generous and loud, a hint of gravel. Clear General American accent, crisp studio recording.',
};

/** The delivery tag Eleven v3 reads before each line, by moment (Momo stays deadpan: her tag wins). */
const TAG: Readonly<Record<Bark, string>> = {
  select: '[excited]', start: '[excited]', boost: '[excited]', trick: '[shouting]', hitRival: '[mischievously]', overtake: '[playfully]',
  hit: '[surprised]', win: '[excited]', good: '[happy]', lose: '[sighs]', lap: '[proudly]', sorry: '[sheepishly]',
};
const OWN_TAG: Readonly<Record<string, Partial<Record<Bark, string>>>> = {
  momo: { select: '[deadpan]', start: '[deadpan]', boost: '[deadpan]', trick: '[deadpan]', hitRival: '[deadpan]', overtake: '[deadpan]', win: '[deadpan]', good: '[deadpan]', hit: '[annoyed]' },
  nova: { trick: '[dreamy]', overtake: '[dreamy]', good: '[dreamy]' },
};

function wav(pcm: Buffer, rate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
const saved = (): Record<string, string> => (existsSync(VOICES) ? JSON.parse(readFileSync(VOICES, 'utf8')) : {});

async function check(): Promise<void> {
  const probes: [string, string, RequestInit][] = [
    ['User (read)', '/v1/user/subscription', {}],
    ['Voices (read)', '/v1/voices?page_size=1', {}],
    ['Text to Speech', '/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_22050_32', { method: 'POST', body: JSON.stringify({ text: 'Hi', model_id: 'eleven_flash_v2_5' }) }],
  ];
  for (const [name, path, init] of probes) {
    const r = await fetch(`${API}${path}`, { headers, ...init });
    const t = r.ok ? '' : (await r.text()).slice(0, 160);
    console.log(`${name.padEnd(16)} ${r.ok ? 'yes' : `no (${r.status}) ${/missing the permission (\w+)/.exec(t)?.[1] ?? t}`}`);
    if (r.ok && path.includes('subscription')) {
      const s = await r.json();
      console.log(`  plan ${s.tier}: ${s.character_limit - s.character_count} credits left of ${s.character_limit}; voices ${s.voice_slots_used ?? '?'} of ${s.voice_limit}`);
    }
  }
}

async function design(racer: string): Promise<void> {
  const seed = Number(flag('seed', String(Math.floor(Math.random() * 1e6))));
  const c = CAST[racer];
  // the preview says the racer's own lines, so the judge hears the voice doing the job
  let text = Object.values(c.lines).flat().join(' ');
  if (text.length > 900) text = text.slice(0, text.lastIndexOf(' ', 900));
  const r = await fetch(`${API}/v1/text-to-voice/design`, { method: 'POST', headers, body: JSON.stringify({ voice_description: DESIGN[racer], model_id: 'eleven_ttv_v3', text, seed, guidance_scale: 5, loudness: 0.5 }) });
  if (!r.ok) { console.error(`design ${racer}: ${r.status} ${(await r.text()).slice(0, 300)}`); process.exit(1); }
  const j = await r.json();
  mkdirSync(`${HOME}/design`, { recursive: true });
  (j.previews as { audio_base_64: string; generated_voice_id: string; duration_secs: number }[]).forEach((p, k) => {
    const base = `${HOME}/design/${racer}-s${seed}-p${k + 1}`;
    writeFileSync(`${base}.mp3`, Buffer.from(p.audio_base_64, 'base64'));
    writeFileSync(`${base}.json`, JSON.stringify({ racer, seed, generated_voice_id: p.generated_voice_id, seconds: p.duration_secs, description: DESIGN[racer], text }, null, 1));
    console.log(`${base}.mp3  ${p.duration_secs?.toFixed?.(1) ?? '?'} s  ${p.generated_voice_id}`);
  });
}

async function save(racer: string, generated: string): Promise<void> {
  const r = await fetch(`${API}/v1/text-to-voice`, { method: 'POST', headers, body: JSON.stringify({ voice_name: `Rascal Rally: ${CAST[racer].name}`, voice_description: DESIGN[racer], generated_voice_id: generated }) });
  if (!r.ok) { console.error(`save ${racer}: ${r.status} ${(await r.text()).slice(0, 300)}`); process.exit(1); }
  const v = await r.json();
  const all = saved();
  all[racer] = v.voice_id;
  writeFileSync(VOICES, `${JSON.stringify(all, null, 2)}\n`);
  console.log(`${racer}: voice ${v.voice_id} saved`);
}

async function speak(): Promise<void> {
  const voices = saved();
  const only = flag('only')?.split(',');
  const takes = Number(flag('takes', '2'));
  const out = `${HOME}/takes-el`;
  mkdirSync(out, { recursive: true });
  let made = 0;
  for (const l of allLines()) {
    if (!voices[l.racerId] || (only && !only.includes(l.racerId))) continue;
    for (let k = 1; k <= takes; k++) {
      const file = `${out}/${l.key}-t${k}.wav`;
      if (existsSync(file)) continue;
      const tag = OWN_TAG[l.racerId]?.[l.bark] ?? TAG[l.bark];
      // take 1 natural, take 2 creative (Eleven v3's stability steps: 0 creative, 0.5 natural, 1 robust)
      const body = { text: `${tag} ${l.line}`, model_id: 'eleven_v3', voice_settings: { stability: k === 1 ? 0.5 : 0 } };
      const r = await fetch(`${API}/v1/text-to-speech/${voices[l.racerId]}?output_format=pcm_24000`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!r.ok) { console.error(`${l.key} t${k}: ${r.status} ${(await r.text()).slice(0, 200)}`); if (r.status === 401 || r.status === 402) process.exit(1); continue; }
      writeFileSync(file, wav(Buffer.from(await r.arrayBuffer()), 24000));
      made++;
      console.log(`${l.key} t${k}  "${l.line}"`);
    }
  }
  console.log(`made ${made} takes (${out})`);
}

const [cmd, a, b] = words;
if (cmd === 'check') await check();
else if (cmd === 'design' && CAST[a]) await design(a);
else if (cmd === 'save' && CAST[a] && b) await save(a, b);
else if (cmd === 'speak') await speak();
else { console.error('usage: check | design <racer> [--seed=n] | save <racer> <generated_voice_id> | speak [--only=..] [--takes=2]'); process.exit(1); }
