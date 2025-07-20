import eslintConfig from '@korix/eslint-config';

export default [
  ...eslintConfig,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // CLI tool specific overrides
  {
    rules: {
      'no-console': 'off',
      'import-x/no-nodejs-modules': 'off',
    },
  },
];
