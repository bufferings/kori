import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import { KoriConsoleReporterPresets } from '../../src/logging/console-reporter-presets.js';
import { type KoriLogEntry } from '../../src/logging/log-entry.js';

describe('KoriConsoleReporterPresets', () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('json preset', () => {
    test('should output info logs to console.log as JSON', () => {
      const reporter = KoriConsoleReporterPresets.json();
      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'info',
        channel: 'app',
        name: 'server',
        message: 'Test message',
        meta: { userId: 'user-123' },
      };

      reporter.sinks[0]?.formatter(logEntry);
      void reporter.sinks[0]?.write(reporter.sinks[0].formatter(logEntry), logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const output = mockConsoleLog.mock.calls[0]?.[0];
      expect(output).toContain('"message":"Test message"');
      expect(output).toContain('"level":"info"');
    });

    test('should output error logs to console.error as JSON', () => {
      const reporter = KoriConsoleReporterPresets.json();
      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'error',
        channel: 'app',
        name: 'server',
        message: 'Error message',
      };

      void reporter.sinks[0]?.write(reporter.sinks[0]?.formatter(logEntry), logEntry);

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const output = mockConsoleError.mock.calls[0]?.[0];
      expect(output).toContain('"message":"Error message"');
      expect(output).toContain('"level":"error"');
    });

    test('should apply custom filter correctly', () => {
      const reporter = KoriConsoleReporterPresets.json({
        filter: (entry) => entry.channel === 'app',
      });

      const appEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'info',
        channel: 'app',
        name: 'handler',
        message: 'Should pass through',
      };

      const sysEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'error',
        channel: 'sys',
        name: 'core',
        message: 'Should be filtered out',
      };

      // Test actual filter behavior
      expect(reporter.filter?.(appEntry)).toBe(true);
      expect(reporter.filter?.(sysEntry)).toBe(false);
    });
  });

  describe('pretty preset', () => {
    test('should output human-readable format with colors enabled by default', () => {
      const reporter = KoriConsoleReporterPresets.pretty();
      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'info',
        channel: 'app',
        name: 'server',
        message: 'Pretty test',
      };

      void reporter.sinks[0]?.write(reporter.sinks[0]?.formatter(logEntry), logEntry);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const output = mockConsoleLog.mock.calls[0]?.[0];
      expect(output).toContain('Pretty test');
      expect(output).toContain('[app:server]');
      expect(output).toContain('INFO ');
    });

    test('should support colorize option with actual color output differences', () => {
      const colorizedReporter = KoriConsoleReporterPresets.pretty({ colorize: true });
      const nonColorizedReporter = KoriConsoleReporterPresets.pretty({ colorize: false });

      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'warn',
        channel: 'app',
        name: 'test',
        message: 'Warning message',
      };

      const colorizedOutput = colorizedReporter.sinks[0]?.formatter(logEntry);
      const nonColorizedOutput = nonColorizedReporter.sinks[0]?.formatter(logEntry);

      // Colorized should contain ANSI escape codes
      expect(colorizedOutput).toContain('\x1b[33m'); // Yellow for warn
      expect(colorizedOutput).toContain('\x1b[0m'); // Reset

      // Non-colorized should not contain ANSI codes
      expect(nonColorizedOutput).not.toContain('\x1b[');

      // Both should contain the same basic content
      expect(colorizedOutput).toContain('WARN ');
      expect(nonColorizedOutput).toContain('WARN ');
      expect(colorizedOutput).toContain('[app:test]');
      expect(nonColorizedOutput).toContain('[app:test]');
    });

    test('should output error logs to console.error', () => {
      const reporter = KoriConsoleReporterPresets.pretty();
      const logEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'fatal',
        channel: 'sys',
        name: 'core',
        message: 'Fatal error',
      };

      void reporter.sinks[0]?.write(reporter.sinks[0]?.formatter(logEntry), logEntry);

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const output = mockConsoleError.mock.calls[0]?.[0];
      expect(output).toContain('Fatal error');
      expect(output).toContain('[sys:core]');
    });

    test('should apply custom filter correctly', () => {
      const reporter = KoriConsoleReporterPresets.pretty({
        filter: (entry) => entry.channel === 'app',
      });

      const appEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'info',
        channel: 'app',
        name: 'handler',
        message: 'Should pass through',
      };

      const sysEntry: KoriLogEntry = {
        time: 1640995200000,
        level: 'error',
        channel: 'sys',
        name: 'core',
        message: 'Should be filtered out',
      };

      // Test actual filter behavior
      expect(reporter.filter?.(appEntry)).toBe(true);
      expect(reporter.filter?.(sysEntry)).toBe(false);
    });
  });

  describe('silent preset', () => {
    test('should not output anything to console', () => {
      const reporter = KoriConsoleReporterPresets.silent();

      // Silent preset should produce no console output
      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();

      // Contract: silent reporter has no sinks to execute
      expect(reporter.sinks).toHaveLength(0);
    });
  });
});
