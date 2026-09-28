// Headless checks that want real model files (the far vista's big pieces, glb.ts PropModels): each file
// read from public/models/props/, parsed as the game parses it and taken in through PropModels.adopt,
// so it is smoothed, turned and fitted exactly as in a browser. Textures cannot decode here (nor need to).
import type { Object3D } from 'three';
import type { ModelManifest } from '../glb.ts';
import { PROP_MODELS } from '../glb.ts';

/** Takes in the prop files named (those the manifest lists) as the game's PROP_MODELS; returns the names taken. */
export async function adoptPropFiles(names: readonly string[]): Promise<string[]> {
  (globalThis as { self?: unknown }).self ??= globalThis; // GLTFLoader reaches for a browser's `self` at a texture
  const fs = (await import('node:fs' as string)) as { readFileSync(p: URL, enc?: string): Uint8Array | string };
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const manifest = JSON.parse(fs.readFileSync(new URL('../../../public/models/props.json', import.meta.url), 'utf8') as string) as ModelManifest;
  const taken: string[] = [];
  const quiet = [console.error, console.warn];
  console.error = console.warn = () => {}; // (the texture decode failing, as it must here)
  try {
    for (const name of names) {
      const spec = manifest[name];
      if (!spec) continue;
      const b = fs.readFileSync(new URL(`../../../public/${spec.url}`, import.meta.url)) as Uint8Array;
      const scene: Object3D = (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '')).scene;
      if (PROP_MODELS.adopt(name, spec, scene)) taken.push(name);
    }
  } finally { [console.error, console.warn] = quiet; }
  return taken;
}
