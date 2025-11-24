import { koriConfig } from '@korix/eslint-config';

export default [
  ...koriConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow Node.js modules in this Node.js-specific plugin
      'import-x/no-nodejs-modules': 'off',
    },
  },
];
