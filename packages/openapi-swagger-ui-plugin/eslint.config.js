import { koriConfig } from '@korix/eslint-config';

export default [
  ...koriConfig,
  {
    ignores: ['assets/**', 'src/assets/**', 'scripts/**'],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
