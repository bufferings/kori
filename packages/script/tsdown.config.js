import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/cli.ts'],
  format: ['esm'],
  dts: true,
  clean: false,
  sourcemap: true,
  external: ['node:fs', 'node:fs/promises', 'node:path', 'node:os'],
});
