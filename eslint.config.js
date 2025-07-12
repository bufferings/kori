import { koriConfig } from '@korix/eslint-config';

export default [
  ...koriConfig,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './packages/*/tsconfig.json', './packages/*/tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
