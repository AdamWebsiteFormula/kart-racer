// Public surface of the kart controller: the headless sim only. Nothing here
// imports Three.js. The render side is `./view.ts`; import it directly.
export * from './types.ts';
export { ARCHETYPES, BASE, gripFor, makeConstants, type ArchetypeStats, type KartBase, type KartConstants } from './constants.ts';
export { BOOST_PRIORITY, boostLive, clearBoost, requestBoost } from './boost.ts';
export { targetSpeed, type SpeedTargets } from './speed.ts';
export { cancelDrift, tierFor } from './drift.ts';
export { collisionMass } from './collide.ts';
export { isRiding, isTowed, radiusOf } from './powers.ts';
export { inWake } from './slipstream.ts';
export { applyHit, SIM_DT, SIM_HZ, stepKart, stepKarts, tryStartBoost } from './step.ts';
export { DEFAULT_KEYS, InputSource, isRaceKey, mapInput, type KeyMap } from './input.ts';
