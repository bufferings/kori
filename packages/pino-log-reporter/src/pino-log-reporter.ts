import { type KoriLogEntry, type KoriLogLevel, type KoriLogReporter } from '@korix/kori';
import { pino } from 'pino';

const PINO_LEVEL_MAP: Record<KoriLogLevel, pino.Level> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'fatal',
};

const DEFAULT_FILTER = () => true;

export function createPinoLogReporter(
  options?: Omit<pino.LoggerOptions, 'level'> & {
    level?: KoriLogLevel;
    filter?: (entry: KoriLogEntry) => boolean;
  },
): KoriLogReporter {
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
      ...entry.data,
    };

    pinoLogger[entryPinoLevel](logData, entry.message);
  };
}
