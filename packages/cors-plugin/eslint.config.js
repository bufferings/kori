import { koriConfig } from '@korix/eslint-config';

export default [
  ...koriConfig,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
