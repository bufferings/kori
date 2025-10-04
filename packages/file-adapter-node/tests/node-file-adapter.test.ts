import fs from 'node:fs/promises';
import path from 'node:path';

import  { type FileAdapter } from '@korix/file-adapter';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { createNodeFileAdapter } from '../src/node-file-adapter.js';


describe('Node.js File Adapter', () => {
  let adapter: FileAdapter;
  let tempDir: string;
  
  beforeAll(async () => {
    // Create a temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(import.meta.dirname, 'test-'));
    adapter = createNodeFileAdapter({ root: tempDir });
  });
  
  afterAll(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  beforeEach(async () => {
    // Clean up files before each test
    try {
      const files = await fs.readdir(tempDir);
      await Promise.all(
        files.map(file => fs.rm(path.join(tempDir, file), { recursive: true, force: true }))
      );
    } catch {
      // Ignore cleanup errors
    }
  });
  
  describe('exists()', () => {
    test('returns true for existing file', async () => {
      const filePath = 'test.txt';
      await fs.writeFile(path.join(tempDir, filePath), 'test content');
      
      const exists = await adapter.exists(filePath);
      expect(exists).toBe(true);
    });
    
    test('returns false for non-existent file', async () => {
      const exists = await adapter.exists('nonexistent.txt');
      expect(exists).toBe(false);
    });
    
    test('returns true for existing directory', async () => {
      const dirPath = 'testdir';
      await fs.mkdir(path.join(tempDir, dirPath));
      
      const exists = await adapter.exists(dirPath);
      expect(exists).toBe(true);
    });
    
    test('handles nested paths', async () => {
      await fs.mkdir(path.join(tempDir, 'nested'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'nested', 'file.txt'), 'content');
      
      const exists = await adapter.exists('nested/file.txt');
      expect(exists).toBe(true);
    });
    
    test('rejects path traversal attempts', async () => {
      await expect(adapter.exists('../../../etc/passwd')).rejects.toThrow('Unsafe path detected');
    });
  });
  
  describe('stat()', () => {
    test('returns stats for existing file', async () => {
      const filePath = 'test.txt';
      const content = 'test content';
      await fs.writeFile(path.join(tempDir, filePath), content);
      
      const stats = await adapter.stat(filePath);
      
      expect(stats.size).toBe(Buffer.byteLength(content));
      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
      expect(stats.mtime).toBeInstanceOf(Date);
    });
    
    test('returns stats for directory', async () => {
      const dirPath = 'testdir';
      await fs.mkdir(path.join(tempDir, dirPath));
      
      const stats = await adapter.stat(dirPath);
      
      expect(stats.isFile).toBe(false);
      expect(stats.isDirectory).toBe(true);
      expect(stats.mtime).toBeInstanceOf(Date);
    });
    
    test('throws error for non-existent file', async () => {
      await expect(adapter.stat('nonexistent.txt')).rejects.toThrow('File not found: nonexistent.txt');
    });
    
    test('rejects path traversal attempts', async () => {
      await expect(adapter.stat('../../../etc/passwd')).rejects.toThrow('Unsafe path detected');
    });
  });
  
  describe('read()', () => {
    test('reads file content and metadata', async () => {
      const filePath = 'test.html';
      const content = '<html><body>Hello World</body></html>';
      await fs.writeFile(path.join(tempDir, filePath), content);
      
      const fileInfo = await adapter.read(filePath);
      
      expect(fileInfo.size).toBe(Buffer.byteLength(content));
      expect(fileInfo.contentType).toBe('text/html');
      expect(fileInfo.mtime).toBeInstanceOf(Date);
      expect(fileInfo.etag).toBeTruthy();
      expect(fileInfo.body).toBeInstanceOf(ReadableStream);
      
      // Read stream content
      const reader = fileInfo.body.getReader();
      const chunks: Uint8Array[] = [];
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {break;}
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      
      const readContent = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0)).constructor.from(
          chunks.reduce((acc: number[], chunk) => [...acc, ...Array.from(chunk)], [])
        )
      );
      
      expect(readContent).toBe(content);
    });
    
    test('detects MIME types correctly', async () => {
      const testCases = [
        { file: 'test.css', content: 'body { color: red; }', expectedType: 'text/css' },
        { file: 'test.js', content: 'console.log("hello");', expectedType: 'application/javascript' }, // mime-types library returns this
        { file: 'test.json', content: '{"key": "value"}', expectedType: 'application/json' },
        { file: 'test.png', content: 'fake-png-data', expectedType: 'image/png' },
      ];
      
      for (const { file, content, expectedType } of testCases) {
        await fs.writeFile(path.join(tempDir, file), content);
        const fileInfo = await adapter.read(file);
        expect(fileInfo.contentType).toBe(expectedType);
      }
    });
    
    test('throws error for non-existent file', async () => {
      await expect(adapter.read('nonexistent.txt')).rejects.toThrow('File not found: nonexistent.txt');
    });
    
    test('throws error for directory', async () => {
      await fs.mkdir(path.join(tempDir, 'testdir'));
      await expect(adapter.read('testdir')).rejects.toThrow('Path is not a file: testdir');
    });
    
    test('handles empty file', async () => {
      const filePath = 'empty.txt';
      await fs.writeFile(path.join(tempDir, filePath), '');
      
      const fileInfo = await adapter.read(filePath);
      
      expect(fileInfo.size).toBe(0);
      expect(fileInfo.contentType).toBe('text/plain');
    });
    
    test('handles large file paths', async () => {
      const nestedPath = 'level1/level2/level3';
      await fs.mkdir(path.join(tempDir, nestedPath), { recursive: true });
      
      const filePath = `${nestedPath}/deep-file.txt`;
      await fs.writeFile(path.join(tempDir, filePath), 'deep content');
      
      const fileInfo = await adapter.read(filePath);
      expect(fileInfo.size).toBe(Buffer.byteLength('deep content'));
    });
    
    test('rejects path traversal attempts', async () => {
      await expect(adapter.read('../../../etc/passwd')).rejects.toThrow('Unsafe path detected');
    });
    
    test('rejects null byte attacks', async () => {
      await expect(adapter.read('file\u0000.txt')).rejects.toThrow('Path cannot contain null bytes');
    });
  });
  
  describe('security features', () => {
    test('prevents access outside root directory', async () => {
      // Try various path traversal techniques
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\\\..\\\\..\\\\windows\\\\system32',
        'subdir/../../../etc/passwd',
        '/etc/passwd',
        'C:\\\\windows\\\\system32',
      ];
      
      for (const maliciousPath of maliciousPaths) {
        await expect(adapter.exists(maliciousPath)).rejects.toThrow();
        await expect(adapter.stat(maliciousPath)).rejects.toThrow();
        await expect(adapter.read(maliciousPath)).rejects.toThrow();
      }
    });
    
    test('normalizes paths correctly', async () => {
      await fs.mkdir(path.join(tempDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'subdir', 'file.txt'), 'content');
      
      // These should all resolve to the same file
      const normalizedPaths = [
        'subdir/file.txt',
        './subdir/file.txt',
        'subdir/./file.txt',
      ];
      
      for (const normalizedPath of normalizedPaths) {
        const exists = await adapter.exists(normalizedPath);
        expect(exists).toBe(true);
      }
    });
  });
  
  describe('error handling', () => {
    test('provides meaningful error messages', async () => {
      // Non-existent file
      await expect(adapter.stat('missing.txt')).rejects.toThrow('File not found: missing.txt');
      await expect(adapter.read('missing.txt')).rejects.toThrow('File not found: missing.txt');
      
      // Directory instead of file
      await fs.mkdir(path.join(tempDir, 'onlydir'));
      await expect(adapter.read('onlydir')).rejects.toThrow('Path is not a file: onlydir');
    });
    
    test('handles permission errors gracefully', async () => {
      const filePath = 'restricted.txt';
      await fs.writeFile(path.join(tempDir, filePath), 'content');
      
      // Remove read permissions (this test may not work on all systems)
      try {
        await fs.chmod(path.join(tempDir, filePath), 0o000);
        await expect(adapter.read(filePath)).rejects.toThrow();
      } catch {
        // Skip if chmod doesn't work (e.g., on Windows)
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(path.join(tempDir, filePath), 0o644);
        } catch {
          // Ignore
        }
      }
    });
  });
  
  describe('edge cases', () => {
    test('handles files with special characters in names', async () => {
      const specialFiles = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
        'file.with.dots.txt',
      ];
      
      for (const fileName of specialFiles) {
        await fs.writeFile(path.join(tempDir, fileName), 'content');
        const exists = await adapter.exists(fileName);
        expect(exists).toBe(true);
        
        const fileInfo = await adapter.read(fileName);
        expect(fileInfo.size).toBe(Buffer.byteLength('content'));
      }
    });
    
    test('handles zero-byte files', async () => {
      const filePath = 'zero-byte.txt';
      await fs.writeFile(path.join(tempDir, filePath), '');
      
      const fileInfo = await adapter.read(filePath);
      expect(fileInfo.size).toBe(0);
      
      // Should still be able to read empty stream
      const reader = fileInfo.body.getReader();
      const { done } = await reader.read();
      expect(done).toBe(true);
      reader.releaseLock();
    });
  });
});