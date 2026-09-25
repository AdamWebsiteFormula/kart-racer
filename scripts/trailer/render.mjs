// Renders the trailer from edl.json: shots → frames (ffmpeg), each output frame drawn by compositor.html in
// muted headless Chrome, then frames + soundtrack.wav → trailer.mp4 (ffmpeg). Nothing is played.
//   node render.mjs [--preview=30] (every 30th frame only, for a contact sheet) [--from=s --to=s]
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { openChrome } from '../headless/cdp.mjs';
import { tmpdir } from 'node:os';
const TRAILER_DIR = process.env.TRAILER_DIR ?? join(tmpdir(), 'rascal-trailer');

const DIR = TRAILER_DIR;
const FF = process.env.FFMPEG ?? 'ffmpeg';
const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const preview = Number(flag('preview', '0'));
const edl = JSON.parse(readFileSync(join(DIR, 'edl.json'), 'utf8'));
const fps = edl.fps;

// 1. each clip's frames, at the output rate and its own speed (cached by a key of its source, in, length, speed)
for (const c of edl.clips) {
  const dur = c.end - c.start, srcLen = dur * (c.speed ?? 1);
  c.frames = Math.round(dur * fps);
  const dir = join(DIR, 'frames', c.id), key = `${c.src}|${c.in}|${srcLen.toFixed(3)}|${c.speed ?? 1}`;
  const keyFile = join(dir, '.key');
  if (existsSync(keyFile) && readFileSync(keyFile, 'utf8') === key && readdirSync(dir).length >= c.frames) continue;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  // -ss and -t before -i: they cut the source, so a slowed clip is not cut short on the output side
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(c.in), '-t', srcLen.toFixed(3), '-i', join(DIR, 'shots', `${c.src}.mp4`),
    '-vf', `setpts=PTS/${c.speed ?? 1},fps=${fps},scale=1920:1080:flags=lanczos`, '-q:v', '2', join(dir, '%04d.jpg')]);
  writeFileSync(keyFile, key);
  const got = readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
  if (got < c.frames) console.log(`warn: ${c.id} has ${got} of ${c.frames} frames (the last is held)`);
  c.frames = Math.min(c.frames, got);
}
console.log('frames ready');

// 2. a small server for the compositor, its frames and the game's fonts
const FONTS = { '/fonts/lilita.woff2': new URL('../../node_modules/', import.meta.url).pathname + '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2',
  '/fonts/fredoka-600.woff2': new URL('../../node_modules/', import.meta.url).pathname + '@fontsource/fredoka/files/fredoka-latin-600-normal.woff2',
  '/fonts/fredoka-700.woff2': new URL('../../node_modules/', import.meta.url).pathname + '@fontsource/fredoka/files/fredoka-latin-700-normal.woff2' };
const TYPES = { '.html': 'text/html', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = FONTS[url] ?? join(DIR, url === '/' ? 'compositor.html' : url);
  if (!file.startsWith(DIR) && !FONTS[url]) { res.writeHead(403); res.end(); return; }
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));

// 3. every output frame
const total = Math.round(edl.duration * fps);
const from = Math.round(Number(flag('from', '0')) * fps), to = Math.min(total, Math.round(Number(flag('to', String(edl.duration))) * fps));
const OUT = join(DIR, preview ? 'preview' : 'out');
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
const c = await openChrome({ width: 1920, height: 1080 });
try {
  await c.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  await new Promise((r) => setTimeout(r, 1500));
  await c.eval(`window.setup(${JSON.stringify(edl)})`);
  const t0 = Date.now();
  for (let i = from; i < to; i += preview || 1) {
    const data = await c.eval(`window.renderFrame(${i})`);
    writeFileSync(join(OUT, `${String(preview ? i : i - from).padStart(5, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
    if (!preview && i % 300 === 0) console.log(`frame ${i}/${total} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally { await c.close(); server.close(); }
if (preview) { console.log(`preview frames in ${OUT}`); process.exit(0); }

// 4. encode, with the soundtrack if there is one
const wav = join(DIR, 'soundtrack.wav');
const enc = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', join(OUT, '%05d.jpg')];
if (existsSync(wav)) enc.push('-i', wav);
enc.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2');
if (existsSync(wav)) enc.push('-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest');
enc.push('-movflags', '+faststart', join(DIR, 'trailer.mp4'));
execFileSync(FF, enc, { stdio: 'inherit' });
console.log(`trailer.mp4 ${(statSync(join(DIR, 'trailer.mp4')).size / 1e6).toFixed(1)} MB`);
