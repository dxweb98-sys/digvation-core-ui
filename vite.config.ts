import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import parkedAreas from './parked-areas.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup-tests.ts',
    css: true,
    // Parked areas (src/features/PARKED.md) are not tested until their backend unit returns.
    exclude: [...configDefaults.exclude, ...parkedAreas.map((area) => `src/features/${area.folder}/**`)],
  },
});
