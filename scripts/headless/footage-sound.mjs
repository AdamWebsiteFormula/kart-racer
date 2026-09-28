// The sound of a public video of another game (YouTube), measured and never played: silent headless Chrome
// (--mute-audio), the embed's <video> routed into an AudioContext whose graph ends in an AnalyserNode and never
// reaches the output, so nothing can be heard however it is set. Every ~45 ms of video: its level (dBFS RMS) and a
// log-frequency spectrum (72 bands, 60 Hz to 12 kHz); nothing but these numbers is kept. For telling when a game's
// music plays, stops and starts (docs/sops/audio.md, 28 Sept 2026: Mario Kart World from the pick to the GO):
// harmonic lines are music or voices, evenly spaced short tones are a countdown, broadband noise engines.
//   node scripts/headless/footage-sound.mjs <youtube-id> <from-seconds> <to-seconds> <out.json>
// Its stills: scripts/headless/frames.mjs. Draw the bands as a picture to read them (hot = loud).
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sleep } from './cdp.mjs';

const [id, fromS, toS, outFile] = process.argv.slice(2);
if (!outFile) throw new Error('usage: footage-sound.mjs <youtube-id> <from-seconds> <to-seconds> <out.json>');
const from = Number(fromS), to = Number(toS);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const w = 640, h = 360;
// the official embed on a page served here (YouTube will not play an embed opened on its own), muted to start
const page = `<!doctype html><html><head><meta name="referrer" content="strict-origin-when-cross-origin"></head><body style="margin:0;background:#000"><div id="p"></div>
<script>window.ready = false;
function onYouTubeIframeAPIReady() { window.player = new YT.Player('p', { width: ${w}, height: ${h}, videoId: ${JSON.stringify(id)},
  playerVars: { autoplay: 1, mute: 1, controls: 0, rel: 0, playsinline: 1, start: ${Math.floor(from)}, iv_load_policy: 3, disablekb: 1, fs: 0 },
  events: { onReady: (e) => { e.target.mute(); e.target.playVideo(); window.ready = true; } } }); }
</script><script src="https://www.youtube.com/iframe_api"></script></body></html>`;
const server = createServer((_, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(page); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));

// its own throwaway profile; the embed kept in the page's process (no site isolation), so its video can be reached
const profile = mkdtempSync(join(tmpdir(), 'rascal-footage-'));
const args = ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--disable-site-isolation-trials',
  '--disable-features=IsolateOrigins,site-per-process', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${w},${h}`, '--no-first-run', '--no-default-browser-check'];
const proc = spawn(CHROME, [...args, 'about:blank'], { stdio: 'ignore' });
process.once('exit', () => { try { proc.kill(); } catch { /* gone */ } });
let target, port = 0;
for (let i = 0; i < 75 && !target; i++) {
  await sleep(200);
  try {
    port ||= Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]) || 0;
    if (port) target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
  } catch { /* not up yet */ }
}
if (!target) { proc.kill(); throw new Error('headless Chrome did not start'); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let n = 0;
const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); if (d.error) p.rej(new Error(d.error.message)); else p.res(d.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++n; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalIn = async (expr, contextId) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, ...(contextId ? { contextId } : {}) });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: `http://localhost:${server.address().port}/` });
  for (let i = 0; i < 40 && !(await evalIn('window.ready')); i++) await sleep(500);
  if (!(await evalIn('window.ready'))) throw new Error('the player did not load');
  await sleep(2500);
  const tree = await send('Page.getFrameTree');
  const frame = (tree.frameTree.childFrames ?? []).find((f) => f.frame.url.includes('youtube.com/embed'));
  if (!frame) throw new Error('no embed frame');
  const { executionContextId: cx } = await send('Page.createIsolatedWorld', { frameId: frame.frame.id, worldName: 'measure' });
  // the video's sound into an analyser and nowhere else: never connected to the context's destination
  const setup = await evalIn(`(async () => {
    const v = document.querySelector('video');
    if (!v) return 'no video';
    const ac = new AudioContext({ sampleRate: 48000 });
    const an = ac.createAnalyser();
    an.fftSize = 4096; an.smoothingTimeConstant = 0;
    ac.createMediaElementSource(v).connect(an);
    await ac.resume();
    window.__m = { ac, an, v, spec: new Float32Array(an.frequencyBinCount), td: new Float32Array(an.fftSize) };
    return ac.state;
  })()`, cx);
  // never unmuted unless the video is already routed into the analyser alone
  if (setup !== 'running') throw new Error(`no analyser: ${setup}`);
  await evalIn(`(async () => { const p = window.player; p.seekTo(${from}, true); p.unMute(); p.setVolume(100); p.playVideo(); await new Promise((r) => setTimeout(r, 1500)); return p.getCurrentTime(); })()`);
  const B = 72, lo = 60, hi = 12000, edges = Array.from({ length: B + 1 }, (_, i) => lo * Math.pow(hi / lo, i / B));
  const rows = [];
  const t0 = Date.now();
  while (Date.now() - t0 < (to - from + 8) * 1000) {
    const r = await evalIn(`(() => { const m = window.__m;
      m.an.getFloatFrequencyData(m.spec); m.an.getFloatTimeDomainData(m.td);
      let s = 0; for (const x of m.td) s += x * x;
      const edges = ${JSON.stringify(edges)}, hz = m.ac.sampleRate / m.an.fftSize, bands = [];
      for (let b = 0; b < edges.length - 1; b++) { let p = 0, c = 0; for (let k = Math.floor(edges[b] / hz); k <= Math.ceil(edges[b + 1] / hz); k++) { p += Math.pow(10, m.spec[k] / 10); c++; } bands.push(+(10 * Math.log10(p / Math.max(1, c) + 1e-12)).toFixed(1)); }
      return { t: +m.v.currentTime.toFixed(3), rms: +(20 * Math.log10(Math.sqrt(s / m.td.length) + 1e-9)).toFixed(1), bands }; })()`, cx);
    if (!rows.length || r.t !== rows.at(-1).t) rows.push(r);
    if (r.t >= to) break;
    await sleep(40);
  }
  writeFileSync(outFile, JSON.stringify({ id, from, to, edges, rows }));
  // a line a second: the level, loudest and mean
  for (let s = Math.floor(from); s < to; s++) {
    const rs = rows.filter((r) => r.t >= s && r.t < s + 1);
    if (rs.length) console.log(`${s}s  mean ${(rs.reduce((a, r) => a + r.rms, 0) / rs.length).toFixed(1)} dBFS  max ${Math.max(...rs.map((r) => r.rms)).toFixed(1)}`);
  }
} finally {
  try { ws.close(); } catch { /* gone */ }
  proc.kill();
  await sleep(800);
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  server.close();
}
