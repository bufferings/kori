import { koriConfig } from '@korix/eslint-config';

export default [
  ...koriConfig,
  {
    ignores: ['assets/**', 'src/assets/**', 'scripts/**'],
  },
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
