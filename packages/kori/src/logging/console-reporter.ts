import { type KoriLogEntry } from './log-entry.js';
import { type KoriLogReporter } from './log-reporter.js';

/**
 * Creates a console reporter that outputs JSON-structured logs.
 *
 * Handles serialization failures gracefully with a fallback format
 * to ensure logs are never lost due to circular references or
 * non-serializable objects.
 *
 * @param filter - Optional function to selectively output log entries
 * @returns Reporter function for use with KoriLogger
 *
 * @example
 * ```typescript
 * // Basic usage
 * const reporter = createConsoleReporter();
 *
 * // With filtering (only errors)
 * const errorReporter = createConsoleReporter(
 *   entry => entry.level === 'error' || entry.level === 'fatal'
 * );
 * ```
 */
export function createConsoleReporter(filter?: (entry: KoriLogEntry) => boolean): KoriLogReporter {
  return (entry: KoriLogEntry) => {
    if (filter && !filter(entry)) {
      return;
    }

    try {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry));
    } catch (error) {
      // Fallback for serialization errors (e.g., circular references)
      // eslint-disable-next-line no-console
      console.log(
        `[LOG] ${entry.time} ${entry.level.toUpperCase()} [${entry.channel}:${entry.name}] ${entry.message}`,
        {
          serialization_error: error instanceof Error ? error.message : String(error),
          data: '[Object with serialization issues]',
        },
      );
    }
  };
}
