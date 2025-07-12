import { asciiOnlySource } from './ascii-only-source.js';
import { noDuplicateExportFrom } from './no-duplicate-export-from.js';
import { noIndexImports } from './no-index-imports.js';

export const rules = {
  'ascii-only-source': asciiOnlySource,
  'no-duplicate-export-from': noDuplicateExportFrom,
  'no-index-imports': noIndexImports,
};

export default { rules };
