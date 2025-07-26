import { type Stats } from 'node:fs';
import { join } from 'node:path';

import { type KoriLogger } from '@korix/kori';

import { getFileStats } from '../../share/index.js';

export type FileInfo = {
  path: string;
  stats: Stats;
};

/**
 * Try to resolve index files for directory requests
 */
export async function resolveIndexFile(
  dirPath: string,
  indexFiles: string[],
  log: KoriLogger,
): Promise<FileInfo | null> {
  for (const indexFile of indexFiles) {
    const indexPath = join(dirPath, indexFile);
    const fileStatsResult = await getFileStats(indexPath);

    if (fileStatsResult.success && fileStatsResult.stats.isFile()) {
      log.debug('Resolved index file', { dirPath, indexFile, indexPath });
      return {
        path: indexPath,
        stats: fileStatsResult.stats,
      };
    }
  }

  return null;
}
