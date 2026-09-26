// Black-frame hunt in silent headless Chrome (--mute-audio, ?mute): a real race per track with the AI
// driving the player (kart.autopilot, dev only) and the chase camera. Every frame the post chain's
// half-float scene render (before bloom) is read back and its NaN/Inf pixels counted, and the canvas is
// sampled for black. One NaN pixel is enough to black out a whole frame through bloom's blur (26 Sept
// 2026: zero-length normals on prop models). For the first bad pixel on a track it names what a ray
// through it hits. The scan slows frames, so the Auto governor is pinned (it would turn post off).
//   node scripts/headless/nan-scan.mjs [url] [--seconds=25] [--tracks=harbour-loop,meadow-run]
import { openChrome, sleep } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? dflt;
const url = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:5173/';
const seconds = Number(flag('seconds', '25'));
const tracks = flag('tracks', 'harbour-loop,meadow-run,canyon-rush,frostbite-pass,boardwalk-nights,skyline-circuit').split(',');

const INSTALL = `(async () => {
  const r = kart.renderer, gl = r.getContext(), post = kart.post, comp = post.composer;
  const threeUrl = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\\/deps\\/three\\.js/.test(n));
  const T = await import(threeUrl);
  const ep = comp.passes[1], orig = ep.render.bind(ep), log = window.__nan = [];
  let buf = null;
  const px = new Uint8Array(4);
  ep.render = function (renderer, input, output, dt, st) {
    let rec = null;
    if (window.__scan) {
      const w = input.width, h = input.height;
      if (!buf || buf.length !== w * h * 4) buf = new Float32Array(w * h * 4);
      const prev = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, r.properties.get(input).__webglFramebuffer);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, buf);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prev);
      let bad = 0, first = null;
      for (let i = 0, n = w * h; i < n; i++) {
        if (Number.isFinite(buf[i * 4]) && Number.isFinite(buf[i * 4 + 1]) && Number.isFinite(buf[i * 4 + 2])) continue;
        if (!bad++) first = { x: i % w, y: (i / w) | 0 };
      }
      rec = { bad, first, w, h };
      if (bad && !window.__named) {
        window.__named = true;
        const rc = new T.Raycaster();
        rc.setFromCamera(new T.Vector2((first.x + 0.5) / w * 2 - 1, (first.y + 0.5) / h * 2 - 1), post.camera);
        rec.hits = rc.intersectObjects(post.scene.children, true).filter((i) => i.distance > 0.05).slice(0, 3).map((i) => (i.object.name || i.object.type) + ' ' + i.distance.toFixed(1) + ' m');
      }
    }
    const res = orig(renderer, input, output, dt, st);
    if (rec) {
      // the final output: an 8 x 8 grid of single pixels from the drawing buffer
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, prev = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      let sum = 0;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { gl.readPixels(((i + 0.5) / 8 * W) | 0, ((j + 0.5) / 8 * H) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); sum += px[0] + px[1] + px[2]; }
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prev);
      rec.black = sum / 192 < 8;
      log.push(rec);
    }
    return res;
  };
})()`;

const c = await openChrome({ width: 1600, height: 900, dpr: 1 });
let total = 0;
try {
  await c.goto(url);
  await c.eval('(() => { const g = kart.governor; g.sample = () => false; g.newRace = () => false; })()');
  let installed = false;
  for (const t of tracks) {
    await c.eval(`kart.race('${t}', 'pip'); kart.autopilot(true)`);
    await sleep(1500);
    if (!installed) { await c.eval(INSTALL); installed = true; }
    await c.eval('window.__nan.length = 0; window.__named = false; window.__scan = true');
    await sleep(seconds * 1000);
    await c.eval('window.__scan = false');
    const log = await c.eval('window.__nan');
    const bad = log.filter((r) => r.bad), black = log.filter((r) => r.black), named = log.find((r) => r.hits);
    total += bad.length + black.length;
    console.log(`${t.padEnd(17)} frames ${log.length}  NaN/Inf frames ${bad.length}  black frames ${black.length}${named ? `  first at [${named.first.x}, ${named.first.y}]: ${named.hits.join(' | ')}` : ''}`);
  }
  await c.eval('kart.autopilot(false)');
} finally { await c.close(); }
process.exitCode = total ? 1 : 0;
