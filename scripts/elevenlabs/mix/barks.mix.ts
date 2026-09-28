// Count the racers' voice lines over many rendered races (render.mix.ts writes one bark log a race,
// CENSUS=1 for speed). Prints lines per race, the player's and the rivals', by moment, against the
// moments a line could have been said at. Nothing is played. TAGS=before,after compares runs.
import { it } from 'vitest';
import fs from 'node:fs';
import { OUT } from './paths.ts';

interface Said { t: number; racerId: string; bark: string; own: boolean; seconds: number }
interface Moment { t: number; racerId: string; kind: string; d: number; by?: string; detail?: string | number }
interface Log { track: string; player: string; seed: number; marks: Record<string, number>; barks: Said[]; moments: Moment[] }

const TAGS = (process.env.TAGS ?? process.env.TAG ?? 'before').split(',');
const f1 = (x: number) => x.toFixed(1), f2 = (x: number) => x.toFixed(2);

it(`barks ${TAGS.join(' vs ')}`, () => {
  for (const tag of TAGS) {
    const dir = `${OUT}/barks`;
    const logs: Log[] = fs.readdirSync(dir).filter((f) => f.startsWith(`${tag}-`) && f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')));
    if (!logs.length) { console.log(`${tag}: no logs in ${dir}`); continue; }
    const n = logs.length;
    const race = (g: Log) => (g.marks.finish ?? g.marks.results ?? 0) - g.marks.go;
    const minutes = logs.reduce((a, g) => a + race(g), 0) / 60;
    // lines said during the race (go to the player's finish line, which says its own finish line)
    const inRace = (g: Log) => g.barks.filter((b) => b.t >= g.marks.go - 0.01 && b.t <= (g.marks.finish ?? Infinity) + 0.01);
    const all = logs.flatMap(inRace);
    const own = all.filter((b) => b.own), rival = all.filter((b) => !b.own);
    const out: string[] = [];
    const P = (s: string) => out.push(s);
    P(`=== ${tag}: ${n} races (${[...new Set(logs.map((g) => g.track))].length} tracks, ${[...new Set(logs.map((g) => g.player))].length} racers as the player), ${f1(minutes * 60 / n)} s a race on average ===`);
    P(`Lines a race: ${f2(all.length / n)} (the player's ${f2(own.length / n)}, rivals' ${f2(rival.length / n)}); a line every ${f1(minutes * 60 / Math.max(1, all.length))} s; seconds of speech a race ${f1(all.reduce((a, b) => a + b.seconds, 0) / n)}`);
    // the player's lines in the race proper, leaving out the finish line (the one every game says)
    const mid = own.filter((b) => !['win', 'good', 'lose'].includes(b.bark));
    P(`The player's lines between the go and the finish (not the finish line): ${f2(mid.length / n)} a race, one every ${f1(minutes * 60 / Math.max(1, mid.length))} s`);
    const kinds = [...new Set(all.map((b) => b.bark))].sort();
    P(`By moment, a race (player / rivals): ${kinds.map((k) => `${k} ${f2(own.filter((b) => b.bark === k).length / n)}/${f2(rival.filter((b) => b.bark === k).length / n)}`).join(' | ')}`);
    // the moments a line could be said at, and how many were voiced
    const mine = (g: Log, kind: string, f: (m: Moment) => boolean = () => true) => g.moments.filter((m) => m.racerId === g.player && m.kind === kind && m.t >= g.marks.go - 0.01 && f(m)).length;
    const opp = (kind: string, f?: (m: Moment) => boolean) => logs.reduce((a, g) => a + mine(g, kind, f), 0);
    const voiced = (bark: string) => own.filter((b) => b.bark === bark).length;
    // an item's hit raises the kart's hit on the same tick: one hit a tick
    const hitsTaken = logs.reduce((a, g) => a + new Set(g.moments.filter((m) => m.racerId === g.player && (m.kind === 'hit' || m.kind === 'itemHit')).map((m) => m.t)).size, 0);
    const hitsGiven = logs.reduce((a, g) => a + g.moments.filter((m) => m.kind === 'itemHit' && m.by === g.player && m.racerId !== g.player).length, 0);
    const rows: [string, number, number][] = [
      ['rocket start', opp('boost:start'), voiced('start')],
      ['trick', opp('trick'), voiced('trick')],
      ['big drift boost (orange+)', opp('boost:drift', (m) => Number(m.detail) > 1), voiced('boost')],
      ['any drift boost', opp('boost:drift'), voiced('boost')],
      ['item hits a rival', hitsGiven, voiced('hitRival')],
      ['hit (spun, item or hazard)', hitsTaken, voiced('hit')],
      ['pass (place gained)', opp('pass'), voiced('overtake')],
      ['lap line crossed', opp('lap'), voiced('lap')],
      ['bump', opp('bump'), voiced('sorry')],
      ['item used', opp('itemUse'), 0],
    ];
    P(`The player's moments a race -> lines a race (share voiced):`);
    for (const [name, o, v] of rows) P(`  ${name.padEnd(28)} ${f2(o / n).padStart(6)} -> ${f2(v / n).padStart(5)}  (${o ? Math.round((100 * v) / o) : 0} %)`);
    // rivals: who spoke, and about what
    const rivalBy = [...new Set(rival.map((b) => b.bark))].map((k) => `${k} ${f2(rival.filter((b) => b.bark === k).length / n)}`);
    P(`Rivals' lines a race by moment: ${rivalBy.join(' | ') || 'none'}`);
    // per racer as the player
    const racers = [...new Set(logs.map((g) => g.player))];
    P(`By racer as the player (lines a race, own/rivals): ${racers.map((r) => { const gs = logs.filter((g) => g.player === r); const b = gs.flatMap(inRace); return `${r} ${f1(b.filter((x) => x.own).length / gs.length)}/${f1(b.filter((x) => !x.own).length / gs.length)}`; }).join(' | ')}`);
    const tracks = [...new Set(logs.map((g) => g.track))];
    P(`By track (lines a race): ${tracks.map((t) => { const gs = logs.filter((g) => g.track === t); return `${t} ${f1(gs.flatMap(inRace).length / gs.length)}`; }).join(' | ')}`);
    // the busiest stretch: most lines in any 30 s of a race
    const busiest = Math.max(...logs.map((g) => { const ts = inRace(g).map((b) => b.t); let m = 0; for (const t of ts) m = Math.max(m, ts.filter((u) => u >= t && u < t + 30).length); return m; }));
    P(`Most lines in any 30 s of a race: ${busiest}`);
    console.log(out.join('\n'));
    fs.writeFileSync(`${OUT}/barks-${tag}.txt`, out.join('\n') + '\n');
  }
});
