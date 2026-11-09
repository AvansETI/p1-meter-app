import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node26',
  // Bundle the workspace package (TypeScript source); keep npm dependencies external.
  deps: { alwaysBundle: ['@p1/shared'] },
  clean: true,
});
