import { koriConfig } from './dist/index.js';

export default [
  ...koriConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
