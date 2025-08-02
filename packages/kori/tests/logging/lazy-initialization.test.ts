import { describe, expect, it, vi } from 'vitest';

import { createKoriLoggerFactory, type KoriLogData, type KoriLogDataFactory } from '../../src/logging/logger.js';

describe('Lazy Log Data Initialization', () => {
  it('should execute factory function only when log level is enabled', () => {
    const mockReporter = vi.fn();
    const loggerFactory = createKoriLoggerFactory({
      level: 'info',
      reporters: [mockReporter],
    });
    const logger = loggerFactory({ channel: 'test', name: 'test' });

    const expensiveFactory = vi.fn(() => ({ expensive: 'data' }));

    // Should execute factory when level is enabled
    logger.info('Test message', expensiveFactory);
    expect(expensiveFactory).toHaveBeenCalledTimes(1);
    expect(mockReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Test message',
        data: expect.objectContaining({
          data: { expensive: 'data' },
        }) as object,
      }) as object,
    );

    expensiveFactory.mockClear();
    mockReporter.mockClear();

    // Should NOT execute factory when level is disabled
    logger.debug('Debug message', expensiveFactory);
    expect(expensiveFactory).not.toHaveBeenCalled();
    expect(mockReporter).not.toHaveBeenCalled();
  });

  it('should work with regular data objects (backward compatibility)', () => {
    const mockReporter = vi.fn();
    const loggerFactory = createKoriLoggerFactory({
      level: 'info',
      reporters: [mockReporter],
    });
    const logger = loggerFactory({ channel: 'test', name: 'test' });

    const regularData: KoriLogData = { user: 'john', action: 'login' };

    logger.info('Regular data test', regularData);
    expect(mockReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Regular data test',
        data: expect.objectContaining({
          data: { user: 'john', action: 'login' },
        }) as object,
      }) as object,
    );
  });

  it('should handle factory function that returns undefined', () => {
    const mockReporter = vi.fn();
    const loggerFactory = createKoriLoggerFactory({
      level: 'info',
      reporters: [mockReporter],
    });
    const logger = loggerFactory({ channel: 'test', name: 'test' });

    const undefinedFactory: KoriLogDataFactory = () => undefined;

    logger.info('Undefined factory test', undefinedFactory);
    expect(mockReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Undefined factory test',
        // data should not be present when factory returns undefined
      }),
    );

    // Verify that data field is not present
    const call = mockReporter.mock.calls[0];
    expect(call?.[0]).not.toHaveProperty('data');
  });

  it('should handle expensive computations in factory', () => {
    const mockReporter = vi.fn();
    const loggerFactory = createKoriLoggerFactory({
      level: 'warn',
      reporters: [mockReporter],
    });
    const logger = loggerFactory({ channel: 'test', name: 'test' });

    let expensiveComputationCalled = false;
    const expensiveComputation = () => {
      expensiveComputationCalled = true;
      return { result: 'expensive-computation-result' };
    };

    const factoryWithExpensiveComputation: KoriLogDataFactory = () => ({
      timestamp: Date.now(),
      computedData: expensiveComputation(),
    });

    // Should not call expensive computation for disabled log level
    logger.debug('Debug with expensive computation', factoryWithExpensiveComputation);
    expect(expensiveComputationCalled).toBe(false);

    // Should call expensive computation for enabled log level
    logger.warn('Warn with expensive computation', factoryWithExpensiveComputation);
    expect(expensiveComputationCalled).toBe(true);
    expect(mockReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'Warn with expensive computation',
        data: expect.objectContaining({
          data: expect.objectContaining({
            computedData: { result: 'expensive-computation-result' },
          }) as object,
        }) as object,
      }) as object,
    );
  });

  it('should work with all log levels', () => {
    const mockReporter = vi.fn();
    const loggerFactory = createKoriLoggerFactory({
      level: 'debug', // Enable all levels
      reporters: [mockReporter],
    });
    const logger = loggerFactory({ channel: 'test', name: 'test' });

    const factoryCallCounts = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    const createFactory = (level: keyof typeof factoryCallCounts) => () => {
      factoryCallCounts[level]++;
      return { level, callCount: factoryCallCounts[level] };
    };

    logger.debug('Debug message', createFactory('debug'));
    logger.info('Info message', createFactory('info'));
    logger.warn('Warn message', createFactory('warn'));
    logger.error('Error message', createFactory('error'));
    logger.fatal('Fatal message', createFactory('fatal'));

    // All factories should have been called exactly once
    expect(factoryCallCounts.debug).toBe(1);
    expect(factoryCallCounts.info).toBe(1);
    expect(factoryCallCounts.warn).toBe(1);
    expect(factoryCallCounts.error).toBe(1);
    expect(factoryCallCounts.fatal).toBe(1);

    // All log entries should have been created
    expect(mockReporter).toHaveBeenCalledTimes(6);
  });
});
