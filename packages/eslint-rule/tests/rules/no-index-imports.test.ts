import * as tsParser from '@typescript-eslint/parser';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';

import { noIndexImports } from '../../src/rules/index.js';

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

ruleTester.run('no-index-imports', noIndexImports, {
  valid: [
    // External modules are always valid
    {
      code: `import { something } from 'external-module';`,
      filename: '/project/src/components/Button.ts',
    },
    // Importing specific file from same directory is valid
    {
      code: `import { helper } from './helper.js';`,
      filename: '/project/src/utils/index.ts',
    },
    // Importing index from other directory is valid
    {
      code: `import { Button } from '../components/index.js';`,
      filename: '/project/src/pages/Home.ts',
    },
    {
      code: `import { Button } from '../components/';`,
      filename: '/project/src/pages/Home.ts',
    },
    // Re-export from index in other directory is valid
    {
      code: `export { Button } from '../components/index.js';`,
      filename: '/project/src/pages/index.ts',
    },
    {
      code: `export * from '../components/index.js';`,
      filename: '/project/src/pages/index.ts',
    },
  ],

  invalid: [
    // Importing from index in same directory
    {
      code: `import { something } from '.';`,
      filename: '/project/src/utils/helper.ts',
      errors: [
        {
          messageId: 'sameDirectoryIndex',
        },
      ],
    },
    {
      code: `import { something } from './';`,
      filename: '/project/src/utils/helper.ts',
      errors: [
        {
          messageId: 'sameDirectoryIndex',
        },
      ],
    },
    {
      code: `import { something } from './index.js';`,
      filename: '/project/src/utils/helper.ts',
      errors: [
        {
          messageId: 'sameDirectoryIndex',
        },
      ],
    },
    {
      code: `import { something } from './index.ts';`,
      filename: '/project/src/utils/helper.ts',
      errors: [
        {
          messageId: 'sameDirectoryIndex',
        },
      ],
    },
    // Importing specific file from other directory (with autofix)
    {
      code: `import { Button } from '../components/Button.js';`,
      filename: '/project/src/pages/Home.ts',
      output: `import { Button } from '../components/index.js';`,
      errors: [
        {
          messageId: 'otherDirectoryNonIndex',
          data: {
            suggestion: '../components/index.js',
          },
        },
      ],
    },
    {
      code: `import { helper } from '../../utils/helper.ts';`,
      filename: '/project/src/pages/home/index.ts',
      output: `import { helper } from '../../utils/index.js';`,
      errors: [
        {
          messageId: 'otherDirectoryNonIndex',
          data: {
            suggestion: '../../utils/index.js',
          },
        },
      ],
    },
    // Directory import without explicit index (should be fixed to explicit index)
    {
      code: `import { utils } from '../utils';`,
      filename: '/project/src/pages/Home.ts',
      output: `import { utils } from '../utils/index.js';`,
      errors: [
        {
          messageId: 'otherDirectoryNonIndex',
          data: {
            suggestion: '../utils/index.js',
          },
        },
      ],
    },
    // Re-export from index in same directory
    {
      code: `export { something } from '.';`,
      filename: '/project/src/utils/helper.ts',
      errors: [
        {
          messageId: 'sameDirectoryIndex',
        },
      ],
    },
    {
      code: `export * from './index.js';`,
      filename: '/project/src/utils/helper.ts',
      errors: [
        {
          messageId: 'sameDirectoryIndex',
        },
      ],
    },
    // Re-export specific file from other directory (with autofix)
    {
      code: `export { Button } from '../components/Button.js';`,
      filename: '/project/src/pages/index.ts',
      output: `export { Button } from '../components/index.js';`,
      errors: [
        {
          messageId: 'otherDirectoryNonIndex',
          data: {
            suggestion: '../components/index.js',
          },
        },
      ],
    },
    {
      code: `export * from '../utils/helper.js';`,
      filename: '/project/src/pages/index.ts',
      output: `export * from '../utils/index.js';`,
      errors: [
        {
          messageId: 'otherDirectoryNonIndex',
          data: {
            suggestion: '../utils/index.js',
          },
        },
      ],
    },
  ],
});
