import { type KoriRequest, type KoriResponse, type KoriLogger } from '@korix/kori';

import { getFileStats } from '../../share/index.js';
import { resolveIndexFile, type FileInfo } from '../file/index.js';
import { type ServeStaticOptions } from '../index.js';
import { resolveSafePath } from '../security/index.js';

import { serveFile } from './serve-file.js';

export async function handleStaticFileRequest(
  req: KoriRequest,
  res: KoriResponse,
  requestPath: string,
  options: Required<ServeStaticOptions>,
  log: KoriLogger,
): Promise<KoriResponse> {
  const resolvedPath = resolveSafePath(requestPath, options.serveFrom);

  if (!resolvedPath.isValid) {
    log.warn('Invalid file path detected', { requestPath });
    return res.notFound({
      message: 'File not found',
    });
  }

  if (resolvedPath.isDotfile && options.dotfiles === 'deny') {
    log.debug('Dotfile access denied', { path: resolvedPath.safePath });
    return res.notFound({
      message: 'File not found',
    });
  }

  const fileStatsResult = await getFileStats(resolvedPath.safePath);

  if (!fileStatsResult.success) {
    log.debug('File not found', { path: resolvedPath.safePath });
    return res.notFound({
      message: 'File not found',
    });
  }

  let fileInfo: FileInfo = { path: resolvedPath.safePath, stats: fileStatsResult.stats };

  if (fileStatsResult.stats.isDirectory()) {
    if (options.index === false) {
      log.debug('Directory listing disabled', { path: resolvedPath.safePath });
      return res.notFound({
        message: 'File not found',
      });
    }

    const indexFile = await resolveIndexFile(resolvedPath.safePath, options.index, log);
    if (!indexFile) {
      log.debug('No index file found in directory', { path: resolvedPath.safePath });
      return res.notFound({
        message: 'File not found',
      });
    }
    fileInfo = indexFile;
  }

  if (!fileInfo.stats.isFile()) {
    log.debug('Path is not a regular file', { path: resolvedPath.safePath });
    return res.notFound({
      message: 'File not found',
    });
  }

  return serveFile(req, res, fileInfo, options, log);
}
