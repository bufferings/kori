import { type KoriLogEntry } from '@korix/kori';
import { getLogger, type Logger } from '@logtape/logtape';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createLogTapeLogReporter } from '../src/logtape-log-reporter.js';

// Mock LogTape
vi.mock('@logtape/logtape', () => ({
  getLogger: vi.fn(),
}));

describe('createLogTapeLogReporter', () => {
  let mockDebug: ReturnType<typeof vi.fn>;
  let mockInfo: ReturnType<typeof vi.fn>;
  let mockWarn: ReturnType<typeof vi.fn>;
  let mockError: ReturnType<typeof vi.fn>;
  let mockFatal: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    mockDebug = vi.fn();
    mockInfo = vi.fn();
    mockWarn = vi.fn();
    mockError = vi.fn();
    mockFatal = vi.fn();

    const mockLogger = {
      debug: mockDebug,
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      fatal: mockFatal,
    };

    const typedGetLogger = vi.mocked(getLogger);
    typedGetLogger.mockReturnValue(mockLogger as unknown as Logger);
  });

  it('should create a reporter with default options', () => {
    const reporter = createLogTapeLogReporter();
    expect(typeof reporter).toBe('function');

    // Create a log entry to trigger logger creation
    const entry: KoriLogEntry = {
      time: Date.now(),
      level: 'info',
      channel: 'test',
      name: 'test-logger',
      message: 'Test message',
    };

    reporter(entry);

    // With channel mapping enabled by default, should use ['kori', 'test']
    expect(getLogger).toHaveBeenCalledWith(['kori', 'test']);
  });

  it('should create a reporter with custom category prefix', () => {
    const reporter = createLogTapeLogReporter({ categoryPrefix: ['my-app', 'service'] });
    expect(typeof reporter).toBe('function');

    const entry: KoriLogEntry = {
      time: Date.now(),
      level: 'info',
      channel: 'database',
      name: 'test-logger',
      message: 'Test message',
    };

    reporter(entry);

    // Should use custom prefix with channel
    expect(getLogger).toHaveBeenCalledWith(['my-app', 'service', 'database']);
  });

  it('should log info message correctly', () => {
    const reporter = createLogTapeLogReporter();
    const entry: KoriLogEntry = {
      time: Date.now(),
      level: 'info',
      channel: 'test',
      name: 'test-logger',
      message: 'Test message',
      data: { userId: 123 },
    };

    reporter(entry);

    expect(mockInfo).toHaveBeenCalledWith({
      message: 'Test message',
      userId: 123,
      kori: {
        time: entry.time,
        channel: 'test',
        name: 'test-logger',
      },
    });
  });

  it('should log error message correctly', () => {
    const reporter = createLogTapeLogReporter();
    const entry: KoriLogEntry = {
      time: Date.now(),
      level: 'error',
      channel: 'test',
      name: 'test-logger',
      message: 'Error occurred',
      data: { error: 'Something went wrong' },
    };

    reporter(entry);

    expect(mockError).toHaveBeenCalledWith({
      message: 'Error occurred',
      error: 'Something went wrong',
      kori: {
        time: entry.time,
        channel: 'test',
        name: 'test-logger',
      },
    });
  });

  it('should log without data when no data provided', () => {
    const reporter = createLogTapeLogReporter();
    const entry: KoriLogEntry = {
      time: Date.now(),
      level: 'info',
      channel: 'test',
      name: 'test-logger',
      message: 'Simple message',
    };

    reporter(entry);

    expect(mockInfo).toHaveBeenCalledWith({
      message: 'Simple message',
      kori: {
        time: expect.any(Number) as number,
        channel: 'test',
        name: 'test-logger',
      },
    });
  });

  it('should respect filter function', () => {
    const filter = vi.fn().mockReturnValue(false);
    const reporter = createLogTapeLogReporter({ filter });
    const entry: KoriLogEntry = {
      time: Date.now(),
      level: 'info',
      channel: 'test',
      name: 'test-logger',
      message: 'Filtered message',
    };

    reporter(entry);

    expect(filter).toHaveBeenCalledWith(entry);
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it('should include metadata by default', () => {
    const reporter = createLogTapeLogReporter();
    const entry: KoriLogEntry = {
      time: 1234567890,
      level: 'info',
      channel: 'test-channel',
      name: 'test-name',
      message: 'Test message',
    };

    reporter(entry);

    expect(mockInfo).toHaveBeenCalledWith({
      message: 'Test message',
      kori: {
        time: 1234567890,
        channel: 'test-channel',
        name: 'test-name',
      },
    });
  });

  it('should handle all log levels', () => {
    const reporter = createLogTapeLogReporter();
    const baseEntry = {
      time: Date.now(),
      channel: 'test',
      name: 'test-logger',
    };

    // Test each level
    reporter({ ...baseEntry, level: 'debug', message: 'Debug' });
    expect(mockDebug).toHaveBeenCalled();

    reporter({ ...baseEntry, level: 'info', message: 'Info' });
    expect(mockInfo).toHaveBeenCalled();

    reporter({ ...baseEntry, level: 'warn', message: 'Warn' });
    expect(mockWarn).toHaveBeenCalled();

    reporter({ ...baseEntry, level: 'error', message: 'Error' });
    expect(mockError).toHaveBeenCalled();

    reporter({ ...baseEntry, level: 'fatal', message: 'Fatal' });
    expect(mockFatal).toHaveBeenCalled();
  });

  it('should create separate loggers for different channels', () => {
    const reporter = createLogTapeLogReporter();

    const databaseEntry: KoriLogEntry = {
      time: Date.now(),
      level: 'info',
      channel: 'database',
      name: 'test-logger',
      message: 'Database message',
    };

    const authEntry: KoriLogEntry = {
      time: Date.now(),
      level: 'info',
      channel: 'auth',
      name: 'test-logger',
      message: 'Auth message',
    };

    reporter(databaseEntry);
    reporter(authEntry);

    // getLogger should be called twice with different categories
    expect(getLogger).toHaveBeenCalledTimes(2);
    expect(getLogger).toHaveBeenCalledWith(['kori', 'database']);
    expect(getLogger).toHaveBeenCalledWith(['kori', 'auth']);
  });
});
