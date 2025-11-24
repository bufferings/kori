import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: false,
  sourcemap: true,
  external: ['@korix/kori', 'zod'],
  // to use js extension instead of mjs
  fixedExtension: false,
});
