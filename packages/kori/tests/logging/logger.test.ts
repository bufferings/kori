import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import { serializeError } from '../../src/logging/error-serializer.js';
import { type KoriLogEntry, type KoriLogLevel } from '../../src/logging/log-entry.js';
import { createKoriLogger, type KoriLogger } from '../../src/logging/logger.js';

describe('KoriLogger', () => {
  let mockWriteFn: ReturnType<typeof vi.fn>;
  let logger: KoriLogger;

  beforeEach(() => {
    mockWriteFn = vi.fn();
    const mockReporter = {
      sinks: [
        {
          formatter: (entry: KoriLogEntry) => JSON.stringify(entry),
          write: mockWriteFn,
        },
      ],
    };
    logger = createKoriLogger({
      channel: 'test',
      name: 'logger',
      level: 'info',
      bindings: {},
      reporter: mockReporter,
      errorSerializer: serializeError,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log entry structure', () => {
    test('should create complete log entry', () => {
      const fixedTime = 1640995200000; // 2022-01-01 00:00:00 UTC
      vi.useFakeTimers({ now: fixedTime });

      try {
        logger.info('Test message');

        expect(mockWriteFn).toHaveBeenCalledTimes(1);
        const logEntry: KoriLogEntry = mockWriteFn.mock.calls[0]?.[1]; // Second argument is the entry

        expect(logEntry).toEqual({
          time: fixedTime,
          level: 'info',
          channel: 'test',
          name: 'logger',
          message: 'Test message',
        });
      } finally {
        vi.useRealTimers();
      }
    });

    test('should include meta when provided', () => {
      const meta = { userId: 'user-123', action: 'login' };
      logger.info('User action', meta);

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          level: 'info',
          channel: 'test',
          name: 'logger',
          message: 'User action',
          meta: { userId: 'user-123', action: 'login' },
        }),
      );
    });

    test('should handle empty meta object', () => {
      logger.info('Test message', {});

      const logEntry = mockWriteFn.mock.calls[0]?.[1]; // Second argument is the entry
      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Test message',
        }),
      );
      expect(logEntry).not.toHaveProperty('meta');
    });
  });

  describe('log level methods', () => {
    const levels: KoriLogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

    test.each(levels)('should log %s level messages', (level) => {
      // Create logger with debug level to allow all levels
      const debugLogger = createKoriLogger({
        channel: 'test',
        name: 'logger',
        level: 'debug',
        bindings: {},
        reporter: {
          sinks: [
            {
              formatter: (entry: KoriLogEntry) => JSON.stringify(entry),
              write: mockWriteFn,
            },
          ],
        },
        errorSerializer: serializeError,
      });

      debugLogger[level](`${level} message`);

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          level,
          message: `${level} message`,
        }),
      );
    });

    test('should respect log level filtering', () => {
      // Logger with 'warn' level should only log warn, error, fatal
      const warnLogger = createKoriLogger({
        channel: 'test',
        name: 'logger',
        level: 'warn',
        bindings: {},
        reporter: {
          sinks: [
            {
              formatter: (entry: KoriLogEntry) => JSON.stringify(entry),
              write: mockWriteFn,
            },
          ],
        },
        errorSerializer: serializeError,
      });

      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warn message');
      warnLogger.error('Error message');
      warnLogger.fatal('Fatal message');

      expect(mockWriteFn).toHaveBeenCalledTimes(3);
      expect(mockWriteFn).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({ level: 'warn' }));
      expect(mockWriteFn).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ level: 'error' }));
      expect(mockWriteFn).toHaveBeenNthCalledWith(3, expect.any(String), expect.objectContaining({ level: 'fatal' }));
    });
  });

  describe('isLevelEnabled', () => {
    test('should return correct enabled status for info level logger', () => {
      // Logger with 'info' level
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
      expect(logger.isLevelEnabled('fatal')).toBe(true);
    });

    test('should return correct enabled status for error level logger', () => {
      const errorLogger = createKoriLogger({
        channel: 'test',
        name: 'logger',
        level: 'error',
        bindings: {},
        reporter: {
          sinks: [
            {
              formatter: (entry: KoriLogEntry) => JSON.stringify(entry),
              write: mockWriteFn,
            },
          ],
        },
        errorSerializer: serializeError,
      });

      expect(errorLogger.isLevelEnabled('debug')).toBe(false);
      expect(errorLogger.isLevelEnabled('info')).toBe(false);
      expect(errorLogger.isLevelEnabled('warn')).toBe(false);
      expect(errorLogger.isLevelEnabled('error')).toBe(true);
      expect(errorLogger.isLevelEnabled('fatal')).toBe(true);
    });
  });

  describe('reporter error handling', () => {
    test('should handle reporter errors gracefully', () => {
      const failingWriteFn = vi.fn(() => {
        throw new Error('Reporter error');
      });
      const failingReporter = {
        sinks: [
          {
            formatter: (entry: KoriLogEntry) => JSON.stringify(entry),
            write: failingWriteFn,
          },
        ],
      };

      const resilientLogger = createKoriLogger({
        channel: 'test',
        name: 'logger',
        level: 'info',
        bindings: {},
        reporter: failingReporter,
        errorSerializer: serializeError,
      });

      // Should not throw when reporter fails
      expect(() => {
        resilientLogger.info('Resilience test');
      }).not.toThrow();

      expect(failingWriteFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('serializeError method', () => {
    test('should expose serializeError method', () => {
      expect(typeof logger.serializeError).toBe('function');
    });

    test('should serialize Error instances', () => {
      const error = new Error('Test error');
      const result = logger.serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: expect.any(String),
      });
    });

    test('should return non-Error values unchanged', () => {
      const result = logger.serializeError('string error');
      expect(result).toBe('string error');
    });
  });
});
