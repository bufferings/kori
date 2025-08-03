import { type KoriLogEntry, type KoriLogLevel, type KoriLogReporter } from '@korix/kori';
import { pino } from 'pino';

const PINO_LEVEL_MAP: Record<KoriLogLevel, pino.Level> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'fatal',
};

const DEFAULT_FILTER = () => true;

/**
 * Options for creating a Pino log reporter.
 * Uses KoriLogLevel instead of pino.Level for consistency with Kori logging system.
 */
export type PinoLogReporterOptions = {
  /**
   * Log level using Kori's level system (automatically mapped to Pino levels)
   */
  level?: KoriLogLevel;
  /**
   * Optional filter function to selectively log entries
   */
  filter?: (entry: KoriLogEntry) => boolean;
} & Omit<pino.LoggerOptions, 'level'>;

export function createPinoLogReporter(options?: PinoLogReporterOptions): KoriLogReporter {
  const koriLevel = options?.level ?? 'info';
  const pinoLevel = PINO_LEVEL_MAP[koriLevel];

  const pinoOptions: pino.LoggerOptions = {
    ...options,
    level: pinoLevel,
  };

  const pinoLogger = pino(pinoOptions);
  const filter = options?.filter ?? DEFAULT_FILTER;

  return (entry: KoriLogEntry) => {
    if (!filter(entry)) {
      return;
    }

    const entryPinoLevel = PINO_LEVEL_MAP[entry.level];
    if (!pinoLogger.isLevelEnabled(entryPinoLevel)) {
      return;
    }

    const logData = {
      time: entry.time,
      channel: entry.channel,
      name: entry.name,
      ...entry.meta,
    };

    pinoLogger[entryPinoLevel](logData, entry.message);
  };
}
