/* eslint-disable kori/ascii-only-source */
import * as tsParser from '@typescript-eslint/parser';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';

import { asciiOnlySource } from '../../src/rules/ascii-only-source.js';

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

ruleTester.run('ascii-only-source', asciiOnlySource, {
  valid: [
    // Standard ASCII code
    {
      code: `const message = 'Hello, World!';`,
    },
    // Functions and variables
    {
      code: `
        function greet(name: string): string {
          return "Hello, " + name + "!";
        }
        
        const user = { id: 1, name: 'Alice' };
        console.log('User:', user);
      `,
    },
    // Comments with ASCII only
    {
      code: `
        // This is a comment
        /* Multi-line comment
           with ASCII characters only */
        const value = 42;
      `,
    },
    // Special ASCII characters
    {
      code: `
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?/~';
        const newline = 'line1\\nline2';
        const tab = 'col1\\tcol2';
      `,
    },
  ],

  invalid: [
    // Emoji in string (consecutive non-ASCII chars as one error)
    {
      code: `const message = 'Hello 🎋 World!';`,
      errors: [
        {
          messageId: 'nonAsciiCharacter',
          line: 1,
          column: 24,
        },
      ],
    },
    // Japanese characters (consecutive non-ASCII chars as one error)
    {
      code: `const message = 'こんにちは';`,
      errors: [
        {
          messageId: 'nonAsciiCharacter',
          line: 1,
          column: 18,
        },
      ],
    },
    // Multiple separate emojis (each emoji group as separate error)
    {
      code: `console.log('Starting 🎋 server... 📝 Done!');`,
      errors: [
        {
          messageId: 'nonAsciiCharacter',
          line: 1,
          column: 23,
        },
        {
          messageId: 'nonAsciiCharacter',
          line: 1,
          column: 36,
        },
      ],
    },
    // Non-ASCII in comment (consecutive chars as one error)
    {
      code: `// コメント
        const value = 42;`,
      errors: [
        {
          messageId: 'nonAsciiCharacter',
          line: 1,
          column: 4,
        },
      ],
    },
    // Em dash in comment
    {
      code: `// Merge two Records – keys from B override A`,
      errors: [
        {
          messageId: 'nonAsciiCharacter',
          data: {
            character: '–',
            line: 1,
            column: 22,
          },
        },
      ],
    },
    // Bullet point
    {
      code: `const list = '• Item 1';`,
      errors: [
        {
          messageId: 'nonAsciiCharacter',
          data: {
            character: '•',
            line: 1,
            column: 15,
          },
        },
      ],
    },
  ],
});
