import { basename } from 'node:path';

import contentDisposition from 'content-disposition';

export type ContentDisposition = 'attachment' | 'inline';

export type ContentDispositionOptions = {
  disposition?: ContentDisposition;
  filename?: string;
};

/**
 * Create Content-Disposition header value using the standard library
 */
export function createContentDisposition({ disposition = 'attachment', filename }: ContentDispositionOptions): string {
  if (!filename) {
    return disposition;
  }

  return contentDisposition(filename, { type: disposition });
}

/**
 * Extract filename from file path if not provided
 */
export function resolveFilename(filePath: string, userFilename?: string): string {
  return userFilename ?? basename(filePath);
}
