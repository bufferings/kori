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

/**
 * Range Request related constants
 */
export const RangeConstants = {
  /** Range unit for HTTP Range requests */
  BYTES: 'bytes',

  /** Accept-Ranges header value for no range support */
  NONE: 'none',

  /** Range header prefix */
  RANGE_PREFIX: 'bytes=',
} as const;
