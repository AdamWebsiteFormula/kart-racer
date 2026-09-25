// Still frames from a public video of another game (YouTube), in silent headless Chrome (--mute-audio,
// the player muted too), so we can look at Mario Kart World beside our own screens. Nothing is saved but
// the stills; nothing is heard. The video sits in the official embed on a page served here (YouTube will
// not play an embed opened on its own); the embed stands 90 px taller than the view at each edge, so the
// video fills the view and YouTube's own title and buttons, in its letterbox, are out of the picture.
//   node scripts/headless/frames.mjs <youtube-id> <seconds,seconds,...> [--out=dir] [--w=1600] [--h=900]
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openChrome, sleep } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const [id, list] = args.filter((a) => !a.startsWith('--'));
const times = list.split(',').map(Number);
const out = flag('out', join(tmpdir(), 'rascal-frames'));
const w = Number(flag('w', '1600')), h = Number(flag('h', '900'));
mkdirSync(out, { recursive: true });
const page = `<!doctype html><html><head><meta name="referrer" content="strict-origin-when-cross-origin"></head><body style="margin:0;background:#000;overflow:hidden"><div style="position:absolute;top:-90px;left:0"><div id="p"></div></div>
<script>window.ready = false;
function onYouTubeIframeAPIReady() { window.player = new YT.Player('p', { width: ${w}, height: ${h + 180}, videoId: ${JSON.stringify(id)},
  playerVars: { autoplay: 1, mute: 1, controls: 0, rel: 0, playsinline: 1, start: ${Math.floor(times[0])}, iv_load_policy: 3, disablekb: 1, fs: 0 },
  events: { onReady: (e) => { e.target.mute(); e.target.setPlaybackQuality && e.target.setPlaybackQuality('hd1080'); e.target.playVideo(); window.ready = true; } } }); }
</script><script src="https://www.youtube.com/iframe_api"></script></body></html>`;
const server = createServer((_, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(page); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const c = await openChrome({ width: w, height: h });
try {
  await c.send('Page.navigate', { url: `http://localhost:${server.address().port}/` });
  for (let i = 0; i < 40 && !(await c.eval('window.ready')); i++) await sleep(500);
  if (!(await c.eval('window.ready'))) throw new Error('the player did not load');
  await sleep(3000);
  for (const t of times) {
    const r = await c.eval(`(async () => { const p = window.player; p.mute(); p.seekTo(${t}, true); p.playVideo();
      for (let i = 0; i < 40; i++) { await new Promise((res) => setTimeout(res, 250)); if (p.getPlayerState() === 1 && p.getCurrentTime() >= ${t}) break; }
      await new Promise((res) => setTimeout(res, 1600));
      return { t: +p.getCurrentTime().toFixed(1), state: p.getPlayerState(), q: p.getPlaybackQuality && p.getPlaybackQuality() }; })()`);
    const file = join(out, `${id}-${String(t).padStart(5, '0')}.jpg`);
    writeFileSync(file, await c.jpeg(82));
    console.log(`${file} ${JSON.stringify(r)}`);
  }
} finally { await c.close(); server.close(); }
