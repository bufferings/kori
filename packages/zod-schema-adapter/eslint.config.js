import { koriConfig } from '@korix/eslint-config';

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
