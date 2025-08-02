import { type KoriLogEntry, type KoriLogLevel, type KoriLogReporter } from '@korix/kori';
import { getLogger, type Logger } from '@logtape/logtape';

const DEFAULT_FILTER = () => true;

/**
 * Options for creating a LogTape log reporter.
 */
export type LogTapeLogReporterOptions = {
  /**
   * Optional filter function to selectively log entries
   */
  filter?: (entry: KoriLogEntry) => boolean;
  /**
   * Category prefix for LogTape logger. Defaults to ["kori"]
   * The channel will be appended: [prefix, channel]
   */
  categoryPrefix?: string[];
};

export function createLogTapeLogReporter(options?: LogTapeLogReporterOptions): KoriLogReporter {
  const filter = options?.filter ?? DEFAULT_FILTER;
  const categoryPrefix = options?.categoryPrefix ?? ['kori'];

  return (entry: KoriLogEntry) => {
    if (!filter(entry)) {
      return;
    }

    // Create category with channel: [categoryPrefix, channel]
    const category = [...categoryPrefix, entry.channel];

    // Get logger for this category (LogTape handles internal caching)
    const logger = getLogger(category);

    // Map Kori log level to LogTape method
    const logMethod = getLogTapeMethod(logger, entry.level);
    if (!logMethod) {
      return;
    }

    // Prepare structured data with Kori metadata
    const structuredData: Record<string, unknown> = {
      ...(entry.data ?? {}),
      kori: {
        time: entry.time,
        channel: entry.channel,
        name: entry.name,
      },
    };

    // Log with LogTape
    if (Object.keys(structuredData).length > 0) {
      logMethod(entry.message, structuredData);
    } else {
      logMethod(entry.message, undefined);
    }
  };
}

/**
 * Maps Kori log level to LogTape logger method
 */
function getLogTapeMethod(
  logger: Logger,
  level: KoriLogLevel,
): ((message: string, extra?: Record<string, unknown>) => void) | null {
  switch (level) {
    case 'debug':
      return (message: string, extra?: Record<string, unknown>) => logger.debug({ message, ...extra });
    case 'info':
      return (message: string, extra?: Record<string, unknown>) => logger.info({ message, ...extra });
    case 'warn':
      return (message: string, extra?: Record<string, unknown>) => logger.warn({ message, ...extra });
    case 'error':
      return (message: string, extra?: Record<string, unknown>) => logger.error({ message, ...extra });
    case 'fatal':
      return (message: string, extra?: Record<string, unknown>) => logger.fatal({ message, ...extra });
    default:
      return null;
  }
}
