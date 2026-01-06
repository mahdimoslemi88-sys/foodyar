

// FIX: Import from vitest/config to get test configuration types and remove the triple-slash directive.
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
});