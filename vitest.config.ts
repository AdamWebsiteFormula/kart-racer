// Only this checkout's tests: never the agent worktrees under .claude/ or the reference repos.
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.claude/**', 'refs/**'],
  },
});
