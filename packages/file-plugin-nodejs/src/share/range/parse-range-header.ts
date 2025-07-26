import { type ParsedRange, type RangeResult } from './types.js';

/**
 * Parse suffix range (e.g., "-500" for last 500 bytes)
 */
function parseSuffixRange(spec: string, fileSize: number): ParsedRange | null {
  const suffixLength = parseInt(spec.substring(1), 10);
  if (isNaN(suffixLength) || suffixLength <= 0) {
    return null;
  }

  const start = Math.max(0, fileSize - suffixLength);
  const end = fileSize - 1;

  if (start >= fileSize) {
    return null;
  }

  return { start, end };
}

/**
 * Parse start range (e.g., "500-" from byte 500 to end)
 */
function parseStartRange(spec: string, fileSize: number): ParsedRange | null {
  const start = parseInt(spec.slice(0, -1), 10);
  if (isNaN(start) || start < 0) {
    return null;
  }

  if (start >= fileSize) {
    return null;
  }

  const end = fileSize - 1;
  return { start, end };
}

/**
 * Parse full range (e.g., "0-499" from byte 0 to 499)
 */
function parseFullRange(spec: string, fileSize: number): ParsedRange | null {
  const parts = spec.split('-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);

  if (isNaN(start) || isNaN(end) || start < 0 || end < start) {
    return null;
  }

  // Ensure end doesn't exceed file size and start is satisfiable
  if (start >= fileSize) {
    return null;
  }

  return { start, end: Math.min(end, fileSize - 1) };
}

/**
 * Parse Range header and return parsed ranges
 * According to HTTP RFC 7233, if at least one range is satisfiable,
 * the server should ignore unsatisfiable ranges and return 206.
 * Only return 416 if all ranges are unsatisfiable.
 */
export function parseRangeHeader(rangeHeader: string | undefined, fileSize: number): RangeResult {
  const ranges: ParsedRange[] = [];

  // Check if range header exists and is valid
  if (!rangeHeader?.startsWith('bytes=')) {
    return { ranges: [], totalSize: fileSize, isSatisfiable: false };
  }

  const rangeSpec = rangeHeader.substring(6); // Remove "bytes="
  const rangeSpecs = rangeSpec.split(',');

  for (const spec of rangeSpecs) {
    const trimmedSpec = spec.trim();
    let parsedRange: ParsedRange | null = null;

    if (trimmedSpec.startsWith('-')) {
      parsedRange = parseSuffixRange(trimmedSpec, fileSize);
    } else if (trimmedSpec.endsWith('-')) {
      parsedRange = parseStartRange(trimmedSpec, fileSize);
    } else {
      parsedRange = parseFullRange(trimmedSpec, fileSize);
    }

    if (parsedRange) {
      ranges.push(parsedRange);
    }
  }

  // RFC 7233: Only mark as unsatisfiable if no valid ranges found
  const isSatisfiable = ranges.length > 0;

  return {
    ranges,
    totalSize: fileSize,
    isSatisfiable,
  };
}
