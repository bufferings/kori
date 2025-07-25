import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { type Stats } from 'node:fs';
import { access, stat as statAsync } from 'node:fs/promises';
import { resolve, normalize, join, sep, relative } from 'node:path';

import { type KoriLogger } from '@korix/kori';

import { type StaticFileOptions, type ParsedRange, type RangeResult } from './static-file-options.js';

export type ExistingFileInfo = {
  exists: true;
  path: string;
  stats: Stats;
};

export type NonExistentFileInfo = {
  exists: false;
  path: string;
};

export type FileInfo = ExistingFileInfo | NonExistentFileInfo;

export type ResolvedPath = {
  safePath: string;
  isValid: boolean;
  isDotfile: boolean;
};

/**
 * Safely resolve a file path within the root directory
 * Prevents directory traversal attacks
 */
export function resolveSafePath(requestPath: string, rootDir: string): ResolvedPath {
  try {
    // Remove query string and hash
    const cleanPath = requestPath.split('?')[0]?.split('#')[0] ?? '';

    // Normalize and resolve paths
    const normalizedPath = normalize(cleanPath);
    const resolvedRoot = resolve(rootDir);
    // Remove leading slash if present
    const pathWithoutLeadingSlash = normalizedPath.replace(/^\//, '');
    const resolvedPath = resolve(resolvedRoot, pathWithoutLeadingSlash);

    // Check if resolved path is within root directory
    const relativePath = relative(resolvedRoot, resolvedPath);
    const isValid = !relativePath.startsWith('..') && !relativePath.startsWith('/');

    // Check if it's a dotfile
    const isDotfile = normalizedPath.split(sep).some((segment) => segment.startsWith('.'));

    return {
      safePath: resolvedPath,
      isValid,
      isDotfile,
    };
  } catch {
    return {
      safePath: '',
      isValid: false,
      isDotfile: false,
    };
  }
}

/**
 * Check if a file exists and get its stats
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
  try {
    await access(filePath);
    const stats = await statAsync(filePath);
    return {
      path: filePath,
      stats,
      exists: true,
    };
  } catch {
    return {
      path: filePath,
      exists: false,
    };
  }
}

/**
 * Try to resolve index files for directory requests
 */
export async function resolveIndexFile(
  dirPath: string,
  indexFiles: string[],
  log: KoriLogger,
): Promise<ExistingFileInfo | null> {
  for (const indexFile of indexFiles) {
    const indexPath = join(dirPath, indexFile);
    const fileInfo = await getFileInfo(indexPath);

    if (fileInfo.exists && fileInfo.stats.isFile()) {
      log.debug('Resolved index file', { dirPath, indexFile, indexPath });
      return fileInfo;
    }
  }

  return null;
}

/**
 * Check if dotfile access is allowed based on configuration
 */
export function isDotfileAllowed(isDotfile: boolean, dotfiles: NonNullable<StaticFileOptions['dotfiles']>): boolean {
  if (!isDotfile) {
    return true;
  }

  return dotfiles === 'allow';
}

/**
 * Generate ETag based on file stats (mtime + size)
 */
export function generateETag(stats: Stats): string {
  const hash = createHash('md5');
  hash.update(`${stats.mtime.getTime()}-${stats.size}`);
  return `"${hash.digest('hex')}"`;
}

/**
 * Format Last-Modified header value
 */
export function formatLastModified(mtime: Date): string {
  return mtime.toUTCString();
}

/**
 * Create a readable stream for file content (Web Streams API)
 */
export function createFileStream(filePath: string): ReadableStream {
  const nodeStream = createReadStream(filePath);

  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      nodeStream.on('end', () => {
        controller.close();
      });

      nodeStream.on('error', (error) => {
        controller.error(error);
      });
    },

    cancel() {
      nodeStream.destroy();
    },
  });
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
    let start: number;
    let end: number;

    if (trimmedSpec.startsWith('-')) {
      // Suffix range: -500 (last 500 bytes)
      const suffixLength = parseInt(trimmedSpec.substring(1), 10);
      if (isNaN(suffixLength) || suffixLength <= 0) {
        continue; // Skip invalid range, don't mark entire request as unsatisfiable
      }
      start = Math.max(0, fileSize - suffixLength);
      end = fileSize - 1;
    } else if (trimmedSpec.endsWith('-')) {
      // Start range: 500- (from 500 to end)
      start = parseInt(trimmedSpec.slice(0, -1), 10);
      if (isNaN(start) || start < 0) {
        continue; // Skip invalid range, don't mark entire request as unsatisfiable
      }
      end = fileSize - 1;
    } else {
      // Full range: 0-499
      const parts = trimmedSpec.split('-');
      if (
        parts.length !== 2 ||
        parts[0] === undefined ||
        parts[0] === '' ||
        parts[1] === undefined ||
        parts[1] === ''
      ) {
        continue; // Skip invalid range, don't mark entire request as unsatisfiable
      }
      start = parseInt(parts[0], 10);
      end = parseInt(parts[1], 10);
      if (isNaN(start) || isNaN(end) || start < 0 || end < start) {
        continue; // Skip invalid range, don't mark entire request as unsatisfiable
      }
    }

    // Ensure end doesn't exceed file size
    end = Math.min(end, fileSize - 1);

    // Check if range is satisfiable
    if (start >= fileSize) {
      continue; // Skip unsatisfiable range, don't mark entire request as unsatisfiable
    }

    ranges.push({ start, end });
  }

  // RFC 7233: Only mark as unsatisfiable if no valid ranges found
  const isSatisfiable = ranges.length > 0;

  return {
    ranges,
    totalSize: fileSize,
    isSatisfiable,
  };
}

/**
 * Create a readable stream for partial file content
 */
export function createPartialFileStream(filePath: string, start: number, end: number): ReadableStream {
  const nodeStream = createReadStream(filePath, { start, end });

  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      nodeStream.on('end', () => {
        controller.close();
      });

      nodeStream.on('error', (error) => {
        controller.error(error);
      });
    },

    cancel() {
      nodeStream.destroy();
    },
  });
}

/**
 * Generate Content-Range header value
 */
export function generateContentRangeHeader(start: number, end: number, totalSize: number): string {
  return `bytes ${start}-${end}/${totalSize}`;
}

/**
 * Generate a unique boundary for multipart responses
 */
export function generateBoundary(): string {
  return `----kori-boundary-${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

/**
 * Generate content for a single range
 */
async function* generateRangeContent(filePath: string, range: ParsedRange): AsyncGenerator<Uint8Array> {
  const stream = createReadStream(filePath, {
    start: range.start,
    end: range.end,
  });

  try {
    for await (const chunk of stream) {
      yield new Uint8Array(chunk);
    }
  } finally {
    stream.destroy();
  }
}

/**
 * Generate multipart chunks using async generator
 */
async function* generateMultipartChunks(
  filePath: string,
  ranges: ParsedRange[],
  totalSize: number,
  mimeType: string,
  boundary: string,
): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder();

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (!range) {
      continue;
    }

    // Yield boundary headers
    const boundaryData =
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n` +
      `Content-Range: bytes ${range.start}-${range.end}/${totalSize}\r\n` +
      `Content-Length: ${range.end - range.start + 1}\r\n\r\n`;

    yield encoder.encode(boundaryData);

    // Yield file content for this range
    yield* generateRangeContent(filePath, range);

    // Add line break before next boundary (except for last range)
    if (i < ranges.length - 1) {
      yield encoder.encode('\r\n');
    }
  }

  // Yield closing boundary
  yield encoder.encode(`\r\n--${boundary}--\r\n`);
}

/**
 * Create a multipart byterange stream using generators
 */
export function createMultipartStream(
  filePath: string,
  ranges: ParsedRange[],
  totalSize: number,
  mimeType: string,
  boundary: string,
): ReadableStream {
  const generator = generateMultipartChunks(filePath, ranges, totalSize, mimeType, boundary);

  return new ReadableStream({
    async pull(controller) {
      try {
        const result = await generator.next();

        if (result.done) {
          controller.close();
        } else {
          controller.enqueue(result.value);
        }
      } catch (error) {
        controller.error(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async cancel() {
      await generator.return(undefined);
    },
  });
}
