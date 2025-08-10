/* eslint-disable no-console */
import { describe, expect, test, vi } from 'vitest';

import { type KoriLogReporter } from '../../src/logging/log-reporter.js';
import { createKoriLoggerFactory } from '../../src/logging/logger-factory.js';

describe('createKoriLoggerFactory', () => {
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
      // Mock console.log to capture output
      const originalConsoleLog = console.log;
      const mockConsoleLog = vi.fn();
      console.log = mockConsoleLog;

      const loggerFactory = createKoriLoggerFactory();
      const logger = loggerFactory({ channel: 'test', name: 'console' });

      logger.info('Default reporter test');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const logOutput = mockConsoleLog.mock.calls[0]?.[0];
      expect(logOutput).toContain('"message":"Default reporter test"');

      console.log = originalConsoleLog;
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
  });

  describe('logger independence', () => {
    test('should create independent loggers', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const logger1 = loggerFactory({ channel: 'app', name: 'service1' });
      const logger2 = loggerFactory({ channel: 'app', name: 'service2' });

      logger1.addBindings({ userId: 'user-123' });
      logger2.addBindings({ sessionId: 'session-456' });

      logger1.info('Logger 1 message');
      logger2.info('Logger 2 message');

      expect(mockReporter).toHaveBeenCalledTimes(2);

      expect(mockReporter).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          name: 'service1',
          meta: expect.objectContaining({ userId: 'user-123' }),
        }),
      );

      expect(mockReporter).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: 'service2',
          meta: expect.objectContaining({ sessionId: 'session-456' }),
        }),
      );

      // Ensure logger1 doesn't have logger2's bindings
      const logger1Call = mockReporter.mock.calls[0]?.[0];
      expect(logger1Call?.meta).not.toHaveProperty('sessionId');

      // Ensure logger2 doesn't have logger1's bindings
      const logger2Call = mockReporter.mock.calls[1]?.[0];
      expect(logger2Call?.meta).not.toHaveProperty('userId');
    });

    test('should maintain separate binding state per logger', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        bindings: { global: 'value' },
        reporters: [mockReporter],
      });

      const logger1 = loggerFactory({ channel: 'test', name: 'logger1' });
      const logger2 = loggerFactory({ channel: 'test', name: 'logger2' });

      logger1.addBindings({ specific: 'logger1-value' });

      logger1.info('Logger 1 test');
      logger2.info('Logger 2 test');

      expect(mockReporter).toHaveBeenCalledTimes(2);

      expect(mockReporter).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          meta: { global: 'value', specific: 'logger1-value' },
        }),
      );

      expect(mockReporter).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          meta: { global: 'value' },
        }),
      );
    });
  });

  describe('reporter error handling', () => {
    test('should handle reporter exceptions gracefully', () => {
      const failingReporter: KoriLogReporter = () => {
        throw new Error('Reporter failed');
      };
      const workingReporter = vi.fn();

      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [failingReporter, workingReporter],
      });

      const logger = loggerFactory({ channel: 'test', name: 'error-handling' });

      // Should not throw despite failing reporter
      expect(() => {
        logger.info('Test with failing reporter');
      }).not.toThrow();

      // Working reporter should still be called
      expect(workingReporter).toHaveBeenCalledTimes(1);
    });

    test('should continue with remaining reporters after one fails', () => {
      const reporter1 = vi.fn();
      const failingReporter: KoriLogReporter = () => {
        throw new Error('Middle reporter failed');
      };
      const reporter3 = vi.fn();

      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [reporter1, failingReporter, reporter3],
      });

      const logger = loggerFactory({ channel: 'test', name: 'partial-failure' });
      logger.info('Test message');

      expect(reporter1).toHaveBeenCalledTimes(1);
      expect(reporter3).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    test('should handle empty reporters array', () => {
      const loggerFactory = createKoriLoggerFactory({ reporters: [] });
      const logger = loggerFactory({ channel: 'test', name: 'no-reporters' });

      // Should not throw when no reporters are configured
      expect(() => {
        logger.info('Message with no reporters');
      }).not.toThrow();
    });

    test('should handle extreme log levels', () => {
      const debugFactory = createKoriLoggerFactory({ level: 'debug' });
      const fatalFactory = createKoriLoggerFactory({ level: 'fatal' });

      const debugLogger = debugFactory({ channel: 'test', name: 'debug' });
      const fatalLogger = fatalFactory({ channel: 'test', name: 'fatal' });

      // Debug level logger should enable all levels
      expect(debugLogger.isLevelEnabled('debug')).toBe(true);
      expect(debugLogger.isLevelEnabled('fatal')).toBe(true);

      // Fatal level logger should only enable fatal
      expect(fatalLogger.isLevelEnabled('debug')).toBe(false);
      expect(fatalLogger.isLevelEnabled('error')).toBe(false);
      expect(fatalLogger.isLevelEnabled('fatal')).toBe(true);
    });
  });
});
