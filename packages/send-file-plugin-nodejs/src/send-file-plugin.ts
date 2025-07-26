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

const PLUGIN_NAME = 'send-file-plugin-nodejs';

export type SendFileOptions = { download?: false; filename?: string } | { download: true; filename?: string };

export type SendFileResponseExtension = {
  sendFile(filePath: string, options?: SendFileOptions): Promise<KoriResponse>;
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
 * Handle file sending logic (extracted for performance)
 */
async function handleSendFile<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  ctx: KoriHandlerContext<Env, Req, Res>,
  log: KoriLogger,
  filePath: string,
  options: SendFileOptions = {},
): Promise<KoriResponse> {
  const { download = false, filename } = options;

  try {
    // Check if file exists and get stats
    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      log.warn('Attempted to send non-file', { filePath });
      return ctx.res.notFound({ message: 'File not found' });
    }

    // Resolve filename
    const resolvedFilename = resolveFilename(filePath, filename);

    // Set headers
    const mimeType = detectMimeType(filePath);

    ctx.res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);
    ctx.res.setHeader(HttpResponseHeader.CONTENT_LENGTH, fileStats.size.toString());

    // Set Content-Disposition header based on download flag
    if (download || filename) {
      const disposition: ContentDisposition = download ? 'attachment' : 'inline';
      const contentDisposition = createContentDisposition({
        disposition,
        filename: resolvedFilename,
      });
      ctx.res.setHeader(HttpResponseHeader.CONTENT_DISPOSITION, contentDisposition);
    }

    // Create file stream
    const fileStream = createFileStream(filePath);

    log.debug('Sending file', {
      filePath,
      filename: resolvedFilename,
      download,
      mimeType,
      size: fileStats.size,
    });

    return ctx.res.status(HttpStatus.OK).stream(fileStream);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      log.warn('File not found', { filePath });
      return ctx.res.notFound({ message: 'File not found' });
    }

    log.error('File sending failed', { filePath, error });
    return ctx.res.internalError({ message: 'File sending failed' });
  }
}

/**
 * Send file plugin for Node.js
 *
 * Adds a `sendFile` method to the response object for file sending
 * with configurable Content-Disposition headers.
 */
export function sendFilePlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res, unknown, unknown, SendFileResponseExtension> {
  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      const log = kori.log().child(PLUGIN_NAME);

      log.info('Send file plugin initialized');

      return kori.onRequest((ctx) => {
        const sendFile = (filePath: string, options?: SendFileOptions) => handleSendFile(ctx, log, filePath, options);
        return ctx.withRes({ sendFile });
      });
    },
  });
}
