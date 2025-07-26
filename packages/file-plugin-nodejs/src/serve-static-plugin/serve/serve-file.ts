import { HttpStatus, HttpResponseHeader, type KoriRequest, type KoriResponse, type KoriLogger } from '@korix/kori';

import { createFileStream, detectMimeType } from '../../share/index.js';
import { setCacheHeaders, isNotModified } from '../cache/index.js';
import { type FileInfo } from '../file/index.js';
import { type ServeStaticOptions } from '../index.js';
import { parseRangeHeader, serveRangeRequest, RangeConstants } from '../serve-range/index.js';

export function serveFile(
  req: KoriRequest,
  res: KoriResponse,
  fileInfo: FileInfo,
  options: Required<
    Pick<ServeStaticOptions, 'maxAge' | 'etag' | 'lastModified' | 'immutable' | 'ranges' | 'maxRanges'>
  >,
  log: KoriLogger,
): KoriResponse {
  const mimeType = detectMimeType(fileInfo.path);

  if (isNotModified(req, fileInfo.stats)) {
    log.debug('Serving 304 Not Modified', { path: fileInfo.path });
    return res.status(HttpStatus.NOT_MODIFIED).empty();
  }

  const rangeHeader = req.header('range');
  if (options.ranges && rangeHeader) {
    const rangeResult = parseRangeHeader(rangeHeader, fileInfo.stats.size);
    if (rangeResult.isSatisfiable && rangeResult.ranges.length > 0) {
      return serveRangeRequest(req, res, fileInfo, options, log, rangeResult, (res, fileInfo, legacyOptions) =>
        setCacheHeaders(res, {
          maxAge: legacyOptions.maxAge,
          etag: legacyOptions.etag,
          lastModified: legacyOptions.lastModified,
          immutable: legacyOptions.immutable,
          fileStats: fileInfo.stats,
        }),
      );
    } else {
      // Handle unsatisfiable ranges
      log.debug('Range not satisfiable', {
        path: fileInfo.path,
        rangeHeader,
        fileSize: fileInfo.stats.size,
      });

      res.setHeader(HttpResponseHeader.CONTENT_RANGE, `${RangeConstants.BYTES} */${fileInfo.stats.size}`);
      res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);

      return res.status(HttpStatus.RANGE_NOT_SATISFIABLE).json({
        error: {
          type: 'RANGE_NOT_SATISFIABLE',
          message: 'Requested range not satisfiable',
        },
      });
    }
  }

  res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);
  res.setHeader(HttpResponseHeader.CONTENT_LENGTH, fileInfo.stats.size.toString());
  res.setHeader(HttpResponseHeader.ACCEPT_RANGES, options.ranges ? RangeConstants.BYTES : RangeConstants.NONE);
  setCacheHeaders(res, {
    maxAge: options.maxAge,
    etag: options.etag,
    lastModified: options.lastModified,
    immutable: options.immutable,
    fileStats: fileInfo.stats,
  });

  log.debug('Serving complete file', {
    path: fileInfo.path,
    size: fileInfo.stats.size,
    mimeType,
  });

  const fileStream = createFileStream(fileInfo.path);
  return res.status(HttpStatus.OK).stream(fileStream);
}
