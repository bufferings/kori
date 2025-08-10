/* eslint-disable no-console */
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import { createConsoleReporter } from '../../src/logging/console-reporter.js';
import { type KoriLogEntry } from '../../src/logging/log-entry.js';

describe('createConsoleReporter', () => {
  let originalConsoleLog: typeof console.log;
  let mockConsoleLog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalConsoleLog = console.log;
    mockConsoleLog = vi.fn();
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('basic functionality', () => {
    test('should output log entry as JSON string', () => {
      const reporter = createConsoleReporter();
      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'info',
        channel: 'app',
        name: 'server',
        message: 'Test message',
        meta: { userId: 'user-123' },
      };

      reporter(logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(logEntry));
    });

    test('should handle log entry without meta', () => {
      const reporter = createConsoleReporter();
      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'error',
        channel: 'sys',
        name: 'database',
        message: 'Connection failed',
      };

      reporter(logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(logEntry));
    });

    test('should handle empty meta object', () => {
      const reporter = createConsoleReporter();
      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'warn',
        channel: 'app',
        name: 'request',
        message: 'Slow response',
        meta: {},
      };

      reporter(logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(logEntry));
    });
  });

  describe('filtering functionality', () => {
    test('should apply filter function when provided', () => {
      const errorOnlyFilter = (entry: KoriLogEntry) => entry.level === 'error' || entry.level === 'fatal';
      const reporter = createConsoleReporter(errorOnlyFilter);

      const infoEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'info',
        channel: 'app',
        name: 'server',
        message: 'Info message',
      };

      const errorEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'error',
        channel: 'app',
        name: 'server',
        message: 'Error message',
      };

      reporter(infoEntry);
      expect(mockConsoleLog).not.toHaveBeenCalled();

      reporter(errorEntry);
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(errorEntry));
    });

    test('should support channel-based filtering', () => {
      const sysChannelFilter = (entry: KoriLogEntry) => entry.channel === 'sys';
      const reporter = createConsoleReporter(sysChannelFilter);

      const appEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'info',
        channel: 'app',
        name: 'server',
        message: 'App message',
      };

      const sysEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'debug',
        channel: 'sys',
        name: 'internal',
        message: 'System message',
      };

      reporter(appEntry);
      expect(mockConsoleLog).not.toHaveBeenCalled();

      reporter(sysEntry);
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(sysEntry));
    });

    test('should support complex filtering logic', () => {
      const complexFilter = (entry: KoriLogEntry) => entry.level === 'error' && entry.channel.startsWith('plugin');
      const reporter = createConsoleReporter(complexFilter);

      const entries: KoriLogEntry[] = [
        {
          time: 1640995200000,
          level: 'error',
          channel: 'app',
          name: 'server',
          message: 'App error',
        },
        {
          time: 1640995200000,
          level: 'info',
          channel: 'plugin.cors',
          name: 'request',
          message: 'Plugin info',
        },
        {
          time: 1640995200000,
          level: 'error',
          channel: 'plugin.auth',
          name: 'request',
          message: 'Plugin error',
        },
      ];

      entries.forEach((entry) => reporter(entry));

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(entries[2]));
    });
  });

  describe('serialization error handling', () => {
    test('should use fallback format for circular references', () => {
      const reporter = createConsoleReporter();

      // Create circular reference
      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular;

      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'info',
        channel: 'app',
        name: 'server',
        message: 'Circular reference test',
        meta: { circular },
      };

      reporter(logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const call = mockConsoleLog.mock.calls[0];
      expect(call?.[0]).toBe('[LOG] 1640995200000 INFO [app:server] Circular reference test');
      expect(call?.[1]).toEqual({
        serialization_error: expect.any(String),
        data: '[Object with serialization issues]',
      });
    });

    test('should handle JSON.stringify throwing other errors', () => {
      const reporter = createConsoleReporter();

      // Create object that throws during serialization
      const problematicObject = {
        toJSON() {
          throw new Error('Custom serialization error');
        },
      };

      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'warn',
        channel: 'sys',
        name: 'test',
        message: 'Serialization error test',
        meta: { problematic: problematicObject },
      };

      reporter(logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const call = mockConsoleLog.mock.calls[0];
      expect(call?.[0]).toBe('[LOG] 1640995200000 WARN [sys:test] Serialization error test');
      expect(call?.[1]).toEqual({
        serialization_error: 'Custom serialization error',
        data: '[Object with serialization issues]',
      });
    });

    test('should handle non-Error objects thrown during serialization', () => {
      const reporter = createConsoleReporter();

      // Mock JSON.stringify to throw a string
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn().mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'String error message';
      });

      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'fatal',
        channel: 'app',
        name: 'critical',
        message: 'Non-Error thrown',
      };

      reporter(logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const call = mockConsoleLog.mock.calls[0];
      expect(call?.[0]).toBe('[LOG] 1640995200000 FATAL [app:critical] Non-Error thrown');
      expect(call?.[1]).toEqual({
        serialization_error: 'String error message',
        data: '[Object with serialization issues]',
      });

      JSON.stringify = originalStringify;
    });
  });

  describe('edge cases', () => {
    test('should handle extremely large timestamps', () => {
      const reporter = createConsoleReporter();
      const logEntry: KoriLogEntry = {
        time: Number.MAX_SAFE_INTEGER,
        level: 'debug',
        channel: 'test',
        name: 'edge-case',
        message: 'Large timestamp test',
      };

      reporter(logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(logEntry));
    });

    test('should handle special characters in message', () => {
      const reporter = createConsoleReporter();
      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'info',
        channel: 'app',
        name: 'test',
        // eslint-disable-next-line kori/ascii-only-source
        message: 'Message with "quotes" and \nnewlines and 🎉 emoji',
        meta: { special: 'chars: \t\r\n"' },
      };

      reporter(logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(logEntry));
    });
  });
});
