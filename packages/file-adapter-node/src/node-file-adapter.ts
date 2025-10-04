import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import { lookup as mimeTypesLookup } from 'mime-types';
import etag from 'etag';

import type { FileAdapter, FileInfo, FileStats, ReadOptions } from '@korix/file-adapter';
import { safeJoin, validatePath, detectMimeType } from '@korix/file-adapter';

/**
 * Options for creating a Node.js file adapter.
 */
export type NodeFileAdapterOptions = {
  /**
   * Root directory for file operations.
   * All file paths will be resolved relative to this directory.
   */
  root: string;
};

/**
 * Creates a Node.js file adapter implementation.
 * 
 * This adapter provides secure file operations using the Node.js fs module,
 * with built-in path traversal protection and web-compatible stream handling.
 * 
 * @param options - Configuration options for the adapter
 * @returns FileAdapter implementation for Node.js
 * 
 * @example
 * ```typescript
 * const adapter = createNodeFileAdapter({ root: './public' });
 * 
 * // Check if file exists
 * const exists = await adapter.exists('index.html');
 * 
 * // Get file statistics
 * const stats = await adapter.stat('index.html');
 * 
 * // Read file content
 * const fileInfo = await adapter.read('index.html');
 * console.log(fileInfo.contentType); // 'text/html'
 * ```
 */
export function createNodeFileAdapter(options: NodeFileAdapterOptions): FileAdapter {
  const { root } = options;
  
  // Resolve and normalize the root path
  const resolvedRoot = path.resolve(root);
  
  /**
   * Safely resolves a relative path within the root directory.
   * 
   * @param relativePath - The relative path to resolve
   * @returns The absolute path within the root directory
   * @throws Error if the path is unsafe or would escape the root
   */
  function resolveSafePath(relativePath: string): string {
    validatePath(relativePath);
    return safeJoin(resolvedRoot, relativePath);
  }
  
  /**
   * Converts Node.js fs.Stats to our FileStats format.
   * 
   * @param stats - Node.js fs.Stats object
   * @returns FileStats object
   */
  function convertStats(stats: Awaited<ReturnType<typeof fs.stat>>): FileStats {
    return {
      size: stats.size,
      mtime: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }
  
  /**
   * Detects the MIME type for a file.
   * Uses the mime-types library for comprehensive detection,
   * falling back to the built-in detector.
   * 
   * @param filePath - The file path to detect MIME type for
   * @returns The detected MIME type
   */
  function detectMimeTypeForFile(filePath: string): string {
    // Try mime-types library first for comprehensive detection
    const mimeType = mimeTypesLookup(filePath);
    if (mimeType) {
      return mimeType;
    }
    
    // Fall back to built-in detector
    return detectMimeType(filePath);
  }
  
  return {
    async exists(filePath: string): Promise<boolean> {
      // This will throw if path is invalid
      const absolutePath = resolveSafePath(filePath);
      
      try {
        await fs.access(absolutePath);
        return true;
      } catch {
        return false;
      }
    },
    
    async stat(filePath: string): Promise<FileStats> {
      const absolutePath = resolveSafePath(filePath);
      
      try {
        const stats = await fs.stat(absolutePath);
        return convertStats(stats);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(`File not found: ${filePath}`);
        }
        throw new Error(`Failed to stat file: ${filePath} - ${error.message}`);
      }
    },
    
    async read(filePath: string, options?: ReadOptions): Promise<FileInfo> {
      const absolutePath = resolveSafePath(filePath);
      
      try {
        // Get file statistics first
        const stats = await fs.stat(absolutePath);
        
        // Ensure it's a file, not a directory
        if (!stats.isFile()) {
          throw new Error(`Path is not a file: ${filePath}`);
        }
        
        // Detect content type
        const contentType = detectMimeTypeForFile(filePath);
        
        // Generate ETag based on file stats
        const etagValue = etag(stats);
        
        // Create readable stream
        let readableStream: NodeJS.ReadableStream;
        
        if (options?.range) {
          // Handle range requests (for future implementation)
          const { start, end } = options.range;
          readableStream = createReadStream(absolutePath, { start, end });
        } else {
          // Read entire file
          readableStream = createReadStream(absolutePath);
        }
        
        // Convert Node.js stream to Web API ReadableStream
        const webStream = Readable.toWeb(readableStream) as ReadableStream<Uint8Array>;
        
        return {
          body: webStream,
          size: stats.size,
          mtime: stats.mtime,
          contentType,
          etag: etagValue,
        };
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(`File not found: ${filePath}`);
        }
        if (error.code === 'EACCES') {
          throw new Error(`Permission denied: ${filePath}`);
        }
        if (error.code === 'EISDIR') {
          throw new Error(`Path is a directory: ${filePath}`);
        }
        
        // Re-throw our custom errors
        if (error.message.includes('Path is not a file:') || 
            error.message.includes('Unsafe path detected:') ||
            error.message.includes('Path cannot be empty')) {
          throw error;
        }
        
        throw new Error(`Failed to read file: ${filePath} - ${error.message}`);
      }
    },
  };
}