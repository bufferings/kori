/**
 * Information about a file read from a FileAdapter.
 */
export type FileInfo = {
  /**
   * The file content as a ReadableStream.
   */
  body: ReadableStream<Uint8Array>;
  
  /**
   * The size of the file in bytes.
   */
  size: number;
  
  /**
   * The last modified time of the file.
   */
  mtime?: Date;
  
  /**
   * The detected content type (MIME type) of the file.
   */
  contentType: string;
  
  /**
   * The ETag value for the file, if available.
   */
  etag?: string;
};

/**
 * Statistical information about a file or directory.
 */
export type FileStats = {
  /**
   * The size of the file in bytes.
   */
  size: number;
  
  /**
   * The last modified time of the file.
   */
  mtime?: Date;
  
  /**
   * Whether the path represents a file.
   */
  isFile: boolean;
  
  /**
   * Whether the path represents a directory.
   */
  isDirectory: boolean;
};

/**
 * Options for reading files.
 */
export type ReadOptions = {
  /**
   * Range to read from the file (for future Range header support).
   */
  range?: { 
    start: number; 
    end: number; 
  };
};

/**
 * File adapter interface for abstracting file system operations.
 * 
 * Provides platform-agnostic file operations for reading files,
 * checking existence, and getting file statistics.
 */
export interface FileAdapter {
  /**
   * Checks if a file or directory exists at the given path.
   * 
   * @param path - The file path to check
   * @returns Promise that resolves to true if the path exists
   */
  exists(path: string): Promise<boolean>;
  
  /**
   * Gets statistical information about a file or directory.
   * 
   * @param path - The file path to get statistics for
   * @returns Promise that resolves to file statistics
   * @throws Error if the file does not exist or cannot be accessed
   */
  stat(path: string): Promise<FileStats>;
  
  /**
   * Reads a file and returns its information and content stream.
   * 
   * @param path - The file path to read
   * @param options - Optional read options
   * @returns Promise that resolves to file information with content stream
   * @throws Error if the file does not exist, is a directory, or cannot be read
   */
  read(path: string, options?: ReadOptions): Promise<FileInfo>;
}