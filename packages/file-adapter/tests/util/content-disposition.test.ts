import { describe, test, expect } from 'vitest';

import { createContentDisposition, extractFilename } from '../../src/util/content-disposition.js';

describe('Content-Disposition utilities', () => {
  describe('createContentDisposition', () => {
    test('creates simple attachment disposition', () => {
      const result = createContentDisposition({
        filename: 'report.pdf',
        type: 'attachment',
      });
      expect(result).toBe('attachment; filename="report.pdf"');
    });

    test('creates inline disposition', () => {
      const result = createContentDisposition({
        filename: 'image.jpg',
        type: 'inline',
      });
      expect(result).toBe('inline; filename="image.jpg"');
    });

    test('handles empty filename', () => {
      const result = createContentDisposition({
        filename: '',
        type: 'attachment',
      });
      expect(result).toBe('attachment');
    });

    test('escapes quotes in ASCII filename', () => {
      const result = createContentDisposition({
        filename: 'file"with"quotes.txt',
        type: 'attachment',
      });
      expect(result).toBe('attachment; filename="file\\"with\\"quotes.txt"');
    });

    test('escapes backslashes in ASCII filename', () => {
      const result = createContentDisposition({
        filename: 'file\\\\with\\\\backslashes.txt',
        type: 'attachment',
      });
      expect(result).toBe('attachment; filename="file\\\\\\\\with\\\\\\\\backslashes.txt"');
    });

    test('handles UTF-8 filename with RFC 5987 encoding', () => {
      const result = createContentDisposition({
        filename: '日本語ファイル.txt',
        type: 'attachment',
      });
      
      // Should include both fallback and UTF-8 encoded filename
      expect(result).toContain('attachment; filename="???????.txt"');
      expect(result).toContain('filename*=UTF-8\'\'');
      expect(result).toContain('%E6%97%A5%E6%9C%AC%E8%AA%9E'); // 日本語 encoded
    });

    test('handles mixed ASCII and UTF-8 characters', () => {
      const result = createContentDisposition({
        filename: 'file-日本語.txt',
        type: 'attachment',
      });
      
      expect(result).toContain('attachment; filename="file-???.txt"');
      expect(result).toContain('filename*=UTF-8\'\'');
      expect(result).toContain('file-%E6%97%A5%E6%9C%AC%E8%AA%9E.txt');
    });

    test('handles European characters', () => {
      const result = createContentDisposition({
        filename: 'résumé.pdf',
        type: 'attachment',
      });
      
      expect(result).toContain('attachment; filename="r?sum?.pdf"');
      expect(result).toContain('filename*=UTF-8\'\'');
      expect(result).toContain('r%C3%A9sum%C3%A9.pdf');
    });

    test('handles emoji in filename', () => {
      const result = createContentDisposition({
        filename: 'test-📄.txt',
        type: 'attachment',
      });
      
      expect(result).toContain('attachment; filename="test-??.txt"');
      expect(result).toContain('filename*=UTF-8\'\'');
      expect(result).toContain('%F0%9F%93%84'); // 📄 encoded
    });

    test('handles special characters that need escaping in RFC 5987', () => {
      const result = createContentDisposition({
        filename: 'file(with)special*.txt',
        type: 'attachment',
      });
      
      // This is ASCII so should not use RFC 5987
      expect(result).toBe('attachment; filename="file(with)special*.txt"');
    });

    test('creates inline disposition with UTF-8', () => {
      const result = createContentDisposition({
        filename: 'image-テスト.jpg',
        type: 'inline',
      });
      
      expect(result).toContain('inline; filename="image-???.jpg"');
      expect(result).toContain('filename*=UTF-8\'\'');
    });
  });

  describe('extractFilename', () => {
    test('extracts filename from Unix path', () => {
      expect(extractFilename('/var/www/uploads/document.pdf')).toBe('document.pdf');
      expect(extractFilename('/home/user/file.txt')).toBe('file.txt');
    });

    test('extracts filename from Windows path', () => {
      expect(extractFilename('C:\\\\Users\\\\file.txt')).toBe('file.txt');
      expect(extractFilename('D:\\\\Documents\\\\report.docx')).toBe('report.docx');
    });

    test('handles mixed separators', () => {
      expect(extractFilename('/var/www\\\\uploads/file.txt')).toBe('file.txt');
      expect(extractFilename('C:/Users\\\\Documents/file.pdf')).toBe('file.pdf');
    });

    test('handles filename without path', () => {
      expect(extractFilename('simple-file.jpg')).toBe('simple-file.jpg');
      expect(extractFilename('README')).toBe('README');
    });

    test('handles empty path', () => {
      expect(extractFilename('')).toBe('');
    });

    test('handles path ending with separator', () => {
      expect(extractFilename('/path/to/directory/')).toBe('');
      expect(extractFilename('C:\\\\Windows\\\\')).toBe('');
    });

    test('handles UTF-8 filenames', () => {
      expect(extractFilename('/uploads/日本語ファイル.txt')).toBe('日本語ファイル.txt');
      expect(extractFilename('C:\\\\Documents\\\\résumé.pdf')).toBe('résumé.pdf');
    });

    test('handles special characters in filename', () => {
      expect(extractFilename('/path/file with spaces.txt')).toBe('file with spaces.txt');
      expect(extractFilename('/path/file-with-dashes_and_underscores.txt')).toBe('file-with-dashes_and_underscores.txt');
    });
  });
});