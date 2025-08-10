import { describe, expect, test, vi } from 'vitest';

import { createKoriLoggerFactory } from '../../src/logging/logger-factory.js';
import {
  createInstanceLogger,
  createPluginLogger,
  createRequestLogger,
  createSystemLogger,
} from '../../src/logging/logger-helpers.js';

describe('logger helpers', () => {
  describe('standard logger creation', () => {
    test('should create instance logger with correct channel and name', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const instanceLogger = createInstanceLogger(loggerFactory);
      instanceLogger.info('Server starting');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'app',
          name: 'instance',
          message: 'Server starting',
        }),
      );
    });

    test('should create request logger with correct channel and name', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const requestLogger = createRequestLogger(loggerFactory);
      requestLogger.info('Processing HTTP request');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'app',
          name: 'request',
          message: 'Processing HTTP request',
        }),
      );
    });
  });

  describe('specialized logger creation', () => {
    test('should create system logger with sys channel', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'debug',
        reporters: [mockReporter],
      });

      const baseLogger = loggerFactory({ channel: 'app', name: 'server' });
      const sysLogger = createSystemLogger({ logger: baseLogger });

      sysLogger.debug('Internal framework debug');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'sys',
          name: 'server',
          message: 'Internal framework debug',
        }),
      );
    });

    test('should create plugin logger with namespaced channel', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const baseLogger = loggerFactory({ channel: 'app', name: 'request' });
      const pluginLogger = createPluginLogger({
        logger: baseLogger,
        pluginName: 'cors',
      });

      pluginLogger.info('CORS headers added');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'plugin.cors',
          name: 'request',
          message: 'CORS headers added',
        }),
      );
    });

    test('should handle plugin names with special characters', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const baseLogger = loggerFactory({ channel: 'app', name: 'request' });
      const pluginLogger = createPluginLogger({
        logger: baseLogger,
        pluginName: 'zod-validation',
      });

      pluginLogger.info('Schema validation passed');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'plugin.zod-validation',
          name: 'request',
          message: 'Schema validation passed',
        }),
      );
    });
  });

  describe('logger inheritance', () => {
    test('should preserve bindings when creating sys logger', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const baseLogger = loggerFactory({ channel: 'app', name: 'server' });
      baseLogger.addBindings({ version: '1.0.0', environment: 'production' });

      const sysLogger = createSystemLogger({ logger: baseLogger });
      sysLogger.info('System diagnostic');

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
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const baseLogger = loggerFactory({ channel: 'app', name: 'request' });
      baseLogger.addBindings({ requestId: 'req-456', userId: 'user-789' });

      const pluginLogger = createPluginLogger({
        logger: baseLogger,
        pluginName: 'auth',
      });
      pluginLogger.info('Authentication check');

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
