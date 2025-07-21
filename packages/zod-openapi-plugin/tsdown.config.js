import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: false,
  sourcemap: true,
  external: ['@korix/kori', '@korix/openapi-plugin', '@korix/zod-schema', 'openapi3-ts', 'zod'],
});
