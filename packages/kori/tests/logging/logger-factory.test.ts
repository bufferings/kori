import { afterEach, describe, expect, test, vi } from 'vitest';

import { type KoriLogEntry } from '../../src/logging/log-entry.js';
import { createKoriLoggerFactory } from '../../src/logging/logger-factory.js';

describe('createKoriLoggerFactory', () => {
  afterEach(() => {
    // Restore all mocks to ensure test independence
    vi.restoreAllMocks();
  });

  describe('default configuration', () => {
    test('should create logger factory with default settings', () => {
      const loggerFactory = createKoriLoggerFactory();
      const logger = loggerFactory({ channel: 'test', name: 'default' });

      // Default level should be 'info'
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    test('should use pretty console reporter by default', () => {
      const fixedTime = 1640995200000; // 2022-01-01 00:00:00 UTC
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        vi.useFakeTimers({ now: fixedTime });

        const loggerFactory = createKoriLoggerFactory();
        const logger = loggerFactory({ channel: 'test', name: 'console' });

        logger.info('Default reporter test');

        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const logOutput = mockConsoleLog.mock.calls[0]?.[0];

        // Should use pretty format with colorization (default)
        expect(logOutput).toBe('2022-01-01T00:00:00.000Z \x1b[32mINFO \x1b[0m [test:console] Default reporter test');
      } finally {
        vi.useRealTimers();
      }
    });

    test('should have empty bindings by default', () => {
      const mockWriteFn = vi.fn();
      const mockReporter = {
        sinks: [
          {
            formatter: (entry: KoriLogEntry) => JSON.stringify(entry),
            write: mockWriteFn,
          },
        ],
      };
      const loggerFactory = createKoriLoggerFactory({ reporter: mockReporter });
      const logger = loggerFactory({ channel: 'test', name: 'bindings' });

      logger.info('Empty bindings test');

      expect(mockWriteFn).toHaveBeenCalledTimes(1);
      const logEntry = mockWriteFn.mock.calls[0]?.[1]; // Second argument is the entry
      expect(logEntry).toEqual(
        expect.objectContaining({
          channel: 'test',
          name: 'bindings',
          level: 'info',
          message: 'Empty bindings test',
        }),
      );
      expect(logEntry).not.toHaveProperty('meta');
    });
  });

  describe('custom configuration', () => {
    test('should respect custom log level', () => {
      const loggerFactory = createKoriLoggerFactory({ level: 'warn' });
      const logger = loggerFactory({ channel: 'test', name: 'level' });

      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(false);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
      expect(logger.isLevelEnabled('fatal')).toBe(true);
    });

    test('should apply global bindings to all loggers', () => {
      const mockWriteFn = vi.fn();
      const mockReporter = {
        sinks: [
          {
            formatter: (entry: KoriLogEntry) => JSON.stringify(entry),
            write: mockWriteFn,
          },
        ],
      };
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        bindings: { service: 'api', version: '2.0.0', environment: 'test' },
        reporter: mockReporter,
      });

      const logger1 = loggerFactory({ channel: 'app', name: 'server' });
      const logger2 = loggerFactory({ channel: 'database', name: 'connection' });

      logger1.info('First logger message');
      logger2.error('Second logger message');

      expect(mockWriteFn).toHaveBeenCalledTimes(2);

      expect(mockWriteFn).toHaveBeenNthCalledWith(
        1,
        expect.any(String), // formatted string
        expect.objectContaining({
          channel: 'app',
          name: 'server',
          meta: expect.objectContaining({
            service: 'api',
            version: '2.0.0',
            environment: 'test',
          }),
        }),
      );

      expect(mockWriteFn).toHaveBeenNthCalledWith(
        2,
        expect.any(String), // formatted string
        expect.objectContaining({
          channel: 'database',
          name: 'connection',
          meta: expect.objectContaining({
            service: 'api',
            version: '2.0.0',
            environment: 'test',
          }),
        }),
      );
    });

    test('should use custom reporter', () => {
      const mockWriteFn = vi.fn();
      const mockReporter = {
        sinks: [
          {
            formatter: (entry: KoriLogEntry) => JSON.stringify(entry),
            write: mockWriteFn,
          },
        ],
      };

      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporter: mockReporter,
      });

      const logger = loggerFactory({ channel: 'test', name: 'custom-reporter' });
      logger.info('Custom reporter test');

      expect(mockWriteFn).toHaveBeenCalledTimes(1);

      const expectedLogEntry = expect.objectContaining({
        level: 'info',
        channel: 'test',
        name: 'custom-reporter',
        message: 'Custom reporter test',
      });

      expect(mockWriteFn).toHaveBeenCalledWith(expect.any(String), expectedLogEntry);
    });

    test('should handle undefined reporter', () => {
      const loggerFactory = createKoriLoggerFactory({ reporter: undefined });
      const logger = loggerFactory({ channel: 'test', name: 'no-reporters' });

      // Should not throw when no reporters are configured
      expect(() => {
        logger.info('Message with no reporters');
      }).not.toThrow();
    });
  });
});
