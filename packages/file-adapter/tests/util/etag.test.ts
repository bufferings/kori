import { describe, test, expect } from 'vitest';

import { createWeakEtag, parseEtag, compareEtags } from '../../src/util/etag.js';
import type { FileStats } from '../../src/types.js';

describe('ETag utilities', () => {
  describe('createWeakEtag', () => {
    test('creates weak ETag from file stats with mtime', () => {
      const stats: FileStats = {
        size: 1024,
        mtime: new Date('2023-01-01T00:00:00Z'),
        isFile: true,
        isDirectory: false,
      };

      const etag = createWeakEtag(stats);
      expect(etag).toBe('W/"1024-1672531200000"');
    });

    test('creates weak ETag from file stats without mtime', () => {
      const stats: FileStats = {
        size: 512,
        isFile: true,
        isDirectory: false,
      };

      const etag = createWeakEtag(stats);
      expect(etag).toBe('W/"512-0"');
    });

    test('handles zero size', () => {
      const mtime = new Date('2023-06-15T12:30:45Z');
      const stats: FileStats = {
        size: 0,
        mtime,
        isFile: true,
        isDirectory: false,
      };

      const etag = createWeakEtag(stats);
      expect(etag).toBe(`W/"0-${mtime.getTime()}"`);
    });

    test('handles large file size', () => {
      const stats: FileStats = {
        size: 9999999999,
        mtime: new Date('2023-12-31T23:59:59Z'),
        isFile: true,
        isDirectory: false,
      };

      const etag = createWeakEtag(stats);
      expect(etag).toBe('W/"9999999999-1704067199000"');
    });
  });

  describe('parseEtag', () => {
    test('parses weak ETag', () => {
      const parsed = parseEtag('W/"1024-1672531200000"');
      expect(parsed).toBe('1024-1672531200000');
    });

    test('parses strong ETag', () => {
      const parsed = parseEtag('"strong-etag"');
      expect(parsed).toBe('strong-etag');
    });

    test('handles ETag without quotes', () => {
      const parsed = parseEtag('simple-etag');
      expect(parsed).toBe('simple-etag');
    });

    test('handles empty ETag', () => {
      const parsed = parseEtag('');
      expect(parsed).toBe('');
    });

    test('handles malformed ETag', () => {
      const parsed = parseEtag('W/malformed');
      expect(parsed).toBe('malformed');
    });
  });

  describe('compareEtags', () => {
    test('compares identical weak ETags', () => {
      const result = compareEtags('W/"123-456"', 'W/"123-456"');
      expect(result).toBe(true);
    });

    test('compares different weak ETags', () => {
      const result = compareEtags('W/"123-456"', 'W/"789-012"');
      expect(result).toBe(false);
    });

    test('compares weak and strong ETags with same value', () => {
      const result = compareEtags('"123-456"', 'W/"123-456"');
      expect(result).toBe(true);
    });

    test('compares strong and weak ETags with same value', () => {
      const result = compareEtags('W/"abc-def"', '"abc-def"');
      expect(result).toBe(true);
    });

    test('compares different strong and weak ETags', () => {
      const result = compareEtags('"abc-def"', 'W/"xyz-123"');
      expect(result).toBe(false);
    });

    test('compares identical strong ETags', () => {
      const result = compareEtags('"strong-tag"', '"strong-tag"');
      expect(result).toBe(true);
    });

    test('handles ETags without quotes', () => {
      const result = compareEtags('simple', 'simple');
      expect(result).toBe(true);
    });

    test('handles mixed quoted and unquoted ETags', () => {
      const result = compareEtags('"quoted"', 'quoted');
      expect(result).toBe(true);
    });
  });
});