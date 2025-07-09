import eslint from '@eslint/js';
import koriEslintRules from '@korix/eslint-rule';
import eslintConfigPrettier from 'eslint-config-prettier';
import { importX } from 'eslint-plugin-import-x';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/', '**/dist-dev/'],
  },

  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.*', 'packages/*/tsup.config.ts'],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 25,
        },
        project: ['./tsconfig.json', './packages/*/tsconfig.json', './packages/*/tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
      'import-x': importX,
      kori: koriEslintRules,
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Prefer type over interface
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

      // For eslint-plugin-unused-imports and eslint-plugin-import
      '@typescript-eslint/no-unused-vars': 'off',

      // For explicit module boundary types
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Type imports and exports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': ['error', { fixMixedExportsWithInlineTypeSpecifier: true }],
      'import-x/consistent-type-specifier-style': ['error', 'prefer-inline'],

      // For sorting exports. We don't use simple-import-sort for imports since we use import-x
      'simple-import-sort/exports': 'error',

      // Custom local rules
      'kori/no-index-imports': 'error',
      'kori/no-duplicate-export-from': 'error',
      'kori/ascii-only-source': 'error',

      // Import Format
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-dynamic-require': 'error',
      'import-x/no-nodejs-modules': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'object', 'type'],
          pathGroups: [{ pattern: './**/index.{js,ts,tsx}', group: 'parent', position: 'after' }],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
    },
  },

  // For Prettier
  eslintConfigPrettier,
);
