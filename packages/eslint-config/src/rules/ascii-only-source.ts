import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/bufferings/kori/blob/main/docs/rules/${name}.md`,
);

export const asciiOnlySource = createRule({
  name: 'ascii-only-source',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce ASCII-only characters in source code files',
    },
    fixable: undefined,
    schema: [],
    messages: {
      nonAsciiCharacter:
        'Non-ASCII character found: "{{character}}" at line {{line}}, column {{column}}. Source code must contain only ASCII characters.',
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const text = sourceCode.getText();

    return {
      Program() {
        // Use regex to find consecutive non-ASCII characters as one group
        const nonAsciiRegex = /[^\x20-\x7E\t\n\r]+/g;
        const lines = text.split('\n');

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          if (!line) continue;

          let match;
          const regex = new RegExp(nonAsciiRegex.source, 'g');

          while ((match = regex.exec(line)) !== null) {
            const chars = match[0];
            const startCol = match.index;
            const endCol = startCol + chars.length;

            // Create a display string for the error message
            const displayChars = chars.length > 10 ? `${chars.substring(0, 10)}...` : chars;

            context.report({
              loc: {
                start: { line: lineIndex + 1, column: startCol },
                end: { line: lineIndex + 1, column: endCol },
              },
              messageId: 'nonAsciiCharacter',
              data: {
                character: displayChars,
                line: lineIndex + 1,
                column: startCol + 1,
              },
            });
          }
        }
      },
    };
  },
});
