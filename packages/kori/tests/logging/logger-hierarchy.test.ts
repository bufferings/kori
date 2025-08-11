import { describe, expect, test, vi, beforeEach } from 'vitest';

import { createKoriLoggerFactory, type KoriLoggerFactory } from '../../src/logging/logger-factory.js';

describe('Logger Hierarchy', () => {
  let mockReporter: ReturnType<typeof vi.fn>;
  let loggerFactory: KoriLoggerFactory;

  beforeEach(() => {
    mockReporter = vi.fn();
    loggerFactory = createKoriLoggerFactory({
      level: 'info',
      reporters: [mockReporter],
    });
  });

  describe('child logger creation', () => {
    test('should create child logger with hierarchical name', () => {
      const parentLogger = loggerFactory({ channel: 'app', name: 'server' });
      const childLogger = parentLogger.child({ name: 'auth' });

      parentLogger.info('Server started');
      childLogger.info('Authentication started');

      expect(mockReporter).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          channel: 'app',
          name: 'server',
          message: 'Server started',
        }),
      );
      expect(mockReporter).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          channel: 'app',
          name: 'server.auth',
          message: 'Authentication started',
        }),
      );
    });

    test('should create child logger with custom channel', () => {
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

    test('should create child logger with custom channel and bindings together', () => {
      const parentLogger = loggerFactory({ channel: 'app', name: 'server' });
      parentLogger.addBindings({ instance: 'prod-01', region: 'us-east-1' });

      const childLogger = parentLogger.child({
        name: 'auth',
        channelName: 'security',
        bindings: { module: 'jwt', version: '2.0' },
      });

      childLogger.info('Authentication with all features');

      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'security',
          name: 'server.auth',
          message: 'Authentication with all features',
          meta: {
            instance: 'prod-01', // from parent
            region: 'us-east-1', // from parent
            module: 'jwt', // from child
            version: '2.0', // from child
          },
        }),
      );
    });

    test('should not affect parent logger when creating child', () => {
      const parentLogger = loggerFactory({ channel: 'app', name: 'server' });
      parentLogger.addBindings({ service: 'api' });

      const childLogger = parentLogger.child({
        name: 'auth',
        channelName: 'security',
        bindings: { module: 'jwt' },
      });

      parentLogger.info('Parent message');
      childLogger.info('Child message');

      expect(mockReporter).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          channel: 'app',
          name: 'server',
          message: 'Parent message',
          meta: { service: 'api' }, // parent bindings only
        }),
      );
      expect(mockReporter).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          channel: 'security',
          name: 'server.auth',
          message: 'Child message',
          meta: {
            service: 'api', // inherited from parent
            module: 'jwt', // child binding
          },
        }),
      );
    });

    test('should create independent child loggers', () => {
      const parentLogger = loggerFactory({ channel: 'app', name: 'server' });

      const authLogger = parentLogger.child({
        name: 'auth',
        bindings: { module: 'oauth' },
      });

      const dbLogger = parentLogger.child({
        name: 'db',
        channelName: 'database',
        bindings: { driver: 'postgres' },
      });

      authLogger.info('Auth operation');
      dbLogger.info('Database operation');

      expect(mockReporter).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          channel: 'app',
          name: 'server.auth',
          message: 'Auth operation',
          meta: { module: 'oauth' },
        }),
      );
      expect(mockReporter).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          channel: 'database',
          name: 'server.db',
          message: 'Database operation',
          meta: { driver: 'postgres' },
        }),
      );
    });
  });

  describe('channel switching', () => {
    test('should create logger with different channel', () => {
      const appLogger = loggerFactory({ channel: 'app', name: 'server' });
      const sysLogger = appLogger.channel('sys');

      appLogger.info('App message');
      sysLogger.info('System message');

      expect(mockReporter).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          channel: 'app',
          name: 'server',
          message: 'App message',
        }),
      );
      expect(mockReporter).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          channel: 'sys',
          name: 'server',
          message: 'System message',
        }),
      );
    });

    test('should preserve bindings when switching channels', () => {
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
});
