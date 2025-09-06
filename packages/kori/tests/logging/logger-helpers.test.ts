import { describe, expect, test, vi, beforeEach } from 'vitest';

import { type KoriLogEntry } from '../../src/logging/log-entry.js';
import { createKoriLoggerFactory, type KoriLoggerFactory } from '../../src/logging/logger-factory.js';
import {
  createInstanceLogger,
  createKoriPluginLogger,
  createRequestLogger,
  createKoriSystemLogger,
} from '../../src/logging/logger-helpers.js';

describe('logger helpers', () => {
  let mockWriteFn: ReturnType<typeof vi.fn>;
  let loggerFactory: KoriLoggerFactory;

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
    loggerFactory = createKoriLoggerFactory({
      level: 'warn', // Only warn, error, fatal levels enabled
      reporter: mockReporter,
    });
  });

  describe('standard logger creation', () => {
    test('should create instance logger with correct channel and name', () => {
      const instanceLogger = createInstanceLogger(loggerFactory);
      instanceLogger.warn('Server warning');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string
        expect.objectContaining({
          channel: 'app',
          name: 'instance',
          message: 'Server warning',
        }),
      );
    });

    test('should create request logger with correct channel and name', () => {
      const requestLogger = createRequestLogger(loggerFactory);
      requestLogger.warn('Request warning');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          channel: 'app',
          name: 'request',
          message: 'Request warning',
        }),
      );
    });

    test('should respect factory log level configuration', () => {
      const instanceLogger = createInstanceLogger(loggerFactory);
      const requestLogger = createRequestLogger(loggerFactory);

      // These should NOT be logged (below warn level)
      instanceLogger.info('Info message');
      requestLogger.debug('Debug message');

      // These SHOULD be logged (warn level and above)
      instanceLogger.warn('Warning message');
      requestLogger.error('Error message');

      expect(mockWriteFn).toHaveBeenCalledTimes(2);
      expect(mockWriteFn).toHaveBeenNthCalledWith(
        1,
        expect.any(String), // formatted string
        expect.objectContaining({
          level: 'warn',
          channel: 'app',
          name: 'instance',
          message: 'Warning message',
        }),
      );
      expect(mockWriteFn).toHaveBeenNthCalledWith(
        2,
        expect.any(String), // formatted string
        expect.objectContaining({
          level: 'error',
          channel: 'app',
          name: 'request',
          message: 'Error message',
        }),
      );
    });
  });

  describe('specialized logger creation', () => {
    test('should create system logger with sys channel', () => {
      const baseLogger = loggerFactory({ channel: 'app', name: 'server' });
      const sysLogger = createKoriSystemLogger({ baseLogger });
      sysLogger.warn('Internal framework warning');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          channel: 'sys',
          name: 'server',
          message: 'Internal framework warning',
        }),
      );
    });

    test('should create plugin logger with namespaced channel', () => {
      const baseLogger = loggerFactory({ channel: 'app', name: 'request' });
      const pluginLogger = createKoriPluginLogger({
        baseLogger,
        pluginName: 'cors',
      });

      pluginLogger.warn('CORS headers warning');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          channel: 'plugin.cors',
          name: 'request',
          message: 'CORS headers warning',
        }),
      );
    });
  });

  describe('logger inheritance', () => {
    test('should preserve bindings when creating sys logger', () => {
      const baseLogger = loggerFactory({ channel: 'app', name: 'server' });
      baseLogger.addBindings({ version: '1.0.0', environment: 'production' });

      const sysLogger = createKoriSystemLogger({ baseLogger });
      sysLogger.warn('System diagnostic');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          channel: 'sys',
          meta: expect.objectContaining({
            version: '1.0.0',
            environment: 'production',
          }),
        }),
      );
    });

    test('should preserve bindings when creating plugin logger', () => {
      const baseLogger = loggerFactory({ channel: 'app', name: 'request' });
      baseLogger.addBindings({ requestId: 'req-456', userId: 'user-789' });

      const pluginLogger = createKoriPluginLogger({
        baseLogger,
        pluginName: 'auth',
      });
      pluginLogger.warn('Authentication check');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          channel: 'plugin.auth',
          meta: expect.objectContaining({
            requestId: 'req-456',
            userId: 'user-789',
          }),
        }),
      );
    });
  });
});
