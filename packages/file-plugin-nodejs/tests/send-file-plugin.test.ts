import { describe, it, expect } from 'vitest';

import { resolveFilename } from '../src/send-file-plugin/file/resolve-file-name.js';
import { createContentDispositionHeader } from '../src/send-file-plugin/header/create-content-disposition-header.js';
import { sendFilePlugin } from '../src/send-file-plugin/send-file-plugin.js';
import { detectMimeType } from '../src/share/detect-mime-type.js';

describe('Content-Disposition utilities', () => {
  describe('createContentDisposition', () => {
    it('should create attachment disposition without filename', () => {
      const result = createContentDispositionHeader({});
      expect(result).toBe('attachment');
    });

    it('should create attachment disposition with simple filename', () => {
      const result = createContentDispositionHeader({ filename: 'document.pdf' });
      expect(result).toBe('attachment; filename="document.pdf"');
    });

    it('should create inline disposition with filename', () => {
      const result = createContentDispositionHeader({
        disposition: 'inline',
        filename: 'image.jpg',
      });
      expect(result).toBe('inline; filename="image.jpg"');
    });

    it('should handle non-ASCII filenames using RFC 6266', () => {
      const result = createContentDispositionHeader({
        // eslint-disable-next-line kori/ascii-only-source
        filename: 'レポート.pdf',
      });
      expect(result).toBe(
        'attachment; filename="????.pdf"; filename*=UTF-8\'\'%E3%83%AC%E3%83%9D%E3%83%BC%E3%83%88.pdf',
      );
    });

    it('should handle filenames with quotes using RFC 6266', () => {
      const result = createContentDispositionHeader({
        filename: 'file"with"quotes.pdf',
      });
      expect(result).toBe('attachment; filename="file\\"with\\"quotes.pdf"');
    });

    it('should handle filenames with special characters', () => {
      const result = createContentDispositionHeader({
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

describe('Send File Plugin', () => {
  describe('plugin creation', () => {
    it('should create plugin with correct name and version', () => {
      const plugin = sendFilePlugin();

      expect(plugin.name).toBe('send-file-nodejs');
      expect(plugin.version).toBe('0.1.0');
      expect(plugin.apply).toBeDefined();
    });
  });

  describe('file sending functionality', () => {
    it('should handle basic file sending concepts', () => {
      // Test basic plugin structure without complex mocking
      const plugin = sendFilePlugin();
      expect(plugin.name).toBe('send-file-nodejs');
      expect(typeof plugin.apply).toBe('function');
    });

    it('should handle file path resolution', () => {
      // Test filename resolution logic
      const filename = resolveFilename('/uploads/test.pdf', 'custom.pdf');
      expect(filename).toBe('custom.pdf');
    });

    it('should create proper content disposition headers for downloads', () => {
      // Test content disposition creation for downloads
      const header = createContentDispositionHeader({
        filename: 'test.pdf',
        disposition: 'attachment',
      });
      expect(header).toContain('attachment');
      expect(header).toContain('filename');
    });

    it('should create proper content disposition headers for inline display', () => {
      // Test content disposition creation for inline display
      const header = createContentDispositionHeader({
        filename: 'image.jpg',
        disposition: 'inline',
      });
      expect(header).toContain('inline');
      expect(header).toContain('filename');
    });
  });

  describe('MIME type detection with mime-types library', () => {
    it('should detect common file types correctly', () => {
      // Test basic file types
      expect(detectMimeType('document.pdf')).toBe('application/pdf');
      expect(detectMimeType('image.jpg')).toBe('image/jpeg');
      expect(detectMimeType('image.png')).toBe('image/png');
      expect(detectMimeType('script.js')).toBe('text/javascript'); // mime-types returns text/javascript
      expect(detectMimeType('data.json')).toBe('application/json');
    });

    it('should detect modern web file types', () => {
      // Test file types that weren't in our old hardcoded list
      expect(detectMimeType('image.webp')).toBe('image/webp');
      expect(detectMimeType('icon.svg')).toBe('image/svg+xml');
      expect(detectMimeType('video.mp4')).toBe('application/mp4'); // mime-types returns application/mp4
      expect(detectMimeType('video.webm')).toBe('video/webm');
      expect(detectMimeType('font.woff2')).toBe('font/woff2');
    });

    it('should handle unknown file types with fallback', () => {
      // Test unknown extension
      expect(detectMimeType('file.unknownext')).toBe('application/octet-stream');
      expect(detectMimeType('noextension')).toBe('application/octet-stream');
    });

    it('should handle file paths correctly', () => {
      // Test with full paths
      expect(detectMimeType('/path/to/document.pdf')).toBe('application/pdf');
      expect(detectMimeType('./relative/path/image.webp')).toBe('image/webp');
      expect(detectMimeType('C:\\Windows\\file.txt')).toBe('text/plain');
    });
  });
});
