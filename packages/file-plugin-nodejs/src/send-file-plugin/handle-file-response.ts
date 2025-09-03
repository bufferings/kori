import { HttpResponseHeader, HttpStatus } from '@korix/kori';
import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriLogger,
  type KoriRequest,
  type KoriResponse,
} from '@korix/kori';

import {
  createFileStream,
  createMultipartStream,
  createPartialFileStream,
  detectMimeType,
  generateBoundary,
  generateContentRangeHeader,
  getFileStats,
  isNotModified,
  parseRangeHeader,
  RangeConstants,
  setCacheHeaders,
} from '../share/index.js';
import { resolveFilename, resolveFilePath } from './file/index.js';
import { createContentDispositionHeader } from './header/index.js';

export type SendFileOptions = {
  maxAge?: number;
  immutable?: boolean;
  etag?: boolean;
  lastModified?: boolean;
  ranges?: boolean;
  maxRanges?: number;
};

export type DownloadOptions = SendFileOptions & {
  filename?: string;
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

    // Set default options
    const finalOptions = {
      maxAge: options?.maxAge ?? 0,
      immutable: options?.immutable ?? false,
      etag: options?.etag ?? true,
      lastModified: options?.lastModified ?? true,
      ranges: options?.ranges ?? true,
      maxRanges: options?.maxRanges ?? 1,
    };

    // Check for conditional requests (304 Not Modified)
    if ((finalOptions.etag || finalOptions.lastModified) && isNotModified(ctx.req, stats)) {
      log.debug('File not modified, returning 304', { filePath: resolvedPath });
      return ctx.res.status(HttpStatus.NOT_MODIFIED).empty();
    }

    const mimeType = detectMimeType(resolvedPath);
    const fileSize = stats.size;

    // Handle Range requests
    if (finalOptions.ranges) {
      const rangeHeader = ctx.req.header('range');
      if (rangeHeader) {
        const rangeResult = parseRangeHeader(rangeHeader, fileSize);

        if (!rangeResult.isSatisfiable || rangeResult.ranges.length === 0) {
          log.warn('Range not satisfiable', { filePath: resolvedPath, rangeHeader });
          ctx.res.setHeader(HttpResponseHeader.ACCEPT_RANGES, RangeConstants.BYTES);
          ctx.res.setHeader(HttpResponseHeader.CONTENT_RANGE, `bytes */${fileSize}`);
          return ctx.res.status(HttpStatus.RANGE_NOT_SATISFIABLE).empty();
        }

        // Check if requesting too many ranges
        if (rangeResult.ranges.length > finalOptions.maxRanges) {
          log.warn('Too many ranges requested', {
            path: resolvedPath,
            requestedRanges: rangeResult.ranges.length,
            maxRanges: finalOptions.maxRanges,
          });
          ctx.res.setHeader(HttpResponseHeader.ACCEPT_RANGES, RangeConstants.BYTES);
          ctx.res.setHeader(HttpResponseHeader.CONTENT_RANGE, `bytes */${fileSize}`);
          return ctx.res.status(HttpStatus.RANGE_NOT_SATISFIABLE).empty();
        }

        // Handle range requests
        if (rangeResult.ranges.length === 1) {
          // Single range request
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const range = rangeResult.ranges[0]!;
          const contentLength = range.end - range.start + 1;

          ctx.res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);
          ctx.res.setHeader(HttpResponseHeader.CONTENT_LENGTH, contentLength.toString());
          ctx.res.setHeader(
            HttpResponseHeader.CONTENT_RANGE,
            generateContentRangeHeader(range.start, range.end, fileSize),
          );
          ctx.res.setHeader(HttpResponseHeader.ACCEPT_RANGES, RangeConstants.BYTES);

          // Set cache headers
          setCacheHeaders(ctx.res, {
            maxAge: finalOptions.maxAge,
            etag: finalOptions.etag,
            lastModified: finalOptions.lastModified,
            immutable: finalOptions.immutable,
            fileStats: stats,
          });

          const partialStream = createPartialFileStream(resolvedPath, range.start, range.end);

          if (mode === 'download') {
            const finalFilename = resolveFilename(resolvedPath, options?.filename);
            const contentDisposition = createContentDispositionHeader({
              disposition: 'attachment',
              filename: finalFilename,
            });
            ctx.res.setHeader(HttpResponseHeader.CONTENT_DISPOSITION, contentDisposition);
          }

          log.debug(`Sending partial file (${mode})`, {
            filePath: resolvedPath,
            range: `${range.start}-${range.end}`,
            contentLength,
            totalSize: fileSize,
            mimeType,
          });

          return ctx.res.status(HttpStatus.PARTIAL_CONTENT).stream(partialStream);
        } else {
          // Multiple range request - use multipart response
          const boundary = generateBoundary();

          ctx.res.setHeader(HttpResponseHeader.CONTENT_TYPE, `multipart/byteranges; boundary=${boundary}`);
          ctx.res.setHeader(HttpResponseHeader.ACCEPT_RANGES, RangeConstants.BYTES);

          // Set cache headers
          setCacheHeaders(ctx.res, {
            maxAge: finalOptions.maxAge,
            etag: finalOptions.etag,
            lastModified: finalOptions.lastModified,
            immutable: finalOptions.immutable,
            fileStats: stats,
          });

          const multipartStream = createMultipartStream(resolvedPath, rangeResult.ranges, fileSize, mimeType, boundary);

          if (mode === 'download') {
            const finalFilename = resolveFilename(resolvedPath, options?.filename);
            const contentDisposition = createContentDispositionHeader({
              disposition: 'attachment',
              filename: finalFilename,
            });
            ctx.res.setHeader(HttpResponseHeader.CONTENT_DISPOSITION, contentDisposition);
          }

          log.debug(`Sending multipart file (${mode})`, {
            filePath: resolvedPath,
            rangeCount: rangeResult.ranges.length,
            ranges: rangeResult.ranges.map((r) => `${r.start}-${r.end}`),
            totalSize: fileSize,
            mimeType,
            boundary,
          });

          return ctx.res.status(HttpStatus.PARTIAL_CONTENT).stream(multipartStream);
        }
      }
    }

    // Regular file response (no range request)
    ctx.res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);
    ctx.res.setHeader(HttpResponseHeader.CONTENT_LENGTH, stats.size.toString());

    if (finalOptions.ranges) {
      ctx.res.setHeader(HttpResponseHeader.ACCEPT_RANGES, RangeConstants.BYTES);
    }

    // Set cache headers
    setCacheHeaders(ctx.res, {
      maxAge: finalOptions.maxAge,
      etag: finalOptions.etag,
      lastModified: finalOptions.lastModified,
      immutable: finalOptions.immutable,
      fileStats: stats,
    });

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
        maxAge: finalOptions.maxAge,
        immutable: finalOptions.immutable,
        filename: finalFilename,
      });
    } else {
      log.debug(`Sending file`, {
        filePath: resolvedPath,
        mimeType,
        size: stats.size,
        maxAge: finalOptions.maxAge,
        immutable: finalOptions.immutable,
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
