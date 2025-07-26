import { type Stats } from 'node:fs';

import { HttpResponseHeader, type KoriResponse } from '@korix/kori';
import etag from 'etag';

export type CacheOptions = {
  maxAge: number;
  etag: boolean;
  lastModified: boolean;
  immutable: boolean;
  fileStats: Stats;
};

function formatLastModified(mtime: Date): string {
  return mtime.toUTCString();
}

export function setCacheHeaders(res: KoriResponse, options: CacheOptions): void {
  if (options.maxAge > 0) {
    let cacheControl = `public, max-age=${options.maxAge}`;
    if (options.immutable) {
      cacheControl += ', immutable';
    }
    res.setHeader(HttpResponseHeader.CACHE_CONTROL, cacheControl);
  } else {
    res.setHeader(HttpResponseHeader.CACHE_CONTROL, 'no-cache');
  }

  if (options.etag) {
    const etagValue = etag(options.fileStats);
    res.setHeader(HttpResponseHeader.ETAG, etagValue);
  }

  if (options.lastModified) {
    const lastModified = formatLastModified(options.fileStats.mtime);
    res.setHeader(HttpResponseHeader.LAST_MODIFIED, lastModified);
  }
}
