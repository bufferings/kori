import { describe, expect, test, vi, beforeEach } from 'vitest';

import { createKoriLoggerFactory, type KoriLoggerFactory } from '../../src/logging/logger-factory.js';
import {
  createInstanceLogger,
  createPluginLogger,
  createRequestLogger,
  createSystemLogger,
} from '../../src/logging/logger-helpers.js';

describe('logger helpers', () => {
  let mockReporter: ReturnType<typeof vi.fn>;
  let loggerFactory: KoriLoggerFactory;

  beforeEach(() => {
    mockReporter = vi.fn();
    loggerFactory = createKoriLoggerFactory({
      level: 'warn', // Only warn, error, fatal levels enabled
      reporters: [mockReporter],
    });
  });

  describe('standard logger creation', () => {
    test('should create instance logger with correct channel and name', () => {
      const instanceLogger = createInstanceLogger(loggerFactory);
      instanceLogger.warn('Server warning');

      expect(mockReporter).toHaveBeenCalledWith(
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

      expect(mockReporter).toHaveBeenCalledWith(
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

      expect(mockReporter).toHaveBeenCalledTimes(2);
      expect(mockReporter).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          level: 'warn',
          channel: 'app',
          name: 'instance',
          message: 'Warning message',
        }),
      );
      expect(mockReporter).toHaveBeenNthCalledWith(
        2,
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
      const sysLogger = createSystemLogger({ baseLogger });
      sysLogger.warn('Internal framework warning');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'sys',
          name: 'server',
          message: 'Internal framework warning',
        }),
      );
    });

    test('should create plugin logger with namespaced channel', () => {
      const baseLogger = loggerFactory({ channel: 'app', name: 'request' });
      const pluginLogger = createPluginLogger({
        baseLogger,
        pluginName: 'cors',
      });

      pluginLogger.warn('CORS headers warning');

      expect(mockReporter).toHaveBeenCalledWith(
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

      const sysLogger = createSystemLogger({ baseLogger });
      sysLogger.warn('System diagnostic');

      expect(mockReporter).toHaveBeenCalledWith(
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

      const pluginLogger = createPluginLogger({
        baseLogger,
        pluginName: 'auth',
      });
      pluginLogger.warn('Authentication check');

      expect(mockReporter).toHaveBeenCalledWith(
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
