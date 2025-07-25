import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { type Stats } from 'node:fs';
import { access, stat as statAsync } from 'node:fs/promises';
import { resolve, normalize, join, sep, relative } from 'node:path';

import { type KoriLogger } from '@korix/kori';

import { type StaticFileOptions } from './static-file-options.js';

export type FileInfo = {
  path: string;
  stats: Stats;
  exists: boolean;
};

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
      stats: {} as Stats,
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
): Promise<FileInfo | null> {
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
