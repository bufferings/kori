import contentDisposition from 'content-disposition';

export type ContentDisposition = 'attachment' | 'inline';

export type ContentDispositionOptions = {
  disposition?: ContentDisposition;
  filename?: string;
};

/**
 * Create Content-Disposition header value using content-disposition library
 */
export function createContentDispositionHeader({
  disposition = 'attachment',
  filename,
}: ContentDispositionOptions): string {
  if (!filename) {
    return disposition;
  }

  return contentDisposition(filename, { type: disposition });
}
