import { describe, test, expect } from 'vitest';

import { normalizePath, validatePath, safeJoin } from '../../src/util/path.js';

describe('Path utilities', () => {
  describe('normalizePath', () => {
    test('normalizes simple paths', () => {
      expect(normalizePath('file.txt')).toBe('file.txt');
      expect(normalizePath('dir/file.txt')).toBe('dir/file.txt');
      expect(normalizePath('/file.txt')).toBe('file.txt');
    });

    test('resolves current directory references', () => {
      expect(normalizePath('./file.txt')).toBe('file.txt');
      expect(normalizePath('dir/./file.txt')).toBe('dir/file.txt');
      expect(normalizePath('./dir/./file.txt')).toBe('dir/file.txt');
    });

    test('resolves parent directory references', () => {
      expect(normalizePath('dir/../file.txt')).toBe('file.txt');
      expect(normalizePath('dir1/dir2/../file.txt')).toBe('dir1/file.txt');
      expect(normalizePath('dir/../other/../file.txt')).toBe('file.txt');
    });

    test('handles multiple slashes', () => {
      expect(normalizePath('//double//slash')).toBe('double/slash');
      expect(normalizePath('///triple///slash')).toBe('triple/slash');
    });

    test('handles backslashes', () => {
      expect(normalizePath('dir\\\\file.txt')).toBe('dir/file.txt');
      expect(normalizePath('C:\\\\Windows\\\\file.txt')).toBe('C:/Windows/file.txt');
    });

    test('handles root and empty paths', () => {
      expect(normalizePath('')).toBe('');
      expect(normalizePath('/')).toBe('');
      expect(normalizePath('//')).toBe('');
    });

    test('handles parent directory at root level', () => {
      expect(normalizePath('../file.txt')).toBe(''); // Can't go above root
      expect(normalizePath('../../file.txt')).toBe('');
      expect(normalizePath('/../file.txt')).toBe('');
    });

    test('handles complex paths', () => {
      expect(normalizePath('./dir1/../dir2/./file.txt')).toBe('dir2/file.txt');
      expect(normalizePath('/./dir/../other/file.txt')).toBe('other/file.txt');
    });
  });

  describe('validatePath', () => {
    test('accepts safe paths', () => {
      expect(() => validatePath('file.txt')).not.toThrow();
      expect(() => validatePath('dir/file.txt')).not.toThrow();
      expect(() => validatePath('safe/path/to/file.txt')).not.toThrow();
    });

    test('rejects empty paths', () => {
      expect(() => validatePath('')).toThrow('Path cannot be empty');
    });

    test('rejects null byte attacks', () => {
      expect(() => validatePath('file\u0000.txt')).toThrow('Path cannot contain null bytes');
      expect(() => validatePath('dir/file\u0000')).toThrow('Path cannot contain null bytes');
    });

    test('rejects directory traversal patterns', () => {
      expect(() => validatePath('../etc/passwd')).toThrow('Unsafe path detected');
      expect(() => validatePath('dir/../../../etc/passwd')).toThrow('Unsafe path detected');
      expect(() => validatePath('..\\\\windows\\\\system32')).toThrow('Unsafe path detected');
    });

    test('rejects absolute paths', () => {
      expect(() => validatePath('/etc/passwd')).toThrow('Unsafe path detected');
      expect(() => validatePath('\\\\windows\\\\system32')).toThrow('Unsafe path detected');
    });

    test('rejects Windows drive letters', () => {
      expect(() => validatePath('C:\\\\file.txt')).toThrow('Unsafe path detected');
      expect(() => validatePath('D:/data/file.txt')).toThrow('Unsafe path detected');
    });

    test('rejects paths ending with ..', () => {
      expect(() => validatePath('dir/..')).toThrow('Unsafe path detected');
      expect(() => validatePath('..')).toThrow('Unsafe path detected');
    });

    test('rejects normalized traversal paths', () => {
      expect(() => validatePath('dir/../../../file.txt')).toThrow('Unsafe path detected');
      expect(() => validatePath('safe/dir/../../../../../../etc/passwd')).toThrow('Unsafe path detected');
    });
  });

  describe('safeJoin', () => {
    test('joins safe paths correctly', () => {
      expect(safeJoin('/var/www', 'public/index.html')).toBe('/var/www/public/index.html');
      expect(safeJoin('/home/user', 'documents/file.txt')).toBe('/home/user/documents/file.txt');
    });

    test('handles empty relative paths', () => {
      expect(safeJoin('/var/www', '')).toBe('/var/www');
    });

    test('rejects traversal attempts', () => {
      expect(() => safeJoin('/var/www', '../etc/passwd')).toThrow('Unsafe path detected');
      expect(() => safeJoin('/home/user', '../../etc/passwd')).toThrow('Unsafe path detected');
    });

    test('handles normalized safe paths', () => {
      expect(() => safeJoin('/var/www', 'dir/../file.txt')).toThrow('Unsafe path detected'); // Contains traversal pattern
    });

    test('works with Windows-style paths', () => {
      expect(() => safeJoin('C:\\Users\\user', 'documents\\file.txt')).toThrow('Path would escape base directory');
    });

    test('prevents escape from base directory', () => {
      expect(() => safeJoin('/var/www', '../../../etc/passwd')).toThrow('Unsafe path detected');
    });

    test('handles base path without trailing slash', () => {
      expect(safeJoin('/var/www/public', 'css/style.css')).toBe('/var/www/public/css/style.css');
    });
  });
});