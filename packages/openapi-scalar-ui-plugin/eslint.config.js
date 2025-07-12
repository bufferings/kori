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
];
