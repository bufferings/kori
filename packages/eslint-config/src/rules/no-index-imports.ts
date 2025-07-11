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

      // Check if importing from index file or directory (which implies index)
      const isIndexImport =
        importPath === '.' ||
        importPath === './' ||
        importPath === './index' ||
        importPath === './index.js' ||
        importPath === './index.ts' ||
        importPath === './index.tsx' ||
        importPath.endsWith('/index') ||
        importPath.endsWith('/index.js') ||
        importPath.endsWith('/index.ts') ||
        importPath.endsWith('/index.tsx') ||
        importPath.endsWith('/') ||
        // Directory import without extension is also index import
        (!importPath.includes('.') && importPath !== '.');

      // Check if it's a same directory import
      const isSameDirectory = importPath.startsWith('./') || importPath === '.';

      // Check if it's actually a subdirectory import
      // ./helper.js is same directory, ./subdir/foo.js is subdirectory
      const hasSubdir = isSameDirectory && importPath.slice(2).includes('/');

      // Same directory check (not subdirectory)
      if (isSameDirectory && !hasSubdir) {
        if (isIndexImport) {
          context.report({
            node,
            messageId: 'sameDirectoryIndex',
          });
        }
      }
      // Other directory check (including subdirectories)
      else if (hasSubdir || !isSameDirectory) {
        if (!isIndexImport) {
          // Suggest the index import path
          let suggestion = importPath;
          if (importPath.endsWith('.js') || importPath.endsWith('.ts') || importPath.endsWith('.tsx')) {
            const dir = importPath.substring(0, importPath.lastIndexOf('/'));
            suggestion = dir + '/index.js';
          } else if (!importPath.endsWith('/') && !importPath.includes('index')) {
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
