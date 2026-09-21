// Public surface of the AI driver. Headless; nothing here imports Three.js.
export { AiDriver, type AiDriverOptions } from './driver.ts';
export { AI, PROFILES, difficultyFor, targetTierFor, type AiConstants } from './constants.ts';
export { PERSONALITIES, personalityFor } from './personalities.ts';
export { rubberBand, skillFor, powerCapFor } from './rubber.ts';
export * from './types.ts';
