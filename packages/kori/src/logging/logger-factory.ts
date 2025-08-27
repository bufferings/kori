import { createConsoleReporter } from './console-reporter.js';
import { serializeError, type KoriErrorSerializer } from './error-serializer.js';
import { type KoriLogLevel } from './log-entry.js';
import { type KoriLogReporter } from './log-reporter.js';
import { createKoriLogger, type KoriLogger } from './logger.js';

/**
 * Options for creating an individual logger.
 */
export type KoriLoggerOptions = {
  /** Channel for grouping related logs (e.g., 'app', 'plugin.cors') */
  channel: string;
  /** Hierarchical logger name (e.g., 'instance', 'request.auth') */
  name: string;
};

/**
 * Factory function to create loggers with specific channel and name.
 */
export type KoriLoggerFactory = (loggerOptions: KoriLoggerOptions) => KoriLogger;

/**
 * Options for creating a logger factory.
 */
export type KoriLoggerFactoryOptions = {
  /** Minimum log level to output (defaults to 'info') */
  level?: KoriLogLevel;
  /** Global bindings added to all log entries */
  bindings?: Record<string, unknown>;
  /** Output destinations for log entries */
  reporters?: KoriLogReporter[];
  /** Optional serializer for error objects used in logging metadata */
  errorSerializer?: KoriErrorSerializer;
};

/**
 * Creates a logger factory with shared configuration.
 *
 * The factory approach allows consistent logger configuration across
 * an application while still enabling per-logger customization.
 *
 * @param options - Global logger configuration
 * @returns Factory function to create individual loggers
 *
 * @example
 * ```typescript
 * const loggerFactory = createKoriLoggerFactory({
 *   level: 'debug',
 *   bindings: { service: 'api', version: '1.0.0' },
 *   reporters: [createConsoleReporter()]
 * });
 *
 * const appLogger = loggerFactory({ channel: 'app', name: 'server' });
 * const dbLogger = loggerFactory({ channel: 'database', name: 'connection' });
 * ```
 */
export function createKoriLoggerFactory(options: KoriLoggerFactoryOptions = {}): KoriLoggerFactory {
  const { level, bindings, reporters, errorSerializer } = options;
  return (loggerOptions: KoriLoggerOptions) => {
    const { channel, name } = loggerOptions;
    return createKoriLogger({
      channel,
      name,
      level: level ?? 'info',
      bindings: bindings ?? {},
      reporters: reporters ?? [createConsoleReporter()],
      errorSerializer: errorSerializer ?? serializeError,
    });
  };
}
