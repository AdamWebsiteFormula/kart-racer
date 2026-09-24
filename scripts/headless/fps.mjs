// Frame times of a real race in silent headless Chrome (real GPU).
//   node scripts/headless/fps.mjs [url] [--cpu=4] [--size=1920x1080@1] [--uncapped] [--frames=1200]
// Starts a Quick Race from the title with Enter, holds the throttle, and measures requestAnimationFrame gaps.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openChrome, sleep } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? dflt;
const url = args.find((a) => !a.startsWith('--')) ?? 'https://adamwebsiteformula.github.io/kart-racer/';
const [wh, dpr] = flag('size', '1920x1080@1').split('@');
const [width, height] = wh.split('x').map(Number);
const cpu = Number(flag('cpu', '1')), frames = Number(flag('frames', '1200'));
const c = await openChrome({ width, height, dpr: Number(dpr ?? 1), uncapped: args.includes('--uncapped') });
try {
  await c.goto(url, 6000);
  for (let i = 0; i < 4; i++) { await c.key('Enter', 'Enter', 13); await sleep(900); } // title → mode → racer → track
  if (cpu > 1) await c.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sleep(5000); // past the countdown
  const r = await c.eval(`new Promise((res) => { const ft = []; let last = performance.now();
    const f = (t) => { ft.push(t - last); last = t; if (ft.length < ${frames}) requestAnimationFrame(f); else res(ft); }; requestAnimationFrame(f); })
    .then((ft) => { const a = ft.slice(10).sort((x, y) => x - y), n = a.length, avg = a.reduce((s, x) => s + x, 0) / n;
      const gl = document.createElement('canvas').getContext('webgl2'), e = gl.getExtension('WEBGL_debug_renderer_info');
      return { gpu: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?', fps: +(1000 / avg).toFixed(1), p50: +a[n >> 1].toFixed(2),
        p95: +a[Math.floor(n * 0.95)].toFixed(2), p99: +a[Math.floor(n * 0.99)].toFixed(2), max: +a[n - 1].toFixed(1), over20ms: a.filter((x) => x > 20).length, frames: n }; })`);
  const shot = join(tmpdir(), `rascal-fps-${width}x${height}.jpg`);
  writeFileSync(shot, await c.jpeg());
  console.log(JSON.stringify({ url, size: `${width}x${height}@${dpr ?? 1}`, cpu, uncapped: args.includes('--uncapped'), ...r, shot }));
} finally { await c.close(); }
