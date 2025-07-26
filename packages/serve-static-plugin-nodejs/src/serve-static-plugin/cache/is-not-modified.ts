import { type Stats } from 'node:fs';

import { HttpRequestHeader, type KoriRequest } from '@korix/kori';
import etag from 'etag';

const MILLISECONDS_PER_SECOND = 1000;

export function isNotModified(req: KoriRequest, fileStats: Stats): boolean {
  // ETag-based conditional request (priority)
  const ifNoneMatch = req.header(HttpRequestHeader.IF_NONE_MATCH);
  if (ifNoneMatch) {
    const etagValue = etag(fileStats);
    return ifNoneMatch === etagValue;
  }

  // Last-Modified-based conditional request (fallback)
  const ifModifiedSince = req.header(HttpRequestHeader.IF_MODIFIED_SINCE);
  if (ifModifiedSince) {
    try {
      // HTTP dates have second precision, so truncate to seconds for comparison
      const fileModifiedTime = Math.floor(fileStats.mtime.getTime() / MILLISECONDS_PER_SECOND);
      const clientModifiedTime = Math.floor(new Date(ifModifiedSince).getTime() / MILLISECONDS_PER_SECOND);

      return fileModifiedTime <= clientModifiedTime;
    } catch {
      // Invalid date format in If-Modified-Since header, ignore
      return false;
    }
  }

  return false;
}
