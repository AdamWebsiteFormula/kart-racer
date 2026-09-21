// Builder constants come from the `builder` defaults in docs/schemas/track.schema.json.
// kartRadius and tSearchWindow are read from the kart schema and never redefined.
import trackSchema from '../../docs/schemas/track.schema.json';
import kartSchema from '../../docs/schemas/kart.schema.json';

export interface BuilderConstants {
  lutSamples: number; arcDivisions: number; globalSearchStep: number; branchHysteresis: number; branchLeaveMargin: number;
  maxBankDeg: number; minTurnRadiusFactor: number; minStartHalfWidth: number;
  branchBlendMetres: number; kerbWidth: number; kerbHeight: number; shoulderWidth: number; shoulderDrop: number;
  barrierSpacing: number; roadTileLength: number; chunkCount: number;
  minimapSamples: number; minimapPadding: number;
  boostPadHalfLength: number; boostPadWidth: number;
  balloonHeight: number; balloonRadius: number; coinRadius: number; hazardRadius: number;
  fallingActiveSeconds: number; gustWindow: number;
  decorBands: { roadside: [number, number]; far: [number, number]; sky: [number, number] };
  lapTimeWarn: [number, number]; trackDrawCallBudget: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walkDefaults(props: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(props)) {
    if ('default' in def) out[key] = structuredClone(def.default);
    else if (def.type === 'object' && def.properties) out[key] = walkDefaults(def.properties);
  }
  return out;
}

export const BUILDER: Readonly<BuilderConstants> = Object.freeze(
  walkDefaults(trackSchema.properties.builder.properties) as unknown as BuilderConstants,
);

/** From kart.schema.json. Collision circle, metres. */
export const KART_RADIUS: number = kartSchema.properties.base.properties.kartRadius.default;
/** From kart.schema.json. Spline fraction searched around the previous t. */
export const T_SEARCH_WINDOW: number = kartSchema.properties.base.properties.tSearchWindow.default;
