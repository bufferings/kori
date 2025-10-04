import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: false,
  sourcemap: true,
  external: ['@korix/file-adapter', 'fs', 'path', 'stream', 'mime-types', 'etag'],
});