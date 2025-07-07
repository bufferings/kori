// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'node:path';

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
    const filename = context.filename;
    const currentDir = path.dirname(filename);

    function checkImportPath(node: TSESTree.Node & { source: TSESTree.Literal }, importPath: string) {
      // Skip external modules and absolute paths
      if (!importPath.startsWith('.')) {
        return;
      }

      // Resolve the absolute path of the import
      const resolvedPath = path.resolve(currentDir, importPath);
      const importDir = path.dirname(resolvedPath);
      const importFile = path.basename(resolvedPath);

      // Check if importing from index file or directory (which implies index)
      const isIndexImport =
        importFile === 'index' ||
        importFile === 'index.js' ||
        importFile === 'index.ts' ||
        importFile === 'index.tsx' ||
        importPath.endsWith('/') ||
        importPath === '.' ||
        importPath === '..' ||
        importPath.endsWith('/.') ||
        // Directory import (no file extension and no specific file) is considered index import
        (importPath.includes('/') && !importPath.includes('.') && !importPath.endsWith('/'));

      // Same directory check
      if (currentDir === importDir || (currentDir === resolvedPath && isIndexImport)) {
        if (isIndexImport) {
          context.report({
            node,
            messageId: 'sameDirectoryIndex',
          });
        }
      }
      // Other directory check
      else {
        if (
          !isIndexImport &&
          !importPath.includes('index') &&
          !importPath.endsWith('/') &&
          importPath !== '.' &&
          importPath !== '..'
        ) {
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
