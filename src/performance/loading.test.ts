// Background loading (loadQueue.ts, main.ts): the title's track loads its scenery models first, so
// trackProps(def) must name exactly the models a track's scene asks for, and the loaders must fetch
// what they are asked for, once each, through the schedule they are given.
import { describe, expect, it } from 'vitest';
import PROPS_MANIFEST from '../../public/models/props.json';
import { PropModels, RacerModels, trackAssets, trackProps } from '../art-pipeline/index.ts';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import type { Schedule } from './loadQueue.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const MANIFEST: Record<string, { url: string }> = PROPS_MANIFEST;
const fileNames = (names: Iterable<string>) => [...new Set(names)].filter((n) => Object.hasOwn(MANIFEST, n)).sort();

/** A fetch that serves one JSON body (the manifests); the model files themselves fail (no network in tests). */
const serving = (body: unknown) => (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch;
/** A schedule that runs each job at once and counts them. */
function counting(): { schedule: Schedule; jobs: () => number } {
  let n = 0;
  return { schedule: (job) => { n++; return job(); }, jobs: () => n };
}

describe('trackProps (which scenery models a track needs)', () => {
  it.each(TRACKS.map((d) => [d.id, d] as const))('%s: names every model file its scene asks for, and no other', (_id, def) => {
    const asked = new Set<string>();
    const a = trackAssets(def.biome);
    const spy = <T extends object>(o: T): T => new Proxy(o, { get: (t, k) => { if (typeof k === 'string') asked.add(k); return Reflect.get(t, k); } });
    a.geometries = spy(a.geometries!);
    if (a.materials) a.materials = spy(a.materials);
    const scene = buildTrackScene(buildTrack(def), a);
    expect(fileNames(trackProps(def))).toEqual(fileNames(asked));
    expect(fileNames(trackProps(def)).length).toBeGreaterThan(0);
    scene.dispose();
  }, 120_000);

  it('covers every model file between the six tracks', () => {
    const used = new Set(TRACKS.flatMap((d) => trackProps(d)));
    expect(Object.keys(MANIFEST).filter((n) => !used.has(n))).toEqual([]);
  });
});

describe('model loaders take turns (a schedule per file)', () => {
  it('PropModels loads only the props asked for, each once, and the rest when asked for all', async () => {
    const props = new PropModels('/', serving({ crab: { url: 'models/props/crab.glb' }, lamp: { url: 'models/props/lamp.glb' }, yeti: { url: 'models/props/yeti.glb' } }));
    const c = counting();
    await props.load(['crab', 'lamp', 'not-a-model'], c.schedule);
    expect(c.jobs()).toBe(2);
    await props.load(['crab'], c.schedule);
    expect(c.jobs()).toBe(2);
    await props.load(undefined, c.schedule);
    expect(c.jobs()).toBe(3);
    expect(props.get('crab')).toBeUndefined(); // the file itself failed: stays code-built
  });

  it('PropModels fails soft with no manifest', async () => {
    const c = counting();
    const none = new PropModels('/', (async () => ({ ok: false })) as unknown as typeof fetch);
    await none.load(undefined, c.schedule);
    const offline = new PropModels('/', (() => Promise.reject(new Error('offline'))) as typeof fetch);
    await offline.load(['crab'], c.schedule);
    expect(c.jobs()).toBe(0);
  });

  it('RacerModels puts each racer file through the schedule', async () => {
    const racers = new RacerModels('/', serving({ pip: { url: 'models/pip.glb' }, gus: { url: 'models/gus.glb' } }));
    const c = counting();
    await racers.load(c.schedule);
    await racers.load(c.schedule);
    expect(c.jobs()).toBe(2);
    expect(racers.has('pip')).toBe(false);
  });
});
