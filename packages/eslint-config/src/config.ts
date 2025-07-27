import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

import { asciiOnlySource, noDuplicateExportFrom, noIndexImports } from './rules/index.js';

export const baseConfig = tseslint.config(
  // Ignore patterns
  {
    ignores: ['**/dist/', '*.config.js', '**/config.js'],
  },

  // Extend recommended configs
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // TypeScript parser options
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  // Plugins and rules
  {
    plugins: {
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
      'import-x': importX,
    },
    rules: {
      'no-console': 'error',

      // TypeScript specific rules
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-unused-vars': 'off',
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

      // Type imports/exports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': ['error', { fixMixedExportsWithInlineTypeSpecifier: true }],
      'import-x/consistent-type-specifier-style': ['error', 'prefer-inline'],

      // Import sorting
      'simple-import-sort/exports': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-dynamic-require': 'error',
      'import-x/no-nodejs-modules': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'object', 'type'],
          pathGroups: [
            {
              pattern: './**/index.{js,ts,tsx}',
              group: 'parent',
              position: 'after',
            },
          ],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          'newlines-between': 'always',
        },
      ],
    },
  },

  // Prettier should be last
  eslintConfigPrettier,

  // Re-enable the curly-braces rule AFTER eslint-config-prettier, which turns it off.
  {
    rules: {
      curly: 'error',
    },
  },
);

export const koriConfig = [
  ...baseConfig,
  {
    plugins: {
      kori: {
        rules: {
          'ascii-only-source': asciiOnlySource,
          'no-duplicate-export-from': noDuplicateExportFrom,
          'no-index-imports': noIndexImports,
        },
      },
    },
    rules: {
      'kori/ascii-only-source': 'error',
      'kori/no-duplicate-export-from': 'error',
      'kori/no-index-imports': 'error',
    },
  },
  // Disable no-index-imports for test files
  {
    files: ['**/tests/**/*.ts'],
    rules: {
      'kori/no-index-imports': 'off',
    },
  },
];
