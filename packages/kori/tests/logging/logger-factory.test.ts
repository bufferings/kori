import { afterEach, describe, expect, test, vi } from 'vitest';

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

    test('should use console reporter by default', () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      const loggerFactory = createKoriLoggerFactory();
      const logger = loggerFactory({ channel: 'test', name: 'console' });

      logger.info('Default reporter test');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const logOutput = mockConsoleLog.mock.calls[0]?.[0];
      expect(logOutput).toContain('"message":"Default reporter test"');
    });

    test('should have empty bindings by default', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({ reporters: [mockReporter] });
      const logger = loggerFactory({ channel: 'test', name: 'bindings' });

      logger.info('Empty bindings test');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: {},
        }),
      );
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
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        bindings: { service: 'api', version: '2.0.0', environment: 'test' },
        reporters: [mockReporter],
      });

      const logger1 = loggerFactory({ channel: 'app', name: 'server' });
      const logger2 = loggerFactory({ channel: 'database', name: 'connection' });

      logger1.info('First logger message');
      logger2.error('Second logger message');

      expect(mockReporter).toHaveBeenCalledTimes(2);

      expect(mockReporter).toHaveBeenNthCalledWith(
        1,
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

      expect(mockReporter).toHaveBeenNthCalledWith(
        2,
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

    test('should use custom reporters', () => {
      const mockReporter1 = vi.fn();
      const mockReporter2 = vi.fn();

      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter1, mockReporter2],
      });

      const logger = loggerFactory({ channel: 'test', name: 'multi-reporter' });
      logger.info('Multi-reporter test');

      expect(mockReporter1).toHaveBeenCalledTimes(1);
      expect(mockReporter2).toHaveBeenCalledTimes(1);

      const expectedLogEntry = expect.objectContaining({
        level: 'info',
        channel: 'test',
        name: 'multi-reporter',
        message: 'Multi-reporter test',
      });

      expect(mockReporter1).toHaveBeenCalledWith(expectedLogEntry);
      expect(mockReporter2).toHaveBeenCalledWith(expectedLogEntry);
    });

    test('should handle empty reporters array', () => {
      const loggerFactory = createKoriLoggerFactory({ reporters: [] });
      const logger = loggerFactory({ channel: 'test', name: 'no-reporters' });

      // Should not throw when no reporters are configured
      expect(() => {
        logger.info('Message with no reporters');
      }).not.toThrow();
    });
  });
});
