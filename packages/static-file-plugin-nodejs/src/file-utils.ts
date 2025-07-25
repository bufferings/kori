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
 */
export function parseRangeHeader(rangeHeader: string | undefined, fileSize: number): RangeResult {
  const ranges: ParsedRange[] = [];
  let isSatisfiable = true;

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
        isSatisfiable = false;
        continue;
      }
      start = Math.max(0, fileSize - suffixLength);
      end = fileSize - 1;
    } else if (trimmedSpec.endsWith('-')) {
      // Start range: 500- (from 500 to end)
      start = parseInt(trimmedSpec.slice(0, -1), 10);
      if (isNaN(start) || start < 0) {
        isSatisfiable = false;
        continue;
      }
      end = fileSize - 1;
    } else {
      // Full range: 0-499
      const parts = trimmedSpec.split('-');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        isSatisfiable = false;
        continue;
      }
      start = parseInt(parts[0], 10);
      end = parseInt(parts[1], 10);
      if (isNaN(start) || isNaN(end) || start < 0 || end < start) {
        isSatisfiable = false;
        continue;
      }
    }

    // Ensure end doesn't exceed file size
    end = Math.min(end, fileSize - 1);

    // Check if range is satisfiable
    if (start >= fileSize) {
      isSatisfiable = false;
      continue;
    }

    ranges.push({ start, end });
  }

  // If no valid ranges found, mark as unsatisfiable
  if (ranges.length === 0) {
    isSatisfiable = false;
  }

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
 * Check if the request is a range request
 */
export function isRangeRequest(rangeHeader: string | undefined): boolean {
  return Boolean(rangeHeader?.startsWith('bytes='));
}

/**
 * Generate a unique boundary for multipart responses
 */
export function generateBoundary(): string {
  return `----kori-boundary-${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

/**
 * Create a multipart byterange stream for multiple ranges
 */
export function createMultipartStream(
  filePath: string,
  ranges: ParsedRange[],
  totalSize: number,
  mimeType: string,
  boundary: string,
): ReadableStream {
  let currentRangeIndex = 0;
  let currentFileStream: NodeJS.ReadableStream | null = null;
  let boundaryWritten = false;

  const encoder = new TextEncoder();

  return new ReadableStream({
    start() {
      // Initialize multipart stream - no action needed at start
    },

    pull(controller) {
      try {
        // If we haven't written the boundary for current range, write it
        if (!boundaryWritten) {
          if (currentRangeIndex < ranges.length) {
            const range = ranges[currentRangeIndex];
            if (!range) {
              controller.error(new Error('Invalid range at index ' + currentRangeIndex));
              return;
            }

            const contentLength = range.end - range.start + 1;

            // Write boundary and headers
            const boundaryData =
              `--${boundary}\r\n` +
              `Content-Type: ${mimeType}\r\n` +
              `Content-Range: bytes ${range.start}-${range.end}/${totalSize}\r\n` +
              `Content-Length: ${contentLength}\r\n\r\n`;

            controller.enqueue(encoder.encode(boundaryData));

            // Create stream for this range
            currentFileStream = createReadStream(filePath, {
              start: range.start,
              end: range.end,
            });

            boundaryWritten = true;
            return;
          } else {
            // All ranges processed, write closing boundary
            controller.enqueue(encoder.encode(`\r\n--${boundary}--\r\n`));
            controller.close();
            return;
          }
        }

        // Read from current file stream
        if (currentFileStream) {
          const chunk = currentFileStream.read();
          if (chunk !== null) {
            controller.enqueue(chunk);
          } else {
            // Stream ended, move to next range
            if (
              currentFileStream &&
              'destroy' in currentFileStream &&
              typeof currentFileStream.destroy === 'function'
            ) {
              (currentFileStream.destroy as () => void)();
            }
            currentFileStream = null;
            boundaryWritten = false;
            currentRangeIndex++;

            // Add line break before next boundary
            if (currentRangeIndex < ranges.length) {
              controller.enqueue(encoder.encode('\r\n'));
            }
          }
        }
      } catch (error) {
        controller.error(error instanceof Error ? error : new Error(String(error)));
      }
    },

    cancel() {
      if (currentFileStream && 'destroy' in currentFileStream && typeof currentFileStream.destroy === 'function') {
        (currentFileStream.destroy as () => void)();
      }
    },
  });
}
