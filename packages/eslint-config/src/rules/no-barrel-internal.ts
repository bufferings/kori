import { ESLintUtils, TSESTree, type TSESLint } from '@typescript-eslint/utils';
import ts from 'typescript';

const createRule = ESLintUtils.RuleCreator(
  (ruleName) => `https://github.com/bufferings/kori/blob/main/docs/rules/${ruleName}.md`,
);

function getTargetSymbol(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
}

/** Determine visibility based on JSDoc tags */
function getVisibility(symbol: ts.Symbol): 'internal' | 'packageInternal' | 'public' {
  const tags = symbol.getJsDocTags().map((t) => t.name);
  if (tags.includes('internal')) {
    return 'internal';
  }
  if (tags.includes('packageInternal')) {
    return 'packageInternal';
  }
  return 'public';
}

export const noBarrelInternal = createRule({
  name: 'no-barrel-internal',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow exporting symbols marked with @internal or @packageInternal from barrel files based on their visibility level',
    },
    schema: [],
    messages: {
      internalExport: 'Cannot export {{visibility}} symbol "{{name}}" from {{fileType}} barrel file',
    },
  },
  defaultOptions: [],
  create(context) {
    const isIndexFile = context.filename.endsWith('/index.ts');
    if (!isIndexFile) {
      return {};
    }

    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    const report = (node: TSESTree.Node, name: string, visibility: string, fileType: string): void => {
      context.report({ node, messageId: 'internalExport', data: { name, visibility, fileType } });
    };

    const verifySymbol = (esNode: TSESTree.Node, tsNode: ts.Node): void => {
      const sym = checker.getSymbolAtLocation(tsNode);
      if (!sym) {
        return;
      }
      const target = getTargetSymbol(sym, checker);
      const vis = getVisibility(target);

      const isAnyIndex = context.filename.endsWith('/index.ts');
      const isRootIndex = /[\\/]src[\\/]index\.ts$/.test(context.filename);

      let fileType = 'unknown';
      if (isRootIndex) {
        fileType = 'root';
      } else if (isAnyIndex) {
        fileType = 'folder-level';
      }

      if ((vis === 'internal' && isAnyIndex) || (vis === 'packageInternal' && isRootIndex)) {
        report(esNode, checker.symbolToString(target), vis, fileType);
      }
    };

    return {
      ExportNamedDeclaration(node) {
        if (node.source) {
          for (const spec of node.specifiers) {
            if (spec.type !== TSESTree.AST_NODE_TYPES.ExportSpecifier) {
              continue;
            }
            verifySymbol(spec, services.esTreeNodeToTSNodeMap.get(spec.local));
          }
        }
        if (!node.source && node.specifiers.length) {
          for (const spec of node.specifiers) {
            if (spec.type !== TSESTree.AST_NODE_TYPES.ExportSpecifier) {
              continue;
            }
            verifySymbol(spec, services.esTreeNodeToTSNodeMap.get(spec.local));
          }
        }
        if (node.declaration) {
          const declTs = services.esTreeNodeToTSNodeMap.get(node.declaration as unknown as TSESTree.Node);
          if (ts.isVariableDeclarationList(declTs)) {
            declTs.declarations.forEach((d) => {
              if (ts.isIdentifier(d.name)) {
                verifySymbol(node.declaration as TSESTree.Node, d.name);
              }
            });
          } else if ('id' in declTs) {
            const id = (declTs as { id: ts.Node }).id;
            if (ts.isIdentifier(id)) {
              verifySymbol(node.declaration as TSESTree.Node, id);
            }
          }
        }
      },
      ExportAllDeclaration(node) {
        const tsNode = services.esTreeNodeToTSNodeMap.get(node);
        const symbol = checker.getSymbolAtLocation(tsNode);
        symbol?.exports?.forEach((exp, name) => {
          const vis = getVisibility(exp);
          if (vis === 'internal' || vis === 'packageInternal') {
            // For ExportAll, we are in src/index.ts (root), so both tags are illegal
            report(node, name.toString(), vis, 'root');
          }
        });
      },
    } as TSESLint.RuleListener;
  },
});
