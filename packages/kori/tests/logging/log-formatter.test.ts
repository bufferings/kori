import { describe, expect, test } from 'vitest';

import { type KoriLogEntry, type KoriLogLevel } from '../../src/logging/log-entry.js';
import { createJsonFormatter, createPrettyFormatter } from '../../src/logging/log-formatter.js';

describe('createJsonFormatter', () => {
  test('should format log entry as JSON string', () => {
    const formatter = createJsonFormatter();
    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'info',
      channel: 'app',
      name: 'server',
      message: 'Test message',
      meta: { userId: 'user-123', requestId: 'req-456' },
    };

    const result = formatter(logEntry);

    expect(result).toBe(JSON.stringify(logEntry));
    expect(JSON.parse(result)).toEqual(logEntry);
  });

  test('should format log entry without meta property', () => {
    const formatter = createJsonFormatter();
    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'error',
      channel: 'sys',
      name: 'database',
      message: 'Connection failed',
    };

    const result = formatter(logEntry);

    expect(result).toBe(JSON.stringify(logEntry));
    expect(JSON.parse(result)).toEqual(logEntry);
  });

  test('should handle serialization errors with fallback', () => {
    const formatter = createJsonFormatter();

    // Create circular reference
    const circularMeta: any = { name: 'circular' };
    circularMeta.self = circularMeta;

    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'warn',
      channel: 'app',
      name: 'handler',
      message: 'Circular reference test',
      meta: circularMeta,
    };

    const result = formatter(logEntry);
    const parsed = JSON.parse(result);

    // Should contain essential fields
    expect(parsed).toEqual({
      time: 1640995200000,
      level: 'warn',
      channel: 'app',
      name: 'handler',
      message: 'Circular reference test',
      meta: {
        __serialization_error: expect.any(String),
      },
    });

    // Should indicate serialization error
    expect(parsed.meta.__serialization_error).toContain('Converting circular structure to JSON');
  });

  test('should handle meta with non-serializable values', () => {
    const formatter = createJsonFormatter();
    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'debug',
      channel: 'plugin',
      name: 'auth',
      message: 'Non-serializable test',
      meta: {
        func: () => 'test', // Functions are not JSON serializable
        symbol: Symbol('test'), // Symbols are not JSON serializable
      },
    };

    const result = formatter(logEntry);
    const parsed = JSON.parse(result);

    // Non-serializable values are simply omitted by JSON.stringify
    expect(parsed).toEqual({
      time: 1640995200000,
      level: 'debug',
      channel: 'plugin',
      name: 'auth',
      message: 'Non-serializable test',
      meta: {}, // Functions and symbols are omitted
    });
  });
});

describe('createPrettyFormatter', () => {
  test('should format with default options', () => {
    const formatter = createPrettyFormatter();
    const logEntry: KoriLogEntry = {
      time: 1640995200000, // 2022-01-01 00:00:00 UTC
      level: 'info',
      channel: 'app',
      name: 'server',
      message: 'Server started',
    };

    const result = formatter(logEntry);

    // Should include timestamp by default
    expect(result).toContain('2022-01-01T00:00:00.000Z');
    // Should include formatted level
    expect(result).toContain('INFO ');
    // Should include channel and name
    expect(result).toContain('[app:server]');
    // Should include message
    expect(result).toContain('Server started');
  });

  test('should have colors disabled by default', () => {
    const formatter = createPrettyFormatter();
    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'error',
      channel: 'sys',
      name: 'core',
      message: 'System error',
    };

    const result = formatter(logEntry);

    // Should NOT contain ANSI color codes by default
    expect(result).not.toContain('\x1b[');
    expect(result).toContain('ERROR');
  });

  test('should support colorize option', () => {
    const colorizedFormatter = createPrettyFormatter({ colorize: true });
    const nonColorizedFormatter = createPrettyFormatter({ colorize: false });

    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'warn',
      channel: 'app',
      name: 'auth',
      message: 'Warning message',
    };

    const colorizedResult = colorizedFormatter(logEntry);
    const nonColorizedResult = nonColorizedFormatter(logEntry);

    // Colorized should have ANSI codes
    expect(colorizedResult).toContain('\x1b[33m'); // Yellow for warn
    expect(colorizedResult).toContain('\x1b[0m');

    // Non-colorized should not have ANSI codes
    expect(nonColorizedResult).not.toContain('\x1b[');

    // Both should contain the basic content
    expect(colorizedResult).toContain('WARN ');
    expect(nonColorizedResult).toContain('WARN ');
    expect(colorizedResult).toContain('[app:auth]');
    expect(nonColorizedResult).toContain('[app:auth]');
  });

  test('should support includeTimestamp option', () => {
    const withTimestampFormatter = createPrettyFormatter({ includeTimestamp: true });
    const withoutTimestampFormatter = createPrettyFormatter({ includeTimestamp: false });

    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'info',
      channel: 'app',
      name: 'handler',
      message: 'Timestamp test',
    };

    const withTimestampResult = withTimestampFormatter(logEntry);
    const withoutTimestampResult = withoutTimestampFormatter(logEntry);

    // With timestamp should include ISO string
    expect(withTimestampResult).toContain('2022-01-01T00:00:00.000Z');

    // Without timestamp should not include ISO string
    expect(withoutTimestampResult).not.toContain('2022-01-01T00:00:00.000Z');

    // Both should contain other elements
    expect(withTimestampResult).toContain('INFO ');
    expect(withoutTimestampResult).toContain('INFO ');
  });

  test('should format log entry with meta', () => {
    const formatter = createPrettyFormatter({ includeTimestamp: false, colorize: false });
    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'debug',
      channel: 'plugin',
      name: 'cors',
      message: 'CORS check passed',
      meta: { origin: 'https://example.com', method: 'GET' },
    };

    const result = formatter(logEntry);

    expect(result).toContain('DEBUG');
    expect(result).toContain('[plugin:cors]');
    expect(result).toContain('CORS check passed');
    expect(result).toContain('"origin": "https://example.com"');
    expect(result).toContain('"method": "GET"');
  });

  test('should handle meta serialization errors gracefully', () => {
    const formatter = createPrettyFormatter({ includeTimestamp: false, colorize: false });

    // Create circular reference in meta
    const circularMeta: any = { name: 'test' };
    circularMeta.self = circularMeta;

    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: 'info',
      channel: 'app',
      name: 'test',
      message: 'Meta error test',
      meta: circularMeta,
    };

    const result = formatter(logEntry);

    expect(result).toContain('INFO ');
    expect(result).toContain('[app:test]');
    expect(result).toContain('Meta error test');
    expect(result).toContain('[meta serialization error]');
  });

  test.each([
    ['debug', '\x1b[36m'], // cyan
    ['info', '\x1b[32m'], // green
    ['warn', '\x1b[33m'], // yellow
    ['error', '\x1b[31m'], // red
    ['fatal', '\x1b[35m'], // magenta
  ])('should format %s level with appropriate color when colorize enabled', (level, expectedColor) => {
    const formatter = createPrettyFormatter({ includeTimestamp: false, colorize: true });
    const logEntry: KoriLogEntry = {
      time: 1640995200000,
      level: level as KoriLogLevel,
      channel: 'test',
      name: 'level',
      message: `${level} message`,
    };

    const result = formatter(logEntry);

    expect(result).toContain(expectedColor);
    expect(result).toContain(level.toUpperCase());
    expect(result).toContain('\x1b[0m'); // reset
  });
});
