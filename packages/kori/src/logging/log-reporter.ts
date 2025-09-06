import { type KoriLogEntry } from './log-entry.js';
import { type KoriLogFilter } from './log-filter.js';
import { type KoriLogSink } from './log-sink.js';

/**
 * Manages multiple log sinks with optional reporter-level filtering.
 */
export type KoriLogReporter = {
  /** Reporter-level filter applied before processing any sinks */
  filter?: KoriLogFilter;
  /** Output destinations with individual filtering and formatting */
  sinks: KoriLogSink[];
};

/**
 * Executes a reporter on a log entry with synchronous execution.
 * Async sink operations are executed in fire-and-forget mode.
 *
 * @param reporter - Reporter containing sinks and filtering configuration
 * @param entry - Log entry to process through the reporter
 *
 * @internal
 */
export function executeReporter(reporter: KoriLogReporter, entry: KoriLogEntry): void {
  // Stage 1: Reporter-level filter
  if (reporter.filter && !reporter.filter(entry)) {
    return;
  }

  // Stage 2: Filter active sinks
  const activeSinks = reporter.sinks.filter((sink) => !sink.filter || sink.filter(entry));

  if (activeSinks.length === 0) {
    return;
  }

  // Stage 3: Execute sinks synchronously where possible
  for (const sink of activeSinks) {
    try {
      const formatted = sink.formatter(entry);
      const result = sink.write(formatted, entry);

      // Handle async sinks in fire-and-forget mode
      if (result instanceof Promise) {
        void result.catch(() => {
          // Silent failure
        });
      }
    } catch {
      // Silent failure
    }
  }
}
