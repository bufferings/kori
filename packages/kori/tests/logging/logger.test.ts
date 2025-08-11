import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import { serializeError } from '../../src/logging/error-serializer.js';
import { type KoriLogEntry, type KoriLogLevel } from '../../src/logging/log-entry.js';
import { createKoriLogger, type KoriLogger } from '../../src/logging/logger.js';

describe('KoriLogger', () => {
  let mockReporter: ReturnType<typeof vi.fn>;
  let logger: KoriLogger;

  beforeEach(() => {
    mockReporter = vi.fn();
    logger = createKoriLogger({
      channel: 'test',
      name: 'logger',
      level: 'info',
      bindings: {},
      reporters: [mockReporter],
      errorSerializer: serializeError,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log entry structure', () => {
    test('should create complete log entry', () => {
      const fixedTime = 1640995200000; // 2022-01-01 00:00:00 UTC
      vi.useFakeTimers();
      vi.setSystemTime(fixedTime);

      logger.info('Test message');

      expect(mockReporter).toHaveBeenCalledTimes(1);
      const logEntry: KoriLogEntry = mockReporter.mock.calls[0]?.[0];

      expect(logEntry).toEqual({
        time: fixedTime,
        level: 'info',
        channel: 'test',
        name: 'logger',
        message: 'Test message',
        meta: {},
      });

      vi.useRealTimers();
    });

    test('should include meta when provided', () => {
      const meta = { userId: 'user-123', action: 'login' };
      logger.info('User action', meta);

      expect(mockReporter).toHaveBeenCalledWith(
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

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test message',
          meta: {},
        }),
      );
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
        reporters: [mockReporter],
        errorSerializer: serializeError,
      });

      debugLogger[level](`${level} message`);

      expect(mockReporter).toHaveBeenCalledWith(
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
        reporters: [mockReporter],
        errorSerializer: serializeError,
      });

      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warn message');
      warnLogger.error('Error message');
      warnLogger.fatal('Fatal message');

      expect(mockReporter).toHaveBeenCalledTimes(3);
      expect(mockReporter).toHaveBeenNthCalledWith(1, expect.objectContaining({ level: 'warn' }));
      expect(mockReporter).toHaveBeenNthCalledWith(2, expect.objectContaining({ level: 'error' }));
      expect(mockReporter).toHaveBeenNthCalledWith(3, expect.objectContaining({ level: 'fatal' }));
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
        reporters: [mockReporter],
        errorSerializer: serializeError,
      });

      expect(errorLogger.isLevelEnabled('debug')).toBe(false);
      expect(errorLogger.isLevelEnabled('info')).toBe(false);
      expect(errorLogger.isLevelEnabled('warn')).toBe(false);
      expect(errorLogger.isLevelEnabled('error')).toBe(true);
      expect(errorLogger.isLevelEnabled('fatal')).toBe(true);
    });
  });

  describe('multiple reporters', () => {
    test('should send log entry to all reporters', () => {
      const reporter1 = vi.fn();
      const reporter2 = vi.fn();
      const reporter3 = vi.fn();

      const multiReporterLogger = createKoriLogger({
        channel: 'test',
        name: 'logger',
        level: 'info',
        bindings: {},
        reporters: [reporter1, reporter2, reporter3],
        errorSerializer: serializeError,
      });

      multiReporterLogger.info('Multi-reporter test');

      const expectedEntry = expect.objectContaining({
        level: 'info',
        message: 'Multi-reporter test',
      });

      expect(reporter1).toHaveBeenCalledTimes(1);
      expect(reporter2).toHaveBeenCalledTimes(1);
      expect(reporter3).toHaveBeenCalledTimes(1);

      expect(reporter1).toHaveBeenCalledWith(expectedEntry);
      expect(reporter2).toHaveBeenCalledWith(expectedEntry);
      expect(reporter3).toHaveBeenCalledWith(expectedEntry);
    });

    test('should continue logging to other reporters if one throws', () => {
      const workingReporter1 = vi.fn();
      const failingReporter = vi.fn(() => {
        throw new Error('Reporter error');
      });
      const workingReporter2 = vi.fn();

      const resilientLogger = createKoriLogger({
        channel: 'test',
        name: 'logger',
        level: 'info',
        bindings: {},
        reporters: [workingReporter1, failingReporter, workingReporter2],
        errorSerializer: serializeError,
      });

      resilientLogger.info('Resilience test');

      expect(workingReporter1).toHaveBeenCalledTimes(1);
      expect(failingReporter).toHaveBeenCalledTimes(1);
      expect(workingReporter2).toHaveBeenCalledTimes(1);
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
