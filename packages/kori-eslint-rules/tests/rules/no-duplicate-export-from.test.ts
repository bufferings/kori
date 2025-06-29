import * as tsParser from '@typescript-eslint/parser';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';

import { noDuplicateExportFrom } from '../../src/rules/index.js';

// Configure RuleTester to work with vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run('no-duplicate-export-from', noDuplicateExportFrom, {
  valid: [
    // Single export statement is valid
    {
      code: `export { type KoriLogger, type KoriLogLevel } from './logging/index.js';`,
    },
    // Single export with mixed types and values is valid
    {
      code: `export {
        defaultKoriLogSerializers,
        type KoriLogData,
        type KoriLogger,
        type KoriLogLevel,
        type KoriLogSerializers,
        type KoriSimpleLoggerOptions,
      } from './logging/index.js';`,
    },
    // Exports from different modules are valid
    {
      code: `
        export { type KoriLogger } from './logging/index.js';
        export { type KoriRequest } from './request/index.js';
      `,
    },
    // Non-re-export statements are valid
    {
      code: `
        export const myFunction = () => {};
        export type MyType = string;
      `,
    },
  ],

  invalid: [
    // Basic duplicate export case
    {
      code: `
export { type KoriLogger } from './logging/index.js';
export { type KoriLogLevel } from './logging/index.js';
      `,
      output: `
export {
  type KoriLogger,
  type KoriLogLevel,
} from './logging/index.js';

      `,
      errors: [
        {
          messageId: 'duplicateExportFrom',
          data: {
            source: './logging/index.js',
          },
        },
      ],
    },
    // Multiple duplicates with mixed types and values
    {
      code: `
export {
  defaultKoriLogSerializers,
  type KoriLogData,
  type KoriLogger,
  type KoriLogLevel,
  type KoriLogSerializers,
  type KoriSimpleLoggerOptions,
} from './logging/index.js';
export { type KoriLoggerFactory } from './logging/index.js';
      `,
      output: `
export {
  type KoriLogData,
  type KoriLogger,
  type KoriLoggerFactory,
  type KoriLogLevel,
  type KoriLogSerializers,
  type KoriSimpleLoggerOptions,
  defaultKoriLogSerializers,
} from './logging/index.js';

      `,
      errors: [
        {
          messageId: 'duplicateExportFrom',
          data: {
            source: './logging/index.js',
          },
        },
      ],
    },
    // Three separate export statements
    {
      code: `
export { type KoriLogger } from './logging/index.js';
export { type KoriLogLevel } from './logging/index.js';
export { defaultKoriLogSerializers } from './logging/index.js';
      `,
      output: `
export {
  type KoriLogger,
  type KoriLogLevel,
  defaultKoriLogSerializers,
} from './logging/index.js';


      `,
      errors: [
        {
          messageId: 'duplicateExportFrom',
          data: {
            source: './logging/index.js',
          },
        },
        {
          messageId: 'duplicateExportFrom',
          data: {
            source: './logging/index.js',
          },
        },
      ],
    },
    // Mixed with exports from other modules (only duplicates should be flagged)
    {
      code: `
export { type KoriLogger } from './logging/index.js';
export { type KoriRequest } from './request/index.js';
export { type KoriLogLevel } from './logging/index.js';
      `,
      output: `
export {
  type KoriLogger,
  type KoriLogLevel,
} from './logging/index.js';
export { type KoriRequest } from './request/index.js';

      `,
      errors: [
        {
          messageId: 'duplicateExportFrom',
          data: {
            source: './logging/index.js',
          },
        },
      ],
    },
    // Exports with aliases
    {
      code: `
export { KoriLogger as Logger } from './logging/index.js';
export { type KoriLogLevel } from './logging/index.js';
      `,
      output: `
export {
  type KoriLogLevel,
  KoriLogger as Logger,
} from './logging/index.js';

      `,
      errors: [
        {
          messageId: 'duplicateExportFrom',
          data: {
            source: './logging/index.js',
          },
        },
      ],
    },
  ],
});
