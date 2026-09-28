// The title music from the start screen's press, timed without a sound (docs/sops/audio.md, 28 Sept 2026). Silent
// headless Chrome (cdp.mjs: --mute-audio, ?mute) on `?mute&standin`: a dev build's real sound on a stand-in context
// (src/audio/standIn.ts: plain objects, no Web Audio, nothing can be heard; a file "decodes" to silence of its length,
// so the song's analysis runs at its real cost). A cold cache every run, the line throttled like the load-speed sweep's
// Fast 4G (9 Mbps, 150 ms) unless --net=none. The start screen up, it waits `wait` seconds (a player looking at it),
// presses Enter (a real key), and reads kart.audioTrace until the title song starts. Prints, per run: the wait, whether
// the song's file was in hand at the press, press to the song's start (ms: to its start() call, plus how far ahead that
// booked it), and whether the synth stood in meanwhile.
//   node scripts/headless/title-song.mjs --url=http://127.0.0.1:5196/ [--waits=0.3,1,2,4] [--runs=3] [--net=fast4g|slow4g|none]
// The page must be a dev build (the `kart` hook): `npm run dev`, or `NODE_ENV=development vite build` served by `vite preview`.
import { openChrome, sleep } from './cdp.mjs';

process.setMaxListeners(0); // (each Chrome opened adds its own exit guards: one per run)
const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const url = new URL(flag('url', 'http://127.0.0.1:5173/'));
url.searchParams.set('standin', '');
const waits = flag('waits', '0.3,1,2,4').split(',').map(Number);
const runs = Number(flag('runs', '3'));
const NETS = {
  fast4g: { latency: 150, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 },
  slow4g: { latency: 300, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 },
  none: null,
};
const net = NETS[flag('net', 'fast4g')];

const rows = [];
for (const wait of waits) {
  for (let r = 0; r < runs; r++) {
    const c = await openChrome({ width: 1280, height: 720 });
    try {
      await c.send('Network.enable');
      await c.send('Network.setCacheDisabled', { cacheDisabled: true });
      if (net) await c.send('Network.emulateNetworkConditions', { offline: false, ...net });
      await c.goto(url.toString(), 0);
      const t0 = Date.now();
      // the start screen is up
      while (!(await c.eval(`!!(globalThis.kart && kart.ui.app.screen === 'title' && !kart.ui.app.pressed)`).catch(() => false))) {
        if (Date.now() - t0 > 90000) throw new Error('the title never came');
        await sleep(25);
      }
      const titleAt = await c.eval('performance.now()');
      // the wait on the start screen, noting when the title song's file is in hand
      let inHandAt = null;
      for (const until = Date.now() + wait * 1000; Date.now() < until; await sleep(25)) {
        if (inHandAt === null && (await c.eval('kart.audioTrace.titleInHand'))) inHandAt = (await c.eval('performance.now()')) - titleAt;
      }
      const inHand = await c.eval('kart.audioTrace.titleInHand');
      await c.key('Enter', 'Enter', 13);
      let tr, synth = false;
      for (let i = 0; i < 1500; i++) {
        tr = await c.eval('kart.audioTrace');
        if (tr.synth) synth = true;
        if (tr.songs.length) break;
        await sleep(10);
      }
      const song = tr.songs[0];
      const pressed = await c.eval('kart.ui.app.pressed === true');
      const row = {
        wait, run: r + 1, titleAtS: +(titleAt / 1000).toFixed(2), inHand, inHandAfterTitleS: inHandAt === null ? null : +(inHandAt / 1000).toFixed(2), pressed,
        pressToStartMs: song && tr.made ? Math.round(song.at - tr.made + song.ahead * 1000) : null,
        synth, songSeconds: song ? +song.seconds.toFixed(1) : null,
      };
      rows.push(row);
      console.log(JSON.stringify(row));
    } finally {
      await c.close();
    }
  }
}
const by = (w) => rows.filter((x) => x.wait === w && x.pressToStartMs !== null).map((x) => x.pressToStartMs).sort((a, b) => a - b);
for (const w of waits) {
  const v = by(w);
  console.log(`wait ${w} s: press to title song ${v.length ? `${v[0]}-${v[v.length - 1]} ms (median ${v[v.length >> 1]})` : 'never'}; file in hand ${rows.filter((x) => x.wait === w && x.inHand).length}/${runs}; synth stood in ${rows.filter((x) => x.wait === w && x.synth).length}/${runs}`);
}
await sleep(100);
