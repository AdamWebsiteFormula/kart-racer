// Fresh-eyes review of the game in motion: records a real-time clip of a race in silent headless Chrome
// (the WebGL canvas only, so no HUD) and asks Gemini to critique it against Mario Kart World.
//   node scripts/headless/review.mjs 'harbour-loop,canyon-rush' [--secs=20] [--fps=8] [--url=http://localhost:5173/] [--out=dir] [--model=gemini-pro-latest] [--ask="..."] [--final]
// --final records from a few seconds before the leader starts the last lap, through the Final Lap Shift.
// Needs the dev server (the `kart` console helper) and GEMINI_API_KEY in .env.local (scripts/set-gemini-key.sh).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const tracks = args.find((a) => !a.startsWith('--')).split(',');
const secs = Number(flag('secs', '20'));
const out = flag('out', join(tmpdir(), 'rascal-review'));
const model = flag('model', 'gemini-pro-latest');
const ASK = `You are a senior art director and game designer who knows Mario Kart World (2025) deeply. This is a ${secs} s real-time clip of an ORIGINAL cartoon kart racer (not a Nintendo game; the player's kart is driven by an autopilot, the HUD is not shown). Critique it against Mario Kart World's standard: sense of speed, chase camera feel, kart weight and animation, drift sparks and boost effects, environment density and far scenery, readability of the road ahead, visual clutter, color and lighting, and anything that looks broken, glitchy or cheap. List the 6 most important issues, most important first, each with a timestamp, what is wrong, and a concrete fix. Then list up to 3 things that already look Mario Kart World-grade. Be specific and brief.`;
const ask = flag('ask', ASK);
mkdirSync(out, { recursive: true });

const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) { console.error('No GEMINI_API_KEY in .env.local. Run: bash scripts/set-gemini-key.sh'); process.exit(1); }

/** Records `secs` of a race on `track` (past the countdown, autopilot on) and returns the WebM bytes. */
async function record(c, track) {
  const b64 = await c.eval(`(async () => {
    kart.race('${track}', 'pip'); kart.autopilot(true);
    // a breath between steps: the race waits at its countdown until the warm-up (shaders, sky) is done, and that needs the page's own turns
    const breathe = () => new Promise((r) => setTimeout(r, 0));
    for (let n = 0; n < 400; n++) { if (kart.ui.paused) kart.ui.dispatch({ type: 'resume' }); kart.step(30); await breathe(); if (kart.session.state.phase !== 'countdown') break; }
    kart.step(120); // a couple of seconds into the race: the pack has spread a little
    // --final: on to a few seconds before the leader starts the last lap (the Final Lap Shift fires then)
    for (let n = 0; ${args.includes('--final')} && n < 4000; n++) {
      if (kart.ui.paused) kart.ui.dispatch({ type: 'resume' });
      const S = kart.session, L = S.state.karts[S.leader()];
      if (L.lap >= S.state.lapsTotal || (L.lap === S.state.lapsTotal - 1 && L.t > 0.92)) break;
      kart.step(30); await breathe();
    }
    const canvas = document.querySelector('canvas');
    const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 5e6 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => (rec.onstop = r));
    rec.start(1000);
    await new Promise((r) => setTimeout(r, ${secs * 1000}));
    rec.stop(); await stopped;
    const bytes = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  })()`);
  return Buffer.from(b64, 'base64');
}

/** The clip through each model in `--model` (comma-separated) in turn: a busy (503) or limited (429) model is retried, then the next is tried. */
async function critique(video) {
  // Gemini samples video at 1 frame a second unless told otherwise: a 0.1 s boost punch falls between frames
  const fps = Number(flag('fps', '8'));
  const body = JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: 'video/webm', data: video.toString('base64') }, video_metadata: { fps } }, { text: ask }] }], generationConfig: { temperature: 0.3 } });
  let last = '';
  for (const m of model.split(',')) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return `(${m}) ${j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() || '(no answer)'}`;
      last = `${m} ${r.status}: ${j.error?.message?.slice(0, 160) ?? ''}`;
      if (r.status !== 503 && r.status !== 429) break;
      await new Promise((res) => setTimeout(res, 10000 * (attempt + 1)));
    }
  }
  return `error: ${last}`;
}

const c = await openChrome({ width: 1280, height: 720 });
try {
  await c.goto(flag('url', 'http://localhost:5173/'));
  for (const track of tracks) {
    // --reuse: critique the clip recorded last time for this track instead of recording again
    const file = join(out, `${track}.webm`);
    const video = args.includes('--reuse') ? readFileSync(file) : await record(c, track);
    writeFileSync(file, video);
    const text = await critique(video);
    writeFileSync(join(out, `${track}.md`), text);
    console.log(`== ${track} (${(video.length / 1e6).toFixed(1)} MB, ${file})\n${text}\n`);
  }
} finally { await c.close(); }
