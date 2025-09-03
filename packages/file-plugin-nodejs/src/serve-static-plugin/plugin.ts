import {
  defineKoriPlugin,
  type KoriRequest,
  type KoriResponse,
  type KoriLogger,
  type KoriEnvironment,
  type KoriPlugin,
  createKoriPluginLogger,
} from '@korix/kori';

import { PLUGIN_VERSION } from '../version/index.js';
import { handleStaticFileRequest } from './serve/index.js';

import { type ServeStaticOptions } from './options.js';

const PLUGIN_NAME = 'serve-static-nodejs';

const defaultOptions: Required<Omit<ServeStaticOptions, 'serveFrom'>> = {
  mountAt: '/static',
  index: ['index.html'],
  dotfiles: 'deny',
  maxAge: 0,
  etag: true,
  lastModified: true,
  immutable: false,
  ranges: true,
  maxRanges: 1,
};

function validateOptions(options: ServeStaticOptions, log: KoriLogger): void {
  if (!options.serveFrom) {
    const errorMessage = 'Static file plugin requires a serveFrom directory';
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (options.maxAge !== undefined && options.maxAge < 0) {
    const errorMessage = 'maxAge must be a non-negative number';
    log.error(errorMessage, { maxAge: options.maxAge });
    throw new Error(errorMessage);
  }

  if (options.mountAt && !options.mountAt.startsWith('/')) {
    const errorMessage = 'mountAt must start with "/"';
    log.error(errorMessage, { mountAt: options.mountAt });
    throw new Error(errorMessage);
  }
}

function removeMountPrefix(pathname: string, mountAt: string): string {
  if (pathname === mountAt) {
    return '/';
  }

  if (!pathname.startsWith(mountAt)) {
    throw new Error(
      `[INTERNAL] Pathname "${pathname}" does not start with mount prefix "${mountAt}". This indicates a routing system bug.`,
    );
  }

  return pathname.slice(mountAt.length);
}

/**
 * Static file serving plugin for Node.js
 *
 * Features:
 * - Secure file serving with path traversal protection
 * - Streaming file delivery for efficient memory usage
 * - MIME type detection for proper Content-Type headers
 * - Caching support with ETag and Last-Modified headers
 * - Configurable cache max-age
 * - Index file resolution for directory requests
 * - Dotfiles handling
 */
export function serveStaticPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  userOptions: ServeStaticOptions,
): KoriPlugin<Env, Req, Res> {
  const options = {
    ...defaultOptions,
    ...userOptions,
  };

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      const log = createKoriPluginLogger({ baseLogger: kori.log(), pluginName: PLUGIN_NAME });

      validateOptions(options, log);

      log.info('Static file plugin initialized', {
        serveFrom: options.serveFrom,
        mountAt: options.mountAt,
        index: options.index,
        dotfiles: options.dotfiles,
        maxAge: options.maxAge,
        etag: options.etag,
        lastModified: options.lastModified,
      });

      return kori.get(`${options.mountAt}/*`, async (ctx) => {
        const requestLog = createKoriPluginLogger({ baseLogger: ctx.log(), pluginName: PLUGIN_NAME });
        const pathname = ctx.req.url().pathname;
        const requestPath = removeMountPrefix(pathname, options.mountAt);
        return await handleStaticFileRequest(ctx.req, ctx.res, requestPath, options, requestLog);
      });
    },
  });
}
