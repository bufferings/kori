import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriLogger,
  HttpResponseHeader,
  HttpStatus,
} from '@korix/kori';
import mime from 'mime-types';

import { createContentDisposition, resolveFilename, type ContentDisposition } from './content-disposition.js';
import { PLUGIN_VERSION } from './version.js';

const PLUGIN_NAME = 'download-plugin-nodejs';

export type DownloadOptions = {
  filePath: string;
  downloadFilename?: string;
  disposition?: ContentDisposition;
};

export type DownloadResponseExtension = {
  download(options: DownloadOptions): Promise<KoriResponse>;
};

/**
 * Convert Node.js ReadStream to Web Streams ReadableStream
 */
function createFileStream(filePath: string): ReadableStream {
  const nodeStream = createReadStream(filePath);

  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      nodeStream.on('end', () => {
        controller.close();
      });

      nodeStream.on('error', (error) => {
        controller.error(error);
      });
    },

    cancel() {
      nodeStream.destroy();
    },
  });
}

/**
 * MIME type detection using mime-types library for comprehensive coverage
 */
export function detectMimeType(filePath: string): string {
  const mimeType = mime.lookup(filePath);
  return mimeType || 'application/octet-stream';
}

/**
 * Handle file download logic (extracted for performance)
 */
async function handleDownload<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  ctx: KoriHandlerContext<Env, Req, Res>,
  log: KoriLogger,
  options: DownloadOptions,
): Promise<KoriResponse> {
  const { filePath, downloadFilename, disposition = 'attachment' } = options;

  try {
    // Check if file exists and get stats
    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      log.warn('Attempted to download non-file', { filePath });
      return ctx.res.notFound({ message: 'File not found' });
    }

    // Resolve filename
    const resolvedFilename = resolveFilename(filePath, downloadFilename);

    // Set headers
    const mimeType = detectMimeType(filePath);
    const contentDisposition = createContentDisposition({
      disposition,
      filename: resolvedFilename,
    });

    ctx.res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);
    ctx.res.setHeader(HttpResponseHeader.CONTENT_DISPOSITION, contentDisposition);
    ctx.res.setHeader(HttpResponseHeader.CONTENT_LENGTH, fileStats.size.toString());

    // Create file stream
    const fileStream = createFileStream(filePath);

    log.debug('Serving file download', {
      filePath,
      downloadFilename: resolvedFilename,
      disposition,
      mimeType,
      size: fileStats.size,
    });

    return ctx.res.status(HttpStatus.OK).stream(fileStream);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      log.warn('File not found', { filePath });
      return ctx.res.notFound({ message: 'File not found' });
    }

    log.error('Download failed', { filePath, error });
    return ctx.res.internalError({ message: 'Download failed' });
  }
}

/**
 * Download plugin for Node.js
 *
 * Adds a `download` method to the response object for file downloads
 * with proper Content-Disposition headers.
 */
export function downloadPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res, unknown, unknown, DownloadResponseExtension> {
  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      const log = kori.log().child(PLUGIN_NAME);

      log.info('Download plugin initialized');

      return kori.onRequest((ctx) => {
        const download = (options: DownloadOptions) => handleDownload(ctx, log, options);
        return ctx.withRes({ download });
      });
    },
  });
}
