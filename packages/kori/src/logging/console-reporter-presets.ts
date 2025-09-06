import { type KoriLogEntry } from './log-entry.js';
import { createJsonFormatter, createPrettyFormatter } from './log-formatter.js';
import { type KoriLogReporter } from './log-reporter.js';

/**
 * Pre-configured console reporter presets for common use cases.
 */
export const KoriConsoleReporterPresets = {
  /**
   * Structured JSON output to console.
   * Suitable for production, CI, and log aggregation systems.
   *
   * @param options - Configuration options
   * @param options.filter - Optional filter to control which entries are logged
   * @returns Reporter configured for JSON console output
   */
  json: (
    options: {
      filter?: (entry: KoriLogEntry) => boolean;
    } = {},
  ): KoriLogReporter => ({
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
  }),

  /**
   * Human-readable colored output to console.
   * Ideal for development and debugging.
   *
   * @param options - Configuration options
   * @param options.colorize - Enable ANSI colors for log levels (default: true)
   * @param options.filter - Optional filter to control which entries are logged
   * @returns Reporter configured for pretty console output
   */
  pretty: (
    options: {
      colorize?: boolean;
      filter?: (entry: KoriLogEntry) => boolean;
    } = {},
  ): KoriLogReporter => ({
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
  }),

  /**
   * No output. Useful for testing or when logging is disabled.
   *
   * @returns Reporter configured to suppress all output
   */
  silent: (): KoriLogReporter => ({
    sinks: [],
  }),
} as const;
