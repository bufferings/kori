import { type KoriLogEntry } from './log-entry.js';

/**
 * Formats a log entry into a string representation.
 *
 * @param entry - The log entry to format
 * @returns Formatted string ready for output
 */
export type KoriLogFormatter = (entry: KoriLogEntry) => string;

/**
 * Creates a JSON formatter with graceful error handling.
 *
 * Handles serialization failures by falling back to a safe format
 * that preserves essential log information.
 *
 * @returns Formatter that outputs JSON strings
 */
export function createJsonFormatter(): KoriLogFormatter {
  return (entry: KoriLogEntry): string => {
    try {
      return JSON.stringify(entry);
    } catch (error) {
      // Fallback for serialization errors (circular refs, non-serializable objects)
      const { time, level, channel, name, message } = entry;
      const errorMsg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({
        time,
        level,
        channel,
        name,
        message,
        meta: { __serialization_error: errorMsg },
      });
    }
  };
}

/**
 * Creates a human-readable formatter with optional colors.
 *
 * Formats entries in a readable format suitable for development
 * and debugging environments.
 *
 * @param options - Formatting configuration options
 * @param options.colorize - Enable ANSI colors for log levels
 * @param options.includeTimestamp - Include timestamp in output (default: true)
 * @returns Formatter that outputs human-readable strings
 */
export function createPrettyFormatter(
  options: {
    colorize?: boolean;
    includeTimestamp?: boolean;
  } = {},
): KoriLogFormatter {
  const { colorize = false, includeTimestamp = true } = options;

  return (entry: KoriLogEntry): string => {
    const parts: string[] = [];

    if (includeTimestamp) {
      const timestamp = new Date(entry.time).toISOString();
      parts.push(timestamp);
    }

    const level = entry.level.toUpperCase().padEnd(5);
    parts.push(colorize ? colorizeLevel(level, entry.level) : level);

    parts.push(`[${entry.channel}:${entry.name}]`);
    parts.push(entry.message);

    if (entry.meta && Object.keys(entry.meta).length > 0) {
      try {
        parts.push(JSON.stringify(entry.meta));
      } catch {
        parts.push('[meta serialization error]');
      }
    }

    return parts.join(' ');
  };
}

/**
 * Applies ANSI color codes to log level text.
 */
function colorizeLevel(levelText: string, level: string): string {
  const colors: Record<string, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
    fatal: '\x1b[35m', // magenta
  };
  const reset = '\x1b[0m';
  const color = colors[level] ?? '';
  return `${color}${levelText}${reset}`;
}
