import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: false,
  shims: true,
  outDir: './dist',
  external: ['kori', 'kori-zod-schema', 'kori-openapi-plugin', 'openapi3-ts', 'zod'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.js' : '.mjs',
    };
  },
});
