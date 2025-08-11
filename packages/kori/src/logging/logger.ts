import { type KoriErrorSerializer } from './error-serializer.js';
import { createLogEntry, type KoriLogLevel, type KoriLogMetaOrFactory } from './log-entry.js';
import { type KoriLogReporter } from './log-reporter.js';

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
   * Log debug message (lowest priority).
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  debug(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Log informational message.
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  info(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Log warning message.
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  warn(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Log error message.
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  error(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Log fatal error message (highest priority).
   *
   * @param message - Log message to output
   * @param meta - Optional metadata or factory function for lazy evaluation
   */
  fatal(message: string, meta?: KoriLogMetaOrFactory): void;

  /**
   * Check if a log level would be output.
   *
   * @param level - Log level to check
   * @returns True if the level would be logged, false otherwise
   */
  isLevelEnabled(level: KoriLogLevel): boolean;

  /**
   * Create logger for different channel while preserving name and bindings.
   *
   * @param channelName - New channel name for the logger
   * @returns New logger instance with the specified channel
   */
  channel(channelName: string): KoriLogger;

  /**
   * Create child logger with hierarchical name and optional additional bindings.
   *
   * @param options - Configuration for the child logger
   * @param options.name - Child logger name (will be appended to parent name)
   * @param options.channelName - Optional channel name override
   * @param options.bindings - Optional additional bindings to merge with parent
   * @returns New child logger instance with hierarchical name
   */
  child(options: { name: string; channelName?: string; bindings?: Record<string, unknown> }): KoriLogger;

  /**
   * Add persistent key-value data to all future log entries.
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

function isLevelEnabled(currentLevel: KoriLogLevel, minLevel: KoriLogLevel): boolean {
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
 * @param options - Configuration for the logger instance
 * @param options.channel - Channel name for organizing logs
 * @param options.name - Hierarchical logger name
 * @param options.level - Minimum log level to output
 * @param options.bindings - Initial key-value bindings for all log entries
 * @param options.reporters - Output destinations for log entries
 * @param options.errorSerializer - Function to serialize errors for logging
 * @returns Configured logger instance
 */
export function createKoriLogger(options: {
  channel: string;
  name: string;
  level: KoriLogLevel;
  bindings: Record<string, unknown>;
  reporters: KoriLogReporter[];
  errorSerializer: KoriErrorSerializer;
}): KoriLogger {
  let _bindings = { ...options.bindings };

  function log(level: KoriLogLevel, message: string, metaOrFactory?: KoriLogMetaOrFactory): void {
    if (!isLevelEnabled(level, options.level)) {
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

    for (const reporter of options.reporters) {
      try {
        reporter(logEntry);
      } catch {
        // We can't do anything about this, so we just ignore it
      }
    }
  }

  const logger: KoriLogger = {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    fatal: (message, meta) => log('fatal', message, meta),

    isLevelEnabled: (level) => isLevelEnabled(level, options.level),

    channel: (channelName) => {
      return createKoriLogger({
        channel: channelName,
        name: options.name,
        level: options.level,
        bindings: _bindings,
        reporters: options.reporters,
        errorSerializer: options.errorSerializer,
      });
    },

    child: (childOptions) => {
      return createKoriLogger({
        channel: childOptions.channelName ?? options.channel,
        name: createChildName({ parentName: options.name, childName: childOptions.name }),
        level: options.level,
        bindings: { ..._bindings, ...childOptions.bindings },
        reporters: options.reporters,
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
