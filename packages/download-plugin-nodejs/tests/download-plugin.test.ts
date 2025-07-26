import { describe, it, expect } from 'vitest';

import { createContentDisposition, resolveFilename } from '../src/content-disposition.js';
import { downloadPlugin } from '../src/download-plugin.js';

describe('Content-Disposition utilities', () => {
  describe('createContentDisposition', () => {
    it('should create attachment disposition without filename', () => {
      const result = createContentDisposition({});
      expect(result).toBe('attachment');
    });

    it('should create attachment disposition with simple filename', () => {
      const result = createContentDisposition({ filename: 'document.pdf' });
      expect(result).toBe('attachment; filename="document.pdf"');
    });

    it('should create inline disposition with filename', () => {
      const result = createContentDisposition({
        disposition: 'inline',
        filename: 'image.jpg',
      });
      expect(result).toBe('inline; filename="image.jpg"');
    });

    it('should handle non-ASCII filenames using RFC 6266', () => {
      const result = createContentDisposition({
        // eslint-disable-next-line kori/ascii-only-source
        filename: 'レポート.pdf',
      });
      expect(result).toBe(
        'attachment; filename="????.pdf"; filename*=UTF-8\'\'%E3%83%AC%E3%83%9D%E3%83%BC%E3%83%88.pdf',
      );
    });

    it('should handle filenames with quotes using RFC 6266', () => {
      const result = createContentDisposition({
        filename: 'file"with"quotes.pdf',
      });
      expect(result).toBe('attachment; filename="file\\"with\\"quotes.pdf"');
    });

    it('should handle filenames with special characters', () => {
      const result = createContentDisposition({
        filename: 'file with spaces & symbols.txt',
      });
      expect(result).toBe('attachment; filename="file with spaces & symbols.txt"');
    });
  });

  describe('resolveFilename', () => {
    it('should return user filename when provided', () => {
      const result = resolveFilename('/path/to/file.pdf', 'custom.pdf');
      expect(result).toBe('custom.pdf');
    });

    it('should extract filename from path when user filename not provided', () => {
      const result = resolveFilename('/path/to/document.pdf');
      expect(result).toBe('document.pdf');
    });

    it('should handle simple filenames', () => {
      const result = resolveFilename('report.txt');
      expect(result).toBe('report.txt');
    });

    it('should handle Unix-style paths correctly', () => {
      const result = resolveFilename('/home/user/file.doc');
      expect(result).toBe('file.doc');
    });

    it('should fallback to basename when empty user filename provided', () => {
      const result = resolveFilename('/path/to/test.js', '');
      expect(result).toBe('test.js');
    });
  });
});

describe('Download Plugin', () => {
  describe('plugin creation', () => {
    it('should create plugin with correct name and version', () => {
      const plugin = downloadPlugin();

      expect(plugin.name).toBe('download-plugin-nodejs');
      expect(plugin.version).toBe('0.1.0');
      expect(plugin.apply).toBeDefined();
    });
  });

  describe('download functionality', () => {
    it('should handle basic file download concepts', () => {
      // Test basic plugin structure without complex mocking
      const plugin = downloadPlugin();
      expect(plugin.name).toBe('download-plugin-nodejs');
      expect(typeof plugin.apply).toBe('function');
    });

    it('should handle file path resolution', () => {
      // Test downloadFilename resolution logic
      const downloadFilename = resolveFilename('/uploads/test.pdf', 'custom.pdf');
      expect(downloadFilename).toBe('custom.pdf');
    });

    it('should create proper content disposition headers', () => {
      // Test content disposition creation
      const header = createContentDisposition({
        filename: 'test.pdf',
        disposition: 'attachment',
      });
      expect(header).toContain('attachment');
      expect(header).toContain('filename');
    });
  });
});
