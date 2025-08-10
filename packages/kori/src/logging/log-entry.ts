/**
 * Standard log levels in ascending order of severity.
 */
export type KoriLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Structured metadata to attach to log entries.
 */
export type KoriLogMeta = Record<string, unknown>;

/**
 * Factory function for lazy metadata evaluation.
 * Called only when the log level is enabled to avoid expensive computations.
 */
export type KoriLogMetaFactory = () => KoriLogMeta | undefined;

/**
 * Metadata can be provided directly or via factory for lazy evaluation.
 */
export type KoriLogMetaOrFactory = KoriLogMeta | KoriLogMetaFactory;

/**
 * Complete log entry sent to reporters.
 */
export type KoriLogEntry = {
  /** Unix timestamp in milliseconds */
  time: number;
  /** Log level */
  level: KoriLogLevel;
  /** Channel for grouping related logs (e.g., 'app', 'plugin.cors') */
  channel: string;
  /** Hierarchical logger name (e.g., 'instance', 'request.auth') */
  name: string;
  /** Log message */
  message: string;
  /** Combined bindings and metadata */
  meta?: Record<string, unknown>;
};

/**
 * Creates a standardized log entry with current timestamp.
 *
 * Combines bindings and metadata, with metadata taking precedence
 * over bindings for duplicate keys. Handles lazy metadata evaluation
 * by calling factory functions when provided.
 *
 * @internal Used within logging module for framework infrastructure
 *
 * @param options - Parameters for log entry creation
 * @returns Complete log entry ready for reporters
 */
export function createLogEntry({
  level,
  channel,
  name,
  message,
  bindings,
  meta,
}: {
  level: KoriLogLevel;
  channel: string;
  name: string;
  message: string;
  bindings: Record<string, unknown>;
  meta?: KoriLogMetaOrFactory;
}): KoriLogEntry {
  // Resolve factory function lazily for performance
  const resolvedMeta = typeof meta === 'function' ? meta() : meta;

  return {
    time: Date.now(),
    level,
    channel,
    name,
    message,
    meta: { ...bindings, ...(resolvedMeta ?? {}) },
  };
}
