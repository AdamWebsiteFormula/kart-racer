// Public surface of the kart controller. The sim half never imports Three.js;
// view.ts is exported separately so headless code can skip it.
export * from './types.ts';
export { ARCHETYPES, BASE, gripFor, makeConstants, type ArchetypeStats, type KartBase, type KartConstants } from './constants.ts';
export { BOOST_PRIORITY, boostLive, clearBoost, requestBoost } from './boost.ts';
export { targetSpeed, type SpeedTargets } from './speed.ts';
export { cancelDrift, tierFor } from './drift.ts';
export { collisionMass } from './collide.ts';
export { inWake } from './slipstream.ts';
export { applyHit, SIM_DT, SIM_HZ, stepKart, stepKarts, tryStartBoost } from './step.ts';
export { DEFAULT_KEYS, InputSource, mapInput, type KeyMap } from './input.ts';
export { KartView } from './view.ts';
