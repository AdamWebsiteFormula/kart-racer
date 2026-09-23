// The server core, bundled into the submit-score Edge Function by vite.function.config.ts.
// Everything the function needs from the game: tracks, the rules, and the re-simulation.
import type { TrackDefinition } from '../track-builder/types.ts';

export { checkSubmission, dailySeed, CLIENT_VERSION, MAX_LOG_BYTES } from './rules.ts';
export { verifyRun, CLAIM_TOLERANCE_MS } from './verify.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
export const TRACKS: Readonly<Record<string, TrackDefinition>> = Object.freeze(Object.fromEntries(Object.values(FILES).map((d) => [d.id, d])));
export const TRACK_IDS: readonly string[] = Object.freeze(Object.keys(TRACKS).sort());
