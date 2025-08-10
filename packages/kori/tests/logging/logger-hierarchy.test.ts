import { describe, expect, test, vi } from 'vitest';

import { createKoriLoggerFactory } from '../../src/logging/logger-factory.js';

describe('Logger Hierarchy', () => {
  describe('child logger creation', () => {
    test('should create child logger with hierarchical name', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const parentLogger = loggerFactory({ channel: 'app', name: 'server' });
      const childLogger = parentLogger.child({ name: 'auth' });

      childLogger.info('Authentication started');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'app',
          name: 'server.auth',
          message: 'Authentication started',
        }),
      );
    });

    test('should create child logger with custom channel', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const parentLogger = loggerFactory({ channel: 'app', name: 'server' });
      const childLogger = parentLogger.child({
        name: 'db',
        channelName: 'database',
      });

      childLogger.info('Database connection opened');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'database',
          name: 'server.db',
          message: 'Database connection opened',
        }),
      );
    });

    test('should inherit parent bindings in child logger', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const parentLogger = loggerFactory({ channel: 'app', name: 'server' });
      parentLogger.addBindings({ service: 'api', version: '1.0.0' });

      const childLogger = parentLogger.child({ name: 'auth' });
      childLogger.info('Child log message');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            service: 'api',
            version: '1.0.0',
          }),
        }),
      );
    });

    test('should merge child bindings with parent bindings', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const parentLogger = loggerFactory({ channel: 'app', name: 'server' });
      parentLogger.addBindings({ service: 'api', version: '1.0.0' });

      const childLogger = parentLogger.child({
        name: 'auth',
        bindings: { component: 'oauth', method: 'jwt' },
      });
      childLogger.info('Authentication with bindings');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            service: 'api',
            version: '1.0.0',
            component: 'oauth',
            method: 'jwt',
          }),
        }),
      );
    });

    test('should handle nested child loggers', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const parentLogger = loggerFactory({ channel: 'app', name: 'server' });
      const childLogger = parentLogger.child({ name: 'auth' });
      const grandChildLogger = childLogger.child({ name: 'jwt' });

      grandChildLogger.info('JWT token validated');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'app',
          name: 'server.auth.jwt',
          message: 'JWT token validated',
        }),
      );
    });
  });

  describe('channel switching', () => {
    test('should create logger with different channel', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const appLogger = loggerFactory({ channel: 'app', name: 'server' });
      const sysLogger = appLogger.channel('sys');

      sysLogger.info('System message');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'sys',
          name: 'server',
          message: 'System message',
        }),
      );
    });

    test('should preserve bindings when switching channels', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const appLogger = loggerFactory({ channel: 'app', name: 'server' });
      appLogger.addBindings({ instance: 'prod-01', region: 'us-east-1' });

      const sysLogger = appLogger.channel('sys');
      sysLogger.info('System event');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'sys',
          meta: expect.objectContaining({
            instance: 'prod-01',
            region: 'us-east-1',
          }),
        }),
      );
    });
  });

  describe('bindings management', () => {
    test('should add bindings to logger', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const logger = loggerFactory({ channel: 'app', name: 'server' });
      logger.addBindings({ requestId: 'req-123', userId: 'user-456' });

      logger.info('Request processed');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'req-123',
            userId: 'user-456',
          }),
        }),
      );
    });

    test('should merge multiple addBindings calls', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const logger = loggerFactory({ channel: 'app', name: 'server' });
      logger.addBindings({ requestId: 'req-123' });
      logger.addBindings({ userId: 'user-456', action: 'login' });

      logger.info('Multiple bindings test');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'req-123',
            userId: 'user-456',
            action: 'login',
          }),
        }),
      );
    });

    test('should allow binding overwrites', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const logger = loggerFactory({ channel: 'app', name: 'server' });
      logger.addBindings({ status: 'pending', userId: 'user-123' });
      logger.addBindings({ status: 'completed' }); // Overwrite status

      logger.info('Status updated');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            status: 'completed',
            userId: 'user-123',
          }),
        }),
      );
    });

    test('should return self for method chaining', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const logger = loggerFactory({ channel: 'app', name: 'server' });
      const result = logger.addBindings({ test: 'value' });

      expect(result).toBe(logger);
    });
  });

  describe('bindings and metadata interaction', () => {
    test('should merge bindings with log metadata', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const logger = loggerFactory({ channel: 'app', name: 'server' });
      logger.addBindings({ requestId: 'req-123', service: 'api' });

      logger.info('Processing request', { action: 'validate', duration: 150 });

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: {
            requestId: 'req-123',
            service: 'api',
            action: 'validate',
            duration: 150,
          },
        }),
      );
    });

    test('should prioritize log metadata over bindings', () => {
      const mockReporter = vi.fn();
      const loggerFactory = createKoriLoggerFactory({
        level: 'info',
        reporters: [mockReporter],
      });

      const logger = loggerFactory({ channel: 'app', name: 'server' });
      logger.addBindings({ status: 'pending', requestId: 'req-123' });

      logger.info('Request completed', { status: 'success' });

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: {
            requestId: 'req-123',
            status: 'success', // Metadata overwrites binding
          },
        }),
      );
    });
  });
});
