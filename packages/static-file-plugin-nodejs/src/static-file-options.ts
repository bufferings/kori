export type StaticFileOptions = {
  /** Required: Root directory path for serving static files */
  root: string;

  /** URL prefix for static files (default: '/static') */
  prefix?: string;

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
};
