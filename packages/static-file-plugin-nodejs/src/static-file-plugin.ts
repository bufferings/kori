import {
  defineKoriPlugin,
  type KoriRequest,
  type KoriResponse,
  type KoriLogger,
  type KoriEnvironment,
  type KoriPlugin,
  HttpStatus,
  HttpResponseHeader,
} from '@korix/kori';

import {
  resolveSafePath,
  getFileInfo,
  resolveIndexFile,
  isDotfileAllowed,
  generateETag,
  formatLastModified,
  createFileStream,
  createPartialFileStream,
  parseRangeHeader,
  generateContentRangeHeader,
  isRangeRequest,
  type ExistingFileInfo,
} from './file-utils.js';
import { detectMimeType } from './mime-types.js';
import { type StaticFileOptions } from './static-file-options.js';
import { PLUGIN_VERSION } from './version.js';

const PLUGIN_NAME = 'static-file-plugin-nodejs';

/**
 * Default configuration for static file serving
 */
const defaultOptions: Required<Omit<StaticFileOptions, 'serveFrom'>> = {
  mountAt: '/static',
  index: ['index.html'],
  dotfiles: 'deny',
  maxAge: 0,
  etag: true,
  lastModified: true,
  ranges: true,
  maxRanges: 1,
};

/**
 * Validates plugin options
 */
function validateOptions(options: StaticFileOptions, log: KoriLogger): void {
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

function setCacheHeaders(
  res: KoriResponse,
  fileInfo: ExistingFileInfo,
  options: Required<Pick<StaticFileOptions, 'maxAge' | 'etag' | 'lastModified'>>,
): void {
  if (options.maxAge > 0) {
    res.setHeader(HttpResponseHeader.CACHE_CONTROL, `public, max-age=${options.maxAge}`);
  } else {
    res.setHeader(HttpResponseHeader.CACHE_CONTROL, 'no-cache');
  }
  if (options.etag) {
    const etag = generateETag(fileInfo.stats);
    res.setHeader(HttpResponseHeader.ETAG, etag);
  }
  if (options.lastModified) {
    const lastModified = formatLastModified(fileInfo.stats.mtime);
    res.setHeader(HttpResponseHeader.LAST_MODIFIED, lastModified);
  }
}

function checkConditionalRequest(req: KoriRequest, fileInfo: ExistingFileInfo): boolean {
  const ifNoneMatch = req.header('if-none-match');
  if (ifNoneMatch) {
    const etag = generateETag(fileInfo.stats);
    return ifNoneMatch === etag;
  }
  return false;
}

function serveFile(
  req: KoriRequest,
  res: KoriResponse,
  fileInfo: ExistingFileInfo,
  options: Required<Pick<StaticFileOptions, 'maxAge' | 'etag' | 'lastModified' | 'ranges' | 'maxRanges'>>,
  log: KoriLogger,
): KoriResponse {
  const mimeType = detectMimeType(fileInfo.path);

  // Check for conditional request first
  if (checkConditionalRequest(req, fileInfo)) {
    log.debug('Serving 304 Not Modified', { path: fileInfo.path });
    return res.status(HttpStatus.NOT_MODIFIED).empty();
  }

  // Check if this is a range request and ranges are enabled
  const rangeHeader = req.header('range');
  if (options.ranges && isRangeRequest(rangeHeader)) {
    return serveRangeRequest(req, res, fileInfo, options, log, rangeHeader);
  }

  // Serve full file (existing logic)
  res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);
  res.setHeader(HttpResponseHeader.CONTENT_LENGTH, fileInfo.stats.size.toString());
  res.setHeader('Accept-Ranges', options.ranges ? 'bytes' : 'none');
  setCacheHeaders(res, fileInfo, options);

  log.debug('Serving complete file', {
    path: fileInfo.path,
    size: fileInfo.stats.size,
    mimeType,
  });

  const fileStream = createFileStream(fileInfo.path);
  return res.status(HttpStatus.OK).stream(fileStream);
}

function serveRangeRequest(
  req: KoriRequest,
  res: KoriResponse,
  fileInfo: ExistingFileInfo,
  options: Required<Pick<StaticFileOptions, 'maxAge' | 'etag' | 'lastModified' | 'ranges' | 'maxRanges'>>,
  log: KoriLogger,
  rangeHeader: string | undefined,
): KoriResponse {
  const mimeType = detectMimeType(fileInfo.path);
  const fileSize = fileInfo.stats.size;

  // Parse range header
  const rangeResult = parseRangeHeader(rangeHeader, fileSize);

  if (!rangeResult.isSatisfiable || rangeResult.ranges.length === 0) {
    log.debug('Range not satisfiable', {
      path: fileInfo.path,
      rangeHeader,
      fileSize,
    });

    // Set headers for 416 response
    res.setHeader('Content-Range', `bytes */${fileSize}`);
    res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);

    return res.status(416).json({
      error: {
        type: 'RANGE_NOT_SATISFIABLE',
        message: 'Requested range not satisfiable',
      },
    });
  }

  // Check if requesting too many ranges
  if (rangeResult.ranges.length > options.maxRanges) {
    log.warn('Too many ranges requested', {
      path: fileInfo.path,
      requestedRanges: rangeResult.ranges.length,
      maxRanges: options.maxRanges,
    });

    return res.status(416).json({
      error: {
        type: 'TOO_MANY_RANGES',
        message: `Too many ranges requested. Maximum allowed: ${options.maxRanges}`,
      },
    });
  }

  // For now, handle only single range requests
  // TODO: Implement multipart range responses later
  const range = rangeResult.ranges[0];
  if (!range) {
    return res.status(416).json({
      error: {
        type: 'RANGE_NOT_SATISFIABLE',
        message: 'No valid range found',
      },
    });
  }

  const contentLength = range.end - range.start + 1;

  log.debug('Serving range request', {
    path: fileInfo.path,
    range: `${range.start}-${range.end}`,
    contentLength,
    totalSize: fileSize,
    mimeType,
  });

  // Set response headers for partial content
  res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);
  res.setHeader(HttpResponseHeader.CONTENT_LENGTH, contentLength.toString());
  res.setHeader('Content-Range', generateContentRangeHeader(range.start, range.end, fileSize));
  res.setHeader('Accept-Ranges', 'bytes');

  // Set cache headers
  setCacheHeaders(res, fileInfo, options);

  // Create partial file stream
  const partialStream = createPartialFileStream(fileInfo.path, range.start, range.end);

  return res.status(206).stream(partialStream);
}

async function handleStaticFileRequest(
  req: KoriRequest,
  res: KoriResponse,
  requestPath: string,
  options: Required<StaticFileOptions>,
  log: KoriLogger,
): Promise<KoriResponse> {
  const resolvedPath = resolveSafePath(requestPath, options.serveFrom);

  if (!resolvedPath.isValid) {
    log.warn('Invalid file path detected', { requestPath });
    return res.notFound({
      message: 'File not found',
    });
  }

  if (!isDotfileAllowed(resolvedPath.isDotfile, options.dotfiles)) {
    log.debug('Dotfile access denied', { path: resolvedPath.safePath });
    return res.notFound({
      message: 'File not found',
    });
  }

  let fileInfo = await getFileInfo(resolvedPath.safePath);

  if (!fileInfo.exists) {
    log.debug('File not found', { path: resolvedPath.safePath });
    return res.notFound({
      message: 'File not found',
    });
  }

  if (fileInfo.stats.isDirectory()) {
    if (options.index === false) {
      log.debug('Directory listing disabled', { path: resolvedPath.safePath });
      return res.forbidden({
        message: 'Directory listing is disabled',
      });
    }

    const indexFile = await resolveIndexFile(resolvedPath.safePath, options.index, log);
    if (!indexFile) {
      log.debug('No index file found in directory', { path: resolvedPath.safePath });
      return res.notFound({
        message: 'No index file found',
      });
    }
    fileInfo = indexFile;
  }

  if (!fileInfo.stats.isFile()) {
    log.debug('Path is not a regular file', { path: fileInfo.path });
    return res.notFound({
      message: 'File not found',
    });
  }

  return serveFile(req, res, fileInfo, options, log);
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
export function staticFilePlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  userOptions: StaticFileOptions,
): KoriPlugin<Env, Req, Res> {
  const options = {
    ...defaultOptions,
    ...userOptions,
  };

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      const log = kori.log().child(PLUGIN_NAME);

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

      return kori.get(`${options.mountAt}/*`, async ({ req, res }) => {
        const pathname = req.url().pathname;
        const requestPath = removeMountPrefix(pathname, options.mountAt);

        return await handleStaticFileRequest(req, res, requestPath, options, log);
      });
    },
  });
}
