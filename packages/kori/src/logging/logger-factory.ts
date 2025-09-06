import { KoriConsoleReporterPresets } from './console-reporter-presets.js';
import { serializeError, type KoriErrorSerializer } from './error-serializer.js';
import { type KoriLogLevel } from './log-entry.js';
import { type KoriLogReporter } from './log-reporter.js';
import { createKoriLogger, type KoriLogger } from './logger.js';

/**
 * Options for creating a logger.
 */
export type KoriLoggerOptions = {
  /** Channel for grouping related logs (e.g., 'app', 'plugin.cors') */
  channel: string;
  /** Hierarchical logger name (e.g., 'instance', 'request.auth') */
  name: string;
};

/**
 * Function that creates a logger from channel and name options.
 *
 * @param loggerOptions - Channel and name configuration for the logger
 * @returns Logger instance configured with the specified channel and name
 */
export type KoriLoggerFactory = (loggerOptions: KoriLoggerOptions) => KoriLogger;

/**
 * Options for creating a logger factory.
 */
export type KoriLoggerFactoryOptions = {
  /** Minimum log level to output */
  level?: KoriLogLevel;
  /** Global bindings added to all log entries */
  bindings?: Record<string, unknown>;
  /** Output configuration for log entries */
  reporter?: KoriLogReporter;
  /** Optional serializer for error objects */
  errorSerializer?: KoriErrorSerializer;
};

/**
 * Creates a KoriLoggerFactory.
 *
 * **Defaults**: level='info', reporter=pretty console output, no bindings.
 *
 * @param options - Configuration options for the logger factory
 * @returns Logger factory function
 *
 * @example
 * ```typescript
 * const loggerFactory = createKoriLoggerFactory({
 *   level: 'debug',
 *   bindings: { service: 'api', version: '1.0.0' },
 *   reporter: KoriConsoleReporterPresets.json()
 * });
 *
 * const appLogger = loggerFactory({ channel: 'app', name: 'server' });
 * const dbLogger = loggerFactory({ channel: 'database', name: 'connection' });
 * ```
 */
export function createKoriLoggerFactory(options: KoriLoggerFactoryOptions = {}): KoriLoggerFactory {
  const { level, bindings, reporter, errorSerializer } = options;
  return (loggerOptions: KoriLoggerOptions) => {
    const { channel, name } = loggerOptions;
    return createKoriLogger({
      channel,
      name,
      level: level ?? 'info',
      bindings: bindings ?? {},
      reporter: reporter ?? KoriConsoleReporterPresets.pretty(),
      errorSerializer: errorSerializer ?? serializeError,
    });
  };
}
