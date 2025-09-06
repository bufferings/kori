import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import { serializeError } from '../../src/logging/error-serializer.js';
import { type KoriLogEntry } from '../../src/logging/log-entry.js';
import { createKoriLogger, type KoriLogger } from '../../src/logging/logger.js';

describe('KoriLogger meta handling', () => {
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

  describe('bindings behavior', () => {
    test('should include initial bindings in log entries', () => {
      const mockReporter = {
        sinks: [
          {
            formatter: (entry: KoriLogEntry) => JSON.stringify(entry),
            write: mockWriteFn,
          },
        ],
      };
      const loggerWithBindings = createKoriLogger({
        channel: 'test',
        name: 'logger',
        level: 'info',
        bindings: { service: 'auth', version: '1.0.0' },
        reporter: mockReporter,
        errorSerializer: serializeError,
      });

      loggerWithBindings.info('Service started');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          meta: { service: 'auth', version: '1.0.0' },
        }),
      );
    });

    test('should add bindings with addBindings method', () => {
      logger.addBindings({ userId: 'user-123' });
      logger.info('User action');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          meta: { userId: 'user-123' },
        }),
      );
    });

    test('should accumulate bindings across multiple addBindings calls', () => {
      logger.addBindings({ userId: 'user-123' });
      logger.addBindings({ sessionId: 'sess-456' });
      logger.info('User action');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          meta: { userId: 'user-123', sessionId: 'sess-456' },
        }),
      );
    });

    test('should return same logger instance for method chaining', () => {
      const result = logger.addBindings({ test: 'value' });
      expect(result).toBe(logger);
    });

    test('should override bindings with same key', () => {
      logger.addBindings({ env: 'dev' });
      logger.addBindings({ env: 'prod' });
      logger.info('Environment test');

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          meta: { env: 'prod' },
        }),
      );
    });
  });

  describe('meta integration', () => {
    test('should merge bindings and meta with meta taking precedence', () => {
      logger.addBindings({ userId: 'from-bindings', shared: 'binding-value' });
      logger.info('Test message', { userId: 'from-meta', action: 'login' });

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          meta: {
            userId: 'from-meta', // meta overrides bindings
            shared: 'binding-value', // from bindings
            action: 'login', // from meta
          },
        }),
      );
    });

    test('should handle meta factory function', () => {
      const metaFactory = vi.fn(() => ({ computed: 'value' }));
      logger.info('Factory test', metaFactory);

      expect(metaFactory).toHaveBeenCalledTimes(1);
      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          meta: { computed: 'value' },
        }),
      );
    });

    test('should handle meta factory returning undefined', () => {
      const metaFactory = vi.fn(() => undefined);
      logger.info('Undefined factory test', metaFactory);

      expect(metaFactory).toHaveBeenCalledTimes(1);
      const logEntry = mockWriteFn.mock.calls[0]?.[1]; // Second argument is the entry
      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Undefined factory test',
        }),
      );
      expect(logEntry).not.toHaveProperty('meta');
    });

    test('should combine bindings with meta factory result', () => {
      logger.addBindings({ service: 'auth' });
      const metaFactory = () => ({ operation: 'login' });
      logger.info('Combined test', metaFactory);

      expect(mockWriteFn).toHaveBeenCalledWith(
        expect.any(String), // formatted string,
        expect.objectContaining({
          meta: { service: 'auth', operation: 'login' },
        }),
      );
    });
  });

  describe('lazy evaluation', () => {
    test('should not execute factory when log level is disabled', () => {
      const expensiveFactory = vi.fn(() => ({ expensive: 'data' }));

      // Should execute factory when level is enabled
      logger.info('Test message', expensiveFactory);
      expect(expensiveFactory).toHaveBeenCalledTimes(1);

      expensiveFactory.mockClear();
      mockWriteFn.mockClear();

      // Should NOT execute factory when level is disabled
      logger.debug('Debug message', expensiveFactory);
      expect(expensiveFactory).not.toHaveBeenCalled();
      expect(mockWriteFn).not.toHaveBeenCalled();
    });
  });
});
