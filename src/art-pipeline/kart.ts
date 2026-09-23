// Racer meshes for the game: body + ink hull, geometry cached per racer so eight karts share
// nothing but also never rebuild. Three.js objects only; the geometry maths is in model.ts.
import { Group, Mesh, type BufferGeometry } from 'three';
import { racerModel } from './racers.ts';
import { inkMaterial, vertexToon } from './toon.ts';

const cache = new Map<string, { body: BufferGeometry; hull: BufferGeometry }>();

export function racerGeometry(id: string): { body: BufferGeometry; hull: BufferGeometry } | null {
  const hit = cache.get(id);
  if (hit) return hit;
  const m = racerModel(id);
  if (!m) return null;
  const g = { body: m.build(), hull: m.outline() };
  cache.set(id, g);
  return g;
}

/** A kart for `racerId`: two meshes (toon body, ink hull), origin on the ground, facing +Z. */
export function buildRacerMesh(racerId: string): Group | null {
  const g = racerGeometry(racerId);
  if (!g) return null;
  const root = new Group();
  root.name = `racer-${racerId}`;
  const body = new Mesh(g.body, vertexToon());
  body.castShadow = true;
  const hull = new Mesh(g.hull, inkMaterial());
  root.add(body, hull);
  return root;
}
