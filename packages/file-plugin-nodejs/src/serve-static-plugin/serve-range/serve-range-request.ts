import { HttpResponseHeader, HttpStatus } from '@korix/kori';
import { type KoriLogger, type KoriRequest, type KoriResponse } from '@korix/kori';

import {
  createMultipartStream,
  createPartialFileStream,
  detectMimeType,
  generateBoundary,
  generateContentRangeHeader,
  RangeConstants,
  type RangeResult,
} from '../../share/index.js';
import { type FileInfo } from '../file/index.js';
import { type ServeStaticOptions } from '../index.js';

function serveSingleRange(
  req: KoriRequest,
  res: KoriResponse,
  fileInfo: FileInfo,
  options: Required<
    Pick<ServeStaticOptions, 'maxAge' | 'etag' | 'lastModified' | 'immutable' | 'ranges' | 'maxRanges'>
  >,
  log: KoriLogger,
  range: { start: number; end: number },
  mimeType: string,
  fileSize: number,
  setCacheHeadersFn: (
    res: KoriResponse,
    fileInfo: FileInfo,
    options: Required<Pick<ServeStaticOptions, 'maxAge' | 'etag' | 'lastModified' | 'immutable'>>,
  ) => void,
): KoriResponse {
  const contentLength = range.end - range.start + 1;

  log.debug('Serving single range request', {
    path: fileInfo.path,
    range: `${range.start}-${range.end}`,
    contentLength,
    totalSize: fileSize,
    mimeType,
  });

  // Set response headers for partial content
  res.setHeader(HttpResponseHeader.CONTENT_TYPE, mimeType);
  res.setHeader(HttpResponseHeader.CONTENT_LENGTH, contentLength.toString());
  res.setHeader(HttpResponseHeader.CONTENT_RANGE, generateContentRangeHeader(range.start, range.end, fileSize));
  res.setHeader(HttpResponseHeader.ACCEPT_RANGES, RangeConstants.BYTES);

  // Set cache headers
  setCacheHeadersFn(res, fileInfo, options);

  // Create partial file stream
  const partialStream = createPartialFileStream(fileInfo.path, range.start, range.end);

  return res.status(HttpStatus.PARTIAL_CONTENT).stream(partialStream);
}

function serveMultipartRange(
  req: KoriRequest,
  res: KoriResponse,
  fileInfo: FileInfo,
  options: Required<
    Pick<ServeStaticOptions, 'maxAge' | 'etag' | 'lastModified' | 'immutable' | 'ranges' | 'maxRanges'>
  >,
  log: KoriLogger,
  ranges: { start: number; end: number }[],
  mimeType: string,
  fileSize: number,
  setCacheHeadersFn: (
    res: KoriResponse,
    fileInfo: FileInfo,
    options: Required<Pick<ServeStaticOptions, 'maxAge' | 'etag' | 'lastModified' | 'immutable'>>,
  ) => void,
): KoriResponse {
  const boundary = generateBoundary();

  log.debug('Serving multipart range request', {
    path: fileInfo.path,
    rangeCount: ranges.length,
    ranges: ranges.map((r: { start: number; end: number }) => `${r.start}-${r.end}`),
    totalSize: fileSize,
    mimeType,
    boundary,
  });

  // Set response headers for multipart content
  // Note: Content-Length is omitted for multipart responses as per HTTP spec
  // since calculating exact length is complex and not required
  res.setHeader(HttpResponseHeader.CONTENT_TYPE, `multipart/byteranges; boundary=${boundary}`);
  res.setHeader(HttpResponseHeader.ACCEPT_RANGES, RangeConstants.BYTES);

  // Set cache headers
  setCacheHeadersFn(res, fileInfo, options);

  // Create multipart stream
  const multipartStream = createMultipartStream(fileInfo.path, ranges, fileSize, mimeType, boundary);

  return res.status(HttpStatus.PARTIAL_CONTENT).stream(multipartStream);
}

export function serveRangeRequest(
  req: KoriRequest,
  res: KoriResponse,
  fileInfo: FileInfo,
  options: Required<
    Pick<ServeStaticOptions, 'maxAge' | 'etag' | 'lastModified' | 'immutable' | 'ranges' | 'maxRanges'>
  >,
  log: KoriLogger,
  rangeResult: RangeResult,
  setCacheHeadersFn: (
    res: KoriResponse,
    fileInfo: FileInfo,
    options: Required<Pick<ServeStaticOptions, 'maxAge' | 'etag' | 'lastModified' | 'immutable'>>,
  ) => void,
): KoriResponse {
  const mimeType = detectMimeType(fileInfo.path);
  const fileSize = fileInfo.stats.size;

  // Check if requesting too many ranges
  if (rangeResult.ranges.length > options.maxRanges) {
    log.warn('Too many ranges requested', {
      path: fileInfo.path,
      requestedRanges: rangeResult.ranges.length,
      maxRanges: options.maxRanges,
    });

    return res.status(HttpStatus.RANGE_NOT_SATISFIABLE).json({
      error: {
        type: 'TOO_MANY_RANGES',
        message: `Too many ranges requested. Maximum allowed: ${options.maxRanges}`,
      },
    });
  }

  // Handle single vs multiple range requests
  if (rangeResult.ranges.length === 1) {
    // Single range request - ranges[0] is guaranteed to exist since length === 1
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const range = rangeResult.ranges[0]!;
    return serveSingleRange(req, res, fileInfo, options, log, range, mimeType, fileSize, setCacheHeadersFn);
  } else {
    // Multiple range request - use multipart response
    return serveMultipartRange(
      req,
      res,
      fileInfo,
      options,
      log,
      rangeResult.ranges,
      mimeType,
      fileSize,
      setCacheHeadersFn,
    );
  }
}
