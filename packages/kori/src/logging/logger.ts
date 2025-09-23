import { type KoriErrorSerializer } from './error-serializer.js';
import { createLogEntry, type KoriLogLevel, type KoriLogMetaOrFactory } from './log-entry.js';
import { executeReporter, type KoriLogReporter } from './log-reporter.js';

/**
 * Main logging interface with channel organization and hierarchical naming.
 *
 * Supports:
 * - Five standard log levels with automatic filtering
 * - Lazy metadata evaluation for performance
 * - Channel-based organization for different subsystems
 * - Hierarchical logger names with inherited configuration
 * - Persistent bindings for contextual data
 */
export type KoriLogger = {
  /**
   * Logs debug-level message with optional metadata.
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  debug(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Logs informational message with optional metadata.
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  info(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Logs warning message with optional metadata.
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  warn(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Logs error message with optional metadata.
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  error(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Logs fatal error message with optional metadata.
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  fatal(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Avoids expensive metadata computation when the log level would be filtered.
   *
   * @param level - Log level to check
   * @returns True if the level would be logged, false otherwise
   */
  isLevelEnabled(level: KoriLogLevel): boolean;

  /**
   * Switches to a different channel while preserving logger name and bindings.
   * Useful for organizing logs by subsystem (e.g., 'auth', 'database', 'api').
   *
   * @param channelName - New channel name for the logger
   * @returns New logger instance with the specified channel
   */
  channel(channelName: string): KoriLogger;

  /**
   * Creates hierarchical logger for request scoping and nested operations.
   * Child name is appended to parent (e.g., 'server' becomes 'server.auth').
   *
   * @param childOptions - Options for child logger creation
   * @param childOptions.name - Child logger name (will be appended to parent name)
   * @param childOptions.channelName - Optional channel name override
   * @param childOptions.bindings - Optional additional bindings to merge with parent
   * @returns New child logger instance with hierarchical name
   */
  child(childOptions: { name: string; channelName?: string; bindings?: Record<string, unknown> }): KoriLogger;

  /**
   * Adds persistent context data to all future log entries.
   *
   * @param bindings - Key-value pairs to add to this logger instance
   * @returns Same logger instance for method chaining
   */
  addBindings(bindings: Record<string, unknown>): KoriLogger;

  /**
   * Serialize an unknown error value into a safe, JSON-serializable object
   * for inclusion in log metadata.
   *
   * @param error - Any value that might represent an error
   * @returns Serializable representation of the error
   */
  serializeError(error: unknown): unknown;
};

const LOG_LEVELS: Record<KoriLogLevel, number> = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

function isLevelEnabled(options: { currentLevel: KoriLogLevel; minLevel: KoriLogLevel }): boolean {
  const { currentLevel, minLevel } = options;
  return LOG_LEVELS[currentLevel] >= LOG_LEVELS[minLevel];
}

function createChildName({ parentName, childName }: { parentName: string; childName: string }): string {
  return parentName ? `${parentName}.${childName}` : childName;
}

/**
 * Creates a logger instance with specified configuration.
 *
 * Manages internal state for bindings and provides all logging functionality
 * including level filtering, metadata handling, and reporter output.
 *
 * @internal Used within logging module for framework infrastructure
 *
 * @param options.channel - Channel name for organizing logs
 * @param options.name - Hierarchical logger name
 * @param options.level - Minimum log level to output
 * @param options.bindings - Initial key-value bindings for all log entries
 * @param options.reporter - Output configuration for log entries
 * @param options.errorSerializer - Function to serialize errors for logging
 * @returns Configured logger instance
 *
 * @example
 * ```typescript
 * const logger = createKoriLogger({
 *   channel: 'app',
 *   name: 'server',
 *   level: 'info',
 *   bindings: { version: '1.0.0' },
 *   reporter: KoriConsoleReporterPresets.json(),
 *   errorSerializer: serializeError
 * });
 * ```
 */
export function createKoriLogger(options: {
  channel: string;
  name: string;
  level: KoriLogLevel;
  bindings: Record<string, unknown>;
  reporter: KoriLogReporter;
  errorSerializer: KoriErrorSerializer;
}): KoriLogger {
  let _bindings = { ...options.bindings };

  function log(level: KoriLogLevel, message: string, metaOrFactory?: KoriLogMetaOrFactory): void {
    if (!isLevelEnabled({ currentLevel: level, minLevel: options.level })) {
      return;
    }

    const logEntry = createLogEntry({
      level,
      channel: options.channel,
      name: options.name,
      message,
      bindings: _bindings,
      meta: metaOrFactory,
    });

    executeReporter(options.reporter, logEntry);
  }

  const logger: KoriLogger = {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    fatal: (message, meta) => log('fatal', message, meta),

    isLevelEnabled: (level) => isLevelEnabled({ currentLevel: level, minLevel: options.level }),

    channel: (channelName) => {
      return createKoriLogger({
        channel: channelName,
        name: options.name,
        level: options.level,
        bindings: _bindings,
        reporter: options.reporter,
        errorSerializer: options.errorSerializer,
      });
    },

    child: (childOptions) => {
      return createKoriLogger({
        channel: childOptions.channelName ?? options.channel,
        name: createChildName({ parentName: options.name, childName: childOptions.name }),
        level: options.level,
        bindings: { ..._bindings, ...childOptions.bindings },
        reporter: options.reporter,
        errorSerializer: options.errorSerializer,
      });
    },

    addBindings: (bindings) => {
      _bindings = { ..._bindings, ...bindings };
      return logger;
    },

    serializeError: options.errorSerializer,
  };

  return logger;
}
