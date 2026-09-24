// Only this checkout's tests: never the agent worktrees under .claude/ or the reference repos.
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.claude/**', 'refs/**'],
    // the sim gates run whole races (8 AI, six tracks, three classes); a CI runner is a third of this
    // Mac's speed or less, and 30 s timed out the AI and balance gates there (24 Sept 2026)
    testTimeout: 120_000,
  },
});
