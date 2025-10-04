import type { FileAdapter } from '@korix/file-adapter';
import { createCacheControl, createContentDisposition, extractFilename } from '@korix/file-adapter';

import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  type KoriLogger,
  createKoriPluginLogger,
  HttpStatus,
} from '@korix/kori';

/**
 * Options for configuring the send-file plugin.
 */
export type SendFilePluginOptions = {
  /**
   * File adapter instance for reading files.
   */
  adapter: FileAdapter;
};

/**
 * Options for sending files.
 */
export type SendFileOptions = {
  /**
   * Maximum age in seconds for Cache-Control header.
   */
  maxAge?: number;
  
  /**
   * Whether the file is immutable (never changes).
   * When true, adds 'immutable' directive to Cache-Control.
   */
  immutable?: boolean;
  
  /**
   * Whether to generate and validate ETags.
   * Defaults to true.
   */
  etag?: boolean;
  
  /**
   * Whether to include Last-Modified header.
   * Defaults to true.
   */
  lastModified?: boolean;
};

/**
 * Options for downloading files.
 */
export type DownloadOptions = SendFileOptions & {
  /**
   * Custom filename for the Content-Disposition header.
   * If not provided, the filename will be extracted from the file path.
   */
  filename?: string;
};

/**
 * Extension methods added to the response object.
 */
export type SendFileExtension = {
  /**
   * Sends a file as the response with appropriate headers.
   * 
   * @param path - The file path to send
   * @param options - Optional configuration for file sending
   * @returns Promise that resolves to the configured response
   * 
   * @example
   * ```typescript
   * return ctx.res.sendFile('uploads/document.pdf', {
   *   maxAge: 3600,
   *   etag: true
   * });
   * ```
   */
  sendFile(path: string, options?: SendFileOptions): Promise<KoriResponse>;
  
  /**
   * Sends a file as a download with Content-Disposition attachment header.
   * 
   * @param path - The file path to send
   * @param options - Optional configuration for file downloading
   * @returns Promise that resolves to the configured response
   * 
   * @example
   * ```typescript
   * return ctx.res.download('uploads/report.pdf', {
   *   filename: 'monthly-report.pdf',
   *   maxAge: 0
   * });
   * ```
   */
  download(path: string, options?: DownloadOptions): Promise<KoriResponse>;
};

const PLUGIN_NAME = 'send-file';
const PLUGIN_VERSION = '0.1.0';

/**
 * Creates a send-file plugin that adds file sending capabilities to response objects.
 * 
 * This plugin extends the response object with `sendFile()` and `download()` methods
 * for sending files with appropriate HTTP headers, caching support, and security.
 * 
 * @param options - Configuration options for the plugin
 * @returns Kori plugin instance
 * 
 * @example
 * ```typescript
 * import { createKori } from '@korix/kori';
 * import { createNodeFileAdapter } from '@korix/file-adapter-node';
 * import { sendFilePlugin } from '@korix/send-file-plugin';
 * 
 * const adapter = createNodeFileAdapter({ root: './uploads' });
 * const app = createKori();
 * 
 * app.applyPlugin(sendFilePlugin({ adapter }));
 * 
 * app.get('/files/:filename', async (ctx) => {
 *   const filename = ctx.req.pathParams().filename;
 *   return ctx.res.sendFile(filename);
 * });
 * 
 * app.get('/download/:filename', async (ctx) => {
 *   const filename = ctx.req.pathParams().filename;
 *   return ctx.res.download(filename, {
 *     filename: `download-${filename}`,
 *     maxAge: 0
 *   });
 * });
 * ```
 */
export function sendFilePlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(options: SendFilePluginOptions): KoriPlugin<Env, Req, Res, object, object, SendFileExtension> {
  const { adapter } = options;

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      const log = createKoriPluginLogger({ baseLogger: kori.log(), pluginName: PLUGIN_NAME });
      
      log.info('Send-file plugin initialized');

      // Add hook to extend response objects
      return kori.onRequest((ctx) => {
        const sendFileExtension: SendFileExtension = {
          async sendFile(filePath: string, sendOptions: SendFileOptions = {}) {
            return sendFileInternal(ctx.res, adapter, filePath, sendOptions, 'inline', log);
          },
          
          async download(filePath: string, downloadOptions: DownloadOptions = {}) {
            return sendFileInternal(ctx.res, adapter, filePath, downloadOptions, 'attachment', log);
          },
        };
        
        return ctx.withRes(sendFileExtension);
      });
    },
  });
}

/**
 * Internal function to handle file sending logic.
 */
async function sendFileInternal(
  res: KoriResponse,
  adapter: FileAdapter,
  filePath: string,
  options: SendFileOptions | DownloadOptions,
  disposition: 'inline' | 'attachment',
  log: KoriLogger,
): Promise<KoriResponse> {
  const {
    maxAge = 0,
    immutable = false,
    etag: enableEtag = true,
    lastModified: enableLastModified = true,
  } = options;
  
  try {
    // Check if file exists first
    const exists = await adapter.exists(filePath);
    if (!exists) {
      log.debug('File not found for sending', { path: filePath });
      return res.status(HttpStatus.NOT_FOUND).text('File not found');
    }
    
    // Get file stats to ensure it's a file, not a directory
    const stats = await adapter.stat(filePath);
    if (!stats.isFile) {
      log.debug('Path is not a file', { path: filePath });
      return res.status(HttpStatus.NOT_FOUND).text('File not found');
    }
    
    // Read file info
    const fileInfo = await adapter.read(filePath);
    
    // Set Content-Type
    res.setHeader('content-type', fileInfo.contentType);
    
    // Set caching headers
    if (enableEtag && fileInfo.etag) {
      res.setHeader('etag', fileInfo.etag);
    }
    
    if (enableLastModified && fileInfo.mtime) {
      res.setHeader('last-modified', fileInfo.mtime.toUTCString());
    }
    
    // Set Cache-Control
    const cacheControl = createCacheControl({
      maxAge,
      immutable,
      public: true,
    });
    res.setHeader('cache-control', cacheControl);
    
    // Set Content-Disposition
    const filename = 'filename' in options && options.filename 
      ? options.filename 
      : extractFilename(filePath);
    
    if (filename) {
      const contentDisposition = createContentDisposition({ filename, type: disposition });
      res.setHeader('content-disposition', contentDisposition);
    }
    
    // Set Content-Length
    res.setHeader('content-length', fileInfo.size.toString());
    
    log.debug('Sending file', {
      path: filePath,
      size: fileInfo.size,
      contentType: fileInfo.contentType,
      disposition,
      filename,
    });
    
    // Stream the file
    return res.status(HttpStatus.OK).stream(fileInfo.body);
    
  } catch (error: any) {
    log.error('Error sending file', {
      path: filePath,
      error: error.message,
    });
    
    if (error.message.includes('File not found')) {
      return res.status(HttpStatus.NOT_FOUND).text('File not found');
    }
    
    if (error.message.includes('Path is not a file')) {
      return res.status(HttpStatus.NOT_FOUND).text('File not found');
    }
    
    if (error.message.includes('Unsafe path') || error.message.includes('Path traversal')) {
      log.warn('Path traversal attempt blocked', { path: filePath });
      return res.status(HttpStatus.FORBIDDEN).text('Access denied');
    }
    
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).text('Internal server error');
  }
}