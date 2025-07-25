export type StaticFileOptions = {
  /** Required: Source directory path to serve static files from */
  serveFrom: string;

  /** URL prefix for static files (default: '/static') */
  mountAt?: string;

  /** Index files to serve when accessing directories (default: ['index.html']) */
  index?: string[] | false;

  /** Dotfiles handling (default: 'deny') */
  dotfiles?: 'allow' | 'deny';

  /** Cache max-age in seconds (default: 0) */
  maxAge?: number;

  /** ETag header generation (default: true) */
  etag?: boolean;

  /** Last-Modified header generation (default: true) */
  lastModified?: boolean;

  /** Range Request support (default: true) */
  ranges?: boolean;

  /** Maximum number of ranges per request (default: 1) */
  maxRanges?: number;
};

/**
 * Parsed range information
 */
export type ParsedRange = {
  start: number;
  end: number;
};

/**
 * Range request result
 */
export type RangeResult = {
  ranges: ParsedRange[];
  totalSize: number;
  isSatisfiable: boolean;
};
