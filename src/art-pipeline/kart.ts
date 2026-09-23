// Racer meshes for the game: one vertex-coloured body per racer (no outline: Mario Kart World
// draws none, and neither do we since 2026-09-23), geometry cached per racer so eight karts
// never rebuild. Three.js objects only; the geometry maths is in model.ts.
import { Group, Mesh, type BufferGeometry } from 'three';
import { RACER_MODELS } from './glb.ts';
import { racerModel } from './racers.ts';
import { vertexToon } from './toon.ts';

const cache = new Map<string, { body: BufferGeometry }>();

export function racerGeometry(id: string): { body: BufferGeometry } | null {
  const hit = cache.get(id);
  if (hit) return hit;
  const m = racerModel(id);
  if (!m) return null;
  const g = { body: m.build() };
  cache.set(id, g);
  return g;
}

/** A kart for `racerId`, origin on the ground, facing +Z: its model file when loaded, else the code-built one. */
export function buildRacerMesh(racerId: string): Group | null {
  const file = RACER_MODELS.make(racerId);
  if (file) return file;
  const g = racerGeometry(racerId);
  if (!g) return null;
  const root = new Group();
  root.name = `racer-${racerId}`;
  const body = new Mesh(g.body, vertexToon());
  body.castShadow = true;
  root.add(body);
  return root;
}
