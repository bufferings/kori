import { type KoriLogEntry } from './log-entry.js';
import { type KoriLogFilter } from './log-filter.js';
import { type KoriLogFormatter } from './log-formatter.js';

/**
 * Function that writes formatted log output to a destination.
 *
 * Return `void` for synchronous operations (console, memory buffers).
 * Return `Promise<void>` for asynchronous operations (files, networks, databases).
 * Async operations are executed in fire-and-forget mode to maintain synchronous logging API.
 *
 * @param formatted - Log entry converted to string by the formatter
 * @param entry - Original log entry for output decisions
 * @returns `void` for sync operations, `Promise<void>` for async operations
 */
export type KoriLogWriter = (formatted: string, entry: KoriLogEntry) => void | Promise<void>;

/**
 * Outputs formatted log entries to a specific destination.
 *
 * Define how logs are filtered, formatted, and written to console, files,
 * network endpoints, or other destinations.
 */
export type KoriLogSink = {
  /** Controls which log entries to process */
  filter?: KoriLogFilter;
  /** Converts log entries to formatted strings */
  formatter: KoriLogFormatter;
  /** Writes formatted output to destination */
  write: KoriLogWriter;
};
