import { type KoriLogFilter } from './log-filter.js';
import { createJsonFormatter, createPrettyFormatter } from './log-formatter.js';
import { type KoriLogReporter } from './log-reporter.js';

/**
 * Structured JSON output to console.
 * Suitable for production, CI, and log aggregation systems.
 *
 * @param options.filter - Optional filter to control which entries are logged
 * @returns Reporter configured for JSON console output
 */
export function jsonConsoleReporter(options: { filter?: KoriLogFilter } = {}): KoriLogReporter {
  return {
    filter: options.filter,
    sinks: [
      {
        formatter: createJsonFormatter(),
        write: (formatted, entry) => {
          if (entry.level === 'error' || entry.level === 'fatal') {
            // eslint-disable-next-line no-console
            console.error(formatted);
          } else {
            // eslint-disable-next-line no-console
            console.log(formatted);
          }
        },
      },
    ],
  };
}

/**
 * Human-readable colored output to console.
 * Ideal for development and debugging.
 *
 * @param options.colorize - Enable ANSI colors for log levels (default: true)
 * @param options.filter - Optional filter to control which entries are logged
 * @returns Reporter configured for pretty console output
 */
export function prettyConsoleReporter(options: { colorize?: boolean; filter?: KoriLogFilter } = {}): KoriLogReporter {
  return {
    filter: options.filter,
    sinks: [
      {
        formatter: createPrettyFormatter({
          colorize: options.colorize ?? true,
        }),
        write: (formatted, entry) => {
          if (entry.level === 'error' || entry.level === 'fatal') {
            // eslint-disable-next-line no-console
            console.error(formatted);
          } else {
            // eslint-disable-next-line no-console
            console.log(formatted);
          }
        },
      },
    ],
  };
}

/**
 * No output. Useful for testing or when logging is disabled.
 *
 * @returns Reporter configured to suppress all output
 */
export function silentConsoleReporter(): KoriLogReporter {
  return { sinks: [] };
}

/**
 * Pre-configured console reporter presets for common use cases.
 */
export const KoriConsoleReporterPresets = {
  json: jsonConsoleReporter,
  pretty: prettyConsoleReporter,
  silent: silentConsoleReporter,
} as const;
