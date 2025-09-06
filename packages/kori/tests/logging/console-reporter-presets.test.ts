import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import {
  jsonConsoleReporter,
  prettyConsoleReporter,
  silentConsoleReporter,
  KoriConsoleReporterPresets,
} from '../../src/logging/console-reporter-presets.js';
import { type KoriLogEntry } from '../../src/logging/log-entry.js';

let mockConsoleLog: ReturnType<typeof vi.spyOn>;
let mockConsoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('jsonConsoleReporter', () => {
  test('should output info logs to console.log as JSON', () => {
    const reporter = jsonConsoleReporter();
    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'info',
      channel: 'app',
      name: 'server',
      message: 'Test message',
      meta: { userId: 'user-123' },
    };

    void reporter.sinks[0]?.write(reporter.sinks[0]?.formatter(logEntry), logEntry);

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const output = mockConsoleLog.mock.calls[0]?.[0];
    expect(output).toContain('"message":"Test message"');
    expect(output).toContain('"level":"info"');
  });

  test('should output error logs to console.error as JSON', () => {
    const reporter = jsonConsoleReporter();
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
    const reporter = jsonConsoleReporter({
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

    expect(reporter.filter?.(appEntry)).toBe(true);
    expect(reporter.filter?.(sysEntry)).toBe(false);
  });
});

describe('prettyConsoleReporter', () => {
  test('should output human-readable format with colors enabled by default', () => {
    const reporter = prettyConsoleReporter();
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
    const colorizedReporter = prettyConsoleReporter({ colorize: true });
    const nonColorizedReporter = prettyConsoleReporter({ colorize: false });

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
    const reporter = prettyConsoleReporter();
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
    const reporter = prettyConsoleReporter({
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

    expect(reporter.filter?.(appEntry)).toBe(true);
    expect(reporter.filter?.(sysEntry)).toBe(false);
  });
});

describe('silentConsoleReporter', () => {
  test('should not output anything to console', () => {
    const reporter = silentConsoleReporter();

    // Contract: silent reporter has no sinks to execute
    expect(reporter.sinks).toHaveLength(0);
  });
});

describe('KoriConsoleReporterPresets', () => {
  test('should reference the correct reporter functions', () => {
    expect(KoriConsoleReporterPresets.json).toBe(jsonConsoleReporter);
    expect(KoriConsoleReporterPresets.pretty).toBe(prettyConsoleReporter);
    expect(KoriConsoleReporterPresets.silent).toBe(silentConsoleReporter);
  });
});
