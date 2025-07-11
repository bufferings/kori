import { AST_NODE_TYPES, AST_TOKEN_TYPES, type TSESTree } from '@typescript-eslint/types';
import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/bufferings/kori/blob/main/docs/rules/${name}.md`,
);

export const noDuplicateExportFrom = createRule({
  name: 'no-duplicate-export-from',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent duplicate export statements from the same module',
    },
    fixable: 'code',
    schema: [],
    messages: {
      duplicateExportFrom:
        'Multiple export statements from the same module "{{source}}". Combine them into a single export statement.',
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceFile = context.sourceCode;
    const exportsBySource = new Map<string, TSESTree.ExportNamedDeclaration[]>();

    return {
      'Program:exit'() {
        // Check for duplicate export statements
        for (const [source, exports] of exportsBySource.entries()) {
          if (exports.length > 1) {
            // Report all but the first export as duplicates
            for (let i = 1; i < exports.length; i++) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const exportNode = exports[i]!;
              context.report({
                node: exportNode,
                messageId: 'duplicateExportFrom',
                data: {
                  source,
                },
                fix(fixer) {
                  // Combine all exports from the same source into the first export statement
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  const firstExport = exports[0]!;
                  const allSpecifiers: TSESTree.ExportSpecifier[] = [];

                  // Collect all export specifiers from all export statements
                  for (const exp of exports) {
                    if (exp.specifiers) {
                      for (const spec of exp.specifiers) {
                        if (spec.type === AST_NODE_TYPES.ExportSpecifier) {
                          allSpecifiers.push(spec);
                        }
                      }
                    }
                  }

                  // Sort specifiers: types first, then regular exports, both alphabetically
                  allSpecifiers.sort((a, b) => {
                    const aIsType = a.exportKind === 'type';
                    const bIsType = b.exportKind === 'type';

                    if (aIsType && !bIsType) return -1;
                    if (!aIsType && bIsType) return 1;

                    const aName =
                      a.exported.type === AST_NODE_TYPES.Identifier ? a.exported.name : String(a.exported.value);
                    const bName =
                      b.exported.type === AST_NODE_TYPES.Identifier ? b.exported.name : String(b.exported.value);
                    return aName.localeCompare(bName);
                  });

                  // Generate the combined export statement
                  const specifierTexts = allSpecifiers.map((spec) => {
                    const exported = spec.exported;
                    const local = spec.local;
                    const typePrefix = spec.exportKind === 'type' ? 'type ' : '';

                    // Get the actual names from the nodes
                    const exportedName =
                      exported.type === AST_NODE_TYPES.Identifier ? exported.name : String(exported.value);
                    const localName = local.type === AST_NODE_TYPES.Identifier ? local.name : String(local.value);

                    if (exportedName === localName) {
                      return `${typePrefix}${localName}`;
                    } else {
                      return `${typePrefix}${localName} as ${exportedName}`;
                    }
                  });

                  const combinedExport = `export {\n  ${specifierTexts.join(',\n  ')},\n} from '${source}';`;

                  const fixes = [];

                  // Replace the first export with the combined one
                  fixes.push(fixer.replaceText(firstExport, combinedExport));

                  // Remove all other exports
                  for (let j = 1; j < exports.length; j++) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const nodeToRemove = exports[j]!;
                    const startToken = sourceFile.getFirstToken(nodeToRemove);
                    const endToken = sourceFile.getLastToken(nodeToRemove);

                    if (startToken && endToken) {
                      // Check if there's a newline after this export
                      const nextToken = sourceFile.getTokenAfter(endToken);
                      if (nextToken?.type === AST_TOKEN_TYPES.Punctuator && nextToken.value === ';') {
                        // Include the semicolon and any following newline
                        const tokenAfterSemi = sourceFile.getTokenAfter(nextToken);
                        if (tokenAfterSemi) {
                          fixes.push(fixer.removeRange([startToken.range[0], tokenAfterSemi.range[0]]));
                        } else {
                          fixes.push(fixer.removeRange([startToken.range[0], nextToken.range[1]]));
                        }
                      } else {
                        fixes.push(fixer.remove(nodeToRemove));
                      }
                    }
                  }

                  return fixes;
                },
              });
            }
          }
        }
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source?.value && typeof node.source.value === 'string') {
          const source = node.source.value;

          if (!exportsBySource.has(source)) {
            exportsBySource.set(source, []);
          }

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          exportsBySource.get(source)!.push(node);
        }
      },
    };
  },
});
