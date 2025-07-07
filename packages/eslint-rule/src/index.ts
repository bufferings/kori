import { noIndexImports, noDuplicateExportFrom, asciiOnlySource } from './rules/index.js';

export const rules = {
  'no-index-imports': noIndexImports,
  'no-duplicate-export-from': noDuplicateExportFrom,
  'ascii-only-source': asciiOnlySource,
};

export default { rules };
