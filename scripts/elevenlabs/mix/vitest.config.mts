// The offline mix tools (docs/sops/audio.md). From the repo root:
//   npx vitest run --config scripts/elevenlabs/mix/vitest.config.mts render     (then measure, assets)
// TRACK, PLAYER, SEED, TAG and FULL=1 (every slider at full) choose the race; MIX_OUT where files go.
// Nothing is ever played: the mix is rendered to WAV files and measured.
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['scripts/elevenlabs/mix/*.mix.ts'], testTimeout: 3_600_000, pool: 'forks' } });
