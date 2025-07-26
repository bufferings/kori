import { HttpResponseHeader, HttpStatus } from '@korix/kori';
import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriLogger,
  type KoriRequest,
  type KoriResponse,
} from '@korix/kori';

import { createFileStream, getFileStats, resolveFilename, resolveFilePath } from './file/index.js';
import { createCacheControlHeader, createContentDispositionHeader, detectMimeType } from './header/index.js';

export type SendFileOptions = {
  maxAge?: number;
  immutable?: boolean;
};

export type DownloadOptions = {
  filename?: string;
  maxAge?: number;
  immutable?: boolean;
};

export async function handleFileResponse<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>({
  ctx,
  log,
  filePath,
  mode,
  options,
  pluginRoot,
}: {
  ctx: KoriHandlerContext<Env, Req, Res>;
  log: KoriLogger;
  filePath: string;
  options?: SendFileOptions | DownloadOptions;
  pluginRoot?: string;
} & (
  | {
      mode: 'sendFile';
      options?: SendFileOptions;
    }
  | {
      mode: 'download';
      options?: DownloadOptions;
    }
)): Promise<KoriResponse> {
  try {
    const resolvedPath = resolveFilePath(filePath, pluginRoot);

    const result = await getFileStats(resolvedPath);
    if (!result.success) {
      const err = result.error;
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        log.warn('File not found', { filePath: resolvedPath });
      } else {
        log.error('File access failed', { filePath: resolvedPath, error: err });
      }
      return ctx.res.notFound({ message: 'File not found' });
    }

    const stats = result.stats;
    if (!stats.isFile()) {
      log.warn('Attempted to send non-file', { filePath: resolvedPath });
      return ctx.res.notFound({ message: 'File not found' });
    }

    const mimeType = detectMimeType(resolvedPath);

    ctx.res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);
    ctx.res.setHeader(HttpResponseHeader.CONTENT_LENGTH, stats.size.toString());

    const cacheControl = createCacheControlHeader(options?.maxAge, options?.immutable);
    if (cacheControl) {
      ctx.res.setHeader(HttpResponseHeader.CACHE_CONTROL, cacheControl);
    }

    const fileStream = createFileStream(resolvedPath);

    if (mode === 'download') {
      const finalFilename = resolveFilename(resolvedPath, options?.filename);
      const contentDisposition = createContentDispositionHeader({
        disposition: 'attachment',
        filename: finalFilename,
      });
      ctx.res.setHeader(HttpResponseHeader.CONTENT_DISPOSITION, contentDisposition);

      log.debug(`Downloading file`, {
        filePath: resolvedPath,
        mimeType,
        size: stats.size,
        maxAge: options?.maxAge,
        immutable: options?.immutable,
        filename: finalFilename,
      });
    } else {
      // For sendFile: no Content-Disposition header (browser decides)
      log.debug(`Sending file`, {
        filePath: resolvedPath,
        mimeType,
        size: stats.size,
        maxAge: options?.maxAge,
        immutable: options?.immutable,
      });
    }

    return ctx.res.status(HttpStatus.OK).stream(fileStream);
  } catch (error: unknown) {
    if (mode === 'download') {
      log.error(`File download failed`, { filePath, error });
    } else {
      log.error(`File sending failed`, { filePath, error });
    }
    return ctx.res.internalError({ message: `File ${mode} failed` });
  }
}
