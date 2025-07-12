import { type TSESTree } from '@typescript-eslint/types';
import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/bufferings/kori/blob/main/docs/rules/${name}.md`,
);

export const noIndexImports = createRule({
  name: 'no-index-imports',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce import restrictions for index files',
    },
    fixable: 'code',
    schema: [],
    messages: {
      sameDirectoryIndex: 'Do not import from index file in the same directory. Import from a specific file instead.',
      otherDirectoryNonIndex:
        'Only index files can be imported from other directories. Import from "{{suggestion}}" instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    function checkImportPath(node: TSESTree.Node & { source: TSESTree.Literal }, importPath: string) {
      // Skip external modules and absolute paths
      if (!importPath.startsWith('.')) {
        return;
      }

      // Classify the import type first
      let isSameDirectory = false;
      let isSubdirectory = false;
      let isOtherDirectory = false;

      if (importPath === '.' || importPath === './') {
        // Current directory
        isSameDirectory = true;
      } else if (importPath.startsWith('./')) {
        // Check if it's a file in the same directory or a subdirectory
        const pathAfterDot = importPath.substring(2);
        if (pathAfterDot.includes('/')) {
          // Has a slash, so it's a subdirectory
          isSubdirectory = true;
        } else if (pathAfterDot.includes('.')) {
          // Has a file extension, so it's a file in the same directory
          isSameDirectory = true;
        } else {
          // No slash and no extension, it's a subdirectory (e.g., './subdir')
          isSubdirectory = true;
        }
      } else if (importPath === '..' || importPath.startsWith('../')) {
        // Parent or other directory
        isOtherDirectory = true;
      }

      // Check if importing from index file
      const isIndexImport =
        importPath === '.' ||
        importPath === './' ||
        importPath === './index.js' ||
        importPath === './index.ts' ||
        importPath === './index.tsx' ||
        importPath === './index' ||
        importPath.endsWith('/index.js');

      // Same directory: allow specific files, disallow index imports
      if (isSameDirectory) {
        if (isIndexImport) {
          context.report({
            node,
            messageId: 'sameDirectoryIndex',
          });
        }
      }
      // Subdirectory and other directory: require index.js imports
      else if (isSubdirectory || isOtherDirectory) {
        if (!isIndexImport) {
          // Suggest the index import path
          let suggestion = importPath;
          if (importPath.endsWith('.js') || importPath.endsWith('.ts') || importPath.endsWith('.tsx')) {
            const dir = importPath.substring(0, importPath.lastIndexOf('/'));
            suggestion = dir + '/index.js';
          } else if (importPath.endsWith('/')) {
            // Already ends with slash, just add index.js
            suggestion = importPath + 'index.js';
          } else if (!importPath.includes('index')) {
            // No slash and no index, add /index.js
            suggestion = importPath + '/index.js';
          }

          context.report({
            node,
            messageId: 'otherDirectoryNonIndex',
            data: {
              suggestion,
            },
            fix(fixer) {
              return fixer.replaceText(node.source as TSESTree.Literal, `'${suggestion}'`);
            },
          });
        }
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        checkImportPath(node, node.source.value);
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source) {
          checkImportPath(node, node.source.value);
        }
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        checkImportPath(node, node.source.value);
      },
    };
  },
});
