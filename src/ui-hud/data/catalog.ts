// Tracks, cups and Knockout sets for the menus (design §6, §9). The cups schema has no data
// file yet; this is the catalog until one exists. `built` comes from the track files present.
export interface TrackCard { id: string; name: string; biome: string; bg: string; accent: string; shift: string }

export const TRACKS: readonly TrackCard[] = Object.freeze([
  { id: 'harbour-loop', name: 'Harbor Loop', biome: 'Seaside town', bg: '#F4E4C1', accent: '#FF6F61', shift: 'The tide comes in' },
  { id: 'meadow-run', name: 'Meadow Run', biome: 'Rolling farmland', bg: '#7BC950', accent: '#FFD23F', shift: 'A storm rolls in' },
  { id: 'canyon-rush', name: 'Canyon Rush', biome: 'Red-rock desert', bg: '#C8553D', accent: '#2EC4B6', shift: 'The rope bridge falls' },
  { id: 'frostbite-pass', name: 'Frostbite Pass', biome: 'Snowy mountain', bg: '#DCEBF5', accent: '#FF3E9A', shift: 'A blizzard freezes the lake' },
  { id: 'boardwalk-nights', name: 'Boardwalk Nights', biome: 'Night carnival', bg: '#15154A', accent: '#FF2E97', shift: 'Fireworks finale' },
  { id: 'skyline-circuit', name: 'Skyline Circuit', biome: 'Cloud islands', bg: '#FFC8A2', accent: '#F2B705', shift: 'Sunset to starlight' },
]);

export interface CupCard { id: string; name: string; kind: 'grandPrix' | 'knockout'; trackIds: string[] }

export const CUPS: readonly CupCard[] = Object.freeze([
  { id: 'sunrise', name: 'Sunrise Cup', kind: 'grandPrix', trackIds: ['harbour-loop', 'meadow-run', 'canyon-rush'] },
  { id: 'summit', name: 'Summit Cup', kind: 'grandPrix', trackIds: ['frostbite-pass', 'boardwalk-nights', 'skyline-circuit'] },
]);

export const KNOCKOUT_SETS: readonly CupCard[] = Object.freeze([
  { id: 'coastline', name: 'Coastline Knockout', kind: 'knockout', trackIds: ['harbour-loop', 'meadow-run', 'canyon-rush'] },
  { id: 'peaks', name: 'Peaks Knockout', kind: 'knockout', trackIds: ['frostbite-pass', 'boardwalk-nights', 'skyline-circuit'] },
]);

export const trackCard = (id: string): TrackCard | undefined => TRACKS.find((t) => t.id === id);

/**
 * The title screen's attract race: Harbour Loop (design §12), else the first built track in this
 * order. Not the first track file, which sorts by name, so adding a file never changes the title.
 */
export function attractTrack(built: ReadonlySet<string>): string | undefined {
  return TRACKS.find((t) => built.has(t.id))?.id;
}

/**
 * A Quick Race's Next track: the built track after `id` in this order (the track screen's), round from the
 * last to the first; the first built one for an id that is none of them. One track built: that one again.
 */
export function nextTrack(id: string | null, built: ReadonlySet<string>): string | undefined {
  const list = TRACKS.filter((t) => built.has(t.id));
  if (!list.length) return undefined;
  return list[(list.findIndex((t) => t.id === id) + 1) % list.length].id;
}

/**
 * The tracks a cup really plays. Unbuilt tracks are skipped and the built ones repeat in order
 * to keep the cup's length, so a Knockout is always three segments (Decisions 2026-09-23).
 * Empty when none of its tracks exist yet.
 */
export function playableTracks(trackIds: readonly string[], built: ReadonlySet<string>): string[] {
  const have = trackIds.filter((id) => built.has(id));
  if (have.length === 0) return [];
  return trackIds.map((_, i) => have[i % have.length]);
}
