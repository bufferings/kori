import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: false,
  sourcemap: true,
  external: [
    '@eslint/js',
    '@typescript-eslint/parser',
    '@typescript-eslint/types',
    '@typescript-eslint/utils',
    'eslint',
    'eslint-config-prettier',
    'eslint-plugin-import-x',
    'eslint-plugin-simple-import-sort',
    'eslint-plugin-unused-imports',
    'typescript-eslint',
  ],
});
