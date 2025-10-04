import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriLogger,
  createKoriPluginLogger,
  HttpStatus,
} from '@korix/kori';

import type { FileAdapter } from '@korix/file-adapter';
import { normalizePath, createCacheControl, compareEtags } from '@korix/file-adapter';

/**
 * Options for configuring dotfiles behavior.
 */
export type DotfilesOptions = 'allow' | 'deny' | {
  /**
   * Allow .well-known files (for ACME challenges, security.txt, etc.)
   */
  allowWellKnown: boolean;
};

/**
 * Options for configuring static file serving.
 */
export type ServeStaticOptions = {
  /**
   * Path prefix where static files are served.
   * All requests matching this prefix will be handled by the plugin.
   */
  mountAt: string;
  
  /**
   * File adapter instance for reading files.
   */
  adapter: FileAdapter;
  
  /**
   * Maximum age in seconds for Cache-Control header.
   * Defaults to 0 (no caching).
   */
  maxAge?: number;
  
  /**
   * Whether the files are immutable (never change).
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
  
  /**
   * Index file names to serve for directory requests.
   * Defaults to ['index.html'].
   */
  index?: string[];
  
  /**
   * How to handle dotfiles (files starting with .).
   * - 'allow': Serve dotfiles normally
   * - 'deny': Return 404 for dotfiles
   * - object: Custom configuration for well-known files
   * 
   * Defaults to { allowWellKnown: true }
   */
  dotfiles?: DotfilesOptions;
};

const PLUGIN_NAME = 'serve-static';
const PLUGIN_VERSION = '0.1.0';

/**
 * Checks if a file path is a dotfile.
 */
function isDotfile(filePath: string): boolean {
  const segments = filePath.split('/');
  return segments.some(segment => segment.startsWith('.') && segment !== '.');
}

/**
 * Checks if a dotfile should be allowed based on dotfiles configuration.
 */
function isDotfileAllowed(filePath: string, dotfiles: DotfilesOptions): boolean {
  if (!isDotfile(filePath)) {
    return true; // Not a dotfile
  }
  
  if (dotfiles === 'allow') {
    return true;
  }
  
  if (dotfiles === 'deny') {
    return false;
  }
  
  // Object configuration
  if (dotfiles.allowWellKnown && filePath.startsWith('.well-known/')) {
    return true;
  }
  
  return false;
}

/**
 * Removes the mount prefix from a request path.
 */
function stripMountPrefix(requestPath: string, mountAt: string): string {
  // Normalize mount path
  const normalizedMount = mountAt.endsWith('/') ? mountAt.slice(0, -1) : mountAt;
  
  if (requestPath === normalizedMount || requestPath === normalizedMount + '/') {
    return '';
  }
  
  if (requestPath.startsWith(normalizedMount + '/')) {
    return requestPath.slice(normalizedMount.length + 1);
  }
  
  return requestPath;
}

/**
 * Checks if the request method should be handled by the static server.
 */
function isHandledMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

/**
 * Checks if the resource has been modified based on request headers.
 */
function isNotModified(
  ctx: KoriHandlerContext<any, any, any>,
  etag?: string,
  lastModified?: Date,
): boolean {
  const request = ctx.req.raw();
  
  // Check If-None-Match (ETag)
  if (etag) {
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch) {
      // Handle both strong and weak ETags
      if (ifNoneMatch === '*' || compareEtags(ifNoneMatch, etag)) {
        return true;
      }
    }
  }
  
  // Check If-Modified-Since (Last-Modified)
  if (lastModified) {
    const ifModifiedSince = request.headers.get('if-modified-since');
    if (ifModifiedSince) {
      try {
        const ifModifiedSinceDate = new Date(ifModifiedSince);
        // Use Math.floor to ignore milliseconds (HTTP dates don't include them)
        if (Math.floor(lastModified.getTime() / 1000) <= Math.floor(ifModifiedSinceDate.getTime() / 1000)) {
          return true;
        }
      } catch {
        // Invalid date, ignore
      }
    }
  }
  
  return false;
}

/**
 * Creates a static file serving plugin for Kori.
 * 
 * This plugin serves static files from a file adapter with support for:
 * - HTTP caching (ETag, Last-Modified, Cache-Control)
 * - 304 Not Modified responses
 * - HEAD request support
 * - Index file serving
 * - Dotfiles control
 * - Security against path traversal
 * 
 * @param options - Configuration options for the static server
 * @returns Kori plugin instance
 * 
 * @example
 * ```typescript
 * import { createKori } from '@korix/kori';
 * import { createNodeFileAdapter } from '@korix/file-adapter-node';
 * import { serveStaticPlugin } from '@korix/serve-static-plugin';
 * 
 * const adapter = createNodeFileAdapter({ root: './public' });
 * const app = createKori();
 * 
 * app.use(serveStaticPlugin({
 *   mountAt: '/static',
 *   adapter,
 *   maxAge: 3600, // 1 hour
 *   etag: true,
 *   lastModified: true,
 * }));
 * ```
 */
export function serveStaticPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(options: ServeStaticOptions): KoriPlugin<Env, Req, Res> {
  const {
    mountAt,
    adapter,
    maxAge = 0,
    immutable = false,
    etag: enableEtag = true,
    lastModified: enableLastModified = true,
    index = ['index.html'],
    dotfiles = { allowWellKnown: true },
  } = options;

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      const log = createKoriPluginLogger({ baseLogger: kori.log(), pluginName: PLUGIN_NAME });
      
      log.info('Static file server initialized', {
        mountAt,
        maxAge,
        immutable,
        etag: enableEtag,
        lastModified: enableLastModified,
        indexFiles: index,
        dotfiles: typeof dotfiles === 'string' ? dotfiles : 'custom',
      });

      // Add route handler for static files
      kori.get(`${mountAt}/*`, async (ctx) => {
        const requestPath = ctx.req.path();
        const method = ctx.req.method();
        
        // Only handle GET and HEAD requests
        if (!isHandledMethod(method)) {
          return; // Let other handlers deal with it
        }
        
        // Strip mount prefix to get file path
        const filePath = stripMountPrefix(requestPath, mountAt);
        
        try {
          // Normalize the file path
          let normalizedPath = normalizePath(filePath);
          
          // Check dotfile access
          if (!isDotfileAllowed(normalizedPath, dotfiles)) {
            log.debug('Dotfile access denied', { path: normalizedPath });
            return ctx.res.status(HttpStatus.NOT_FOUND).text('Not Found');
          }
          
          // Check if file exists first
          const exists = await adapter.exists(normalizedPath);
          if (!exists && normalizedPath !== '') {
            log.debug('File not found', { path: normalizedPath });
            return ctx.res.status(HttpStatus.NOT_FOUND).text('Not Found');
          }
          
          // If path is empty or directory, try index files
          if (normalizedPath === '' || exists) {
            const stats = await adapter.stat(normalizedPath || '.');
            
            if (stats.isDirectory) {
              let indexFound = false;
              
              for (const indexFile of index) {
                const indexPath = normalizedPath ? `${normalizedPath}/${indexFile}` : indexFile;
                const indexNormalized = normalizePath(indexPath);
                
                if (await adapter.exists(indexNormalized)) {
                  normalizedPath = indexNormalized;
                  indexFound = true;
                  break;
                }
              }
              
              if (!indexFound) {
                log.debug('No index file found in directory', { path: normalizedPath });
                return ctx.res.status(HttpStatus.NOT_FOUND).text('Not Found');
              }
            }
          }
          
          // Get file info
          const fileInfo = await adapter.read(normalizedPath);
          
          // Check for conditional requests (304 Not Modified)
          const fileEtag = enableEtag ? fileInfo.etag : undefined;
          const fileLastModified = enableLastModified ? fileInfo.mtime : undefined;
          
          if (isNotModified(ctx, fileEtag, fileLastModified)) {
            log.debug('Returning 304 Not Modified', { path: normalizedPath });
            return ctx.res.status(HttpStatus.NOT_MODIFIED).empty();
          }
          
          // Set caching headers
          if (fileEtag) {
            ctx.res.setHeader('etag', fileEtag);
          }
          
          if (fileLastModified) {
            ctx.res.setHeader('last-modified', fileLastModified.toUTCString());
          }
          
          // Set Cache-Control header
          const cacheControl = createCacheControl({
            maxAge,
            immutable,
            public: true,
          });
          ctx.res.setHeader('cache-control', cacheControl);
          
          // Set Content-Type
          ctx.res.setHeader('content-type', fileInfo.contentType);
          
          // For HEAD requests, return headers only
          if (method === 'HEAD') {
            ctx.res.setHeader('content-length', fileInfo.size.toString());
            return ctx.res.status(HttpStatus.OK).empty();
          }
          
          // Stream the file content
          log.debug('Serving static file', { 
            path: normalizedPath, 
            size: fileInfo.size,
            contentType: fileInfo.contentType,
          });
          
          return ctx.res
            .status(HttpStatus.OK)
            .stream(fileInfo.body);
            
        } catch (error: any) {
          log.error('Error serving static file', {
            path: filePath,
            error: error.message,
          });
          
          if (error.message.includes('File not found')) {
            return ctx.res.status(HttpStatus.NOT_FOUND).text('Not Found');
          }
          
          if (error.message.includes('Path is not a file')) {
            return ctx.res.status(HttpStatus.NOT_FOUND).text('Not Found');
          }
          
          if (error.message.includes('Unsafe path') || error.message.includes('Path traversal')) {
            log.warn('Path traversal attempt blocked', { path: filePath });
            return ctx.res.status(HttpStatus.FORBIDDEN).text('Forbidden');
          }
          
          return ctx.res.status(HttpStatus.INTERNAL_SERVER_ERROR).text('Internal Server Error');
        }
      });
    },
  });
}