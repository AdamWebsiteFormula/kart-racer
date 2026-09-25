// Test helper: a racer's rigged template (art-pipeline rigged.ts) built from its real part files in
// public/, loaded with GLTFLoader in Node (no textures: the atlas stays empty).
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildRiggedTemplate, type PartsSpec, type RiggedTemplate } from '../rigged.ts';

/** node:fs, as far as these tests use it (the project has no Node types) */
interface Buf { buffer: ArrayBufferLike; byteOffset: number; byteLength: number; readUInt32LE(offset: number): number; subarray(a: number, b?: number): { toString(enc: 'utf8'): string } }
export type Fs = { readFileSync(p: URL): Buf; readFileSync(p: URL, enc: 'utf8'): string };
export const fsOf = async (): Promise<Fs> => (await import('node:fs' as string)) as Fs;

export const ROOT = new URL('../../../', import.meta.url);

/** The parts manifest as it ships. */
export async function partsManifest(): Promise<Record<string, PartsSpec>> {
  return JSON.parse((await fsOf()).readFileSync(new URL('public/models/racers/manifest.json', ROOT), 'utf8')) as Record<string, PartsSpec>;
}

/** A GLB's triangles, from its JSON chunk (no decoding). */
export async function trianglesIn(url: string): Promise<number> {
  const b = (await fsOf()).readFileSync(new URL(`public/${url}`, ROOT));
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as { meshes: { primitives: { indices: number }[] }[]; accessors: { count: number }[] };
  return j.meshes.flatMap((m) => m.primitives).reduce((s, p) => s + j.accessors[p.indices].count / 3, 0);
}

async function load(url: string): Promise<Object3D> {
  const b = (await fsOf()).readFileSync(new URL(`public/${url}`, ROOT));
  return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '')).scene;
}

/** The racer's template, as the game builds it (quiet: GLTFLoader warns about the textures it cannot read here). */
export async function riggedTemplate(id: string): Promise<RiggedTemplate> {
  // GLTFLoader reaches for `self` (a browser's global) when it looks at a texture
  (globalThis as { self?: unknown }).self ??= globalThis;
  const spec = (await partsManifest())[id];
  const quiet = console.error, warn = console.warn;
  console.error = () => {}; console.warn = () => {};
  try {
    return buildRiggedTemplate(id, spec, { driver: await load(spec.driver.url), body: await load(spec.body.url), wheel: await load(spec.wheel.url) }, null);
  } finally { console.error = quiet; console.warn = warn; }
}
