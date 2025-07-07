import {
  type KoriLogger,
  type KoriLogLevel,
  type KoriLogData,
  type KoriLogSerializers,
  type KoriLoggerFactory,
} from 'kori';
import { pino } from 'pino';

const PINO_LEVEL_MAP: Record<KoriLogLevel, pino.Level> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'fatal',
};

function createPinoLoggerImpl(pinoLogger: pino.Logger): KoriLogger {
  return {
    trace(message: string, data?: KoriLogData): void {
      if (data !== undefined) {
        pinoLogger.trace(data, message);
      } else {
        pinoLogger.trace(message);
      }
    },

    debug(message: string, data?: KoriLogData): void {
      if (data !== undefined) {
        pinoLogger.debug(data, message);
      } else {
        pinoLogger.debug(message);
      }
    },

    info(message: string, data?: KoriLogData): void {
      if (data !== undefined) {
        pinoLogger.info(data, message);
      } else {
        pinoLogger.info(message);
      }
    },

    warn(message: string, data?: KoriLogData): void {
      if (data !== undefined) {
        pinoLogger.warn(data, message);
      } else {
        pinoLogger.warn(message);
      }
    },

    error(message: string, data?: KoriLogData): void {
      if (data !== undefined) {
        pinoLogger.error(data, message);
      } else {
        pinoLogger.error(message);
      }
    },

    fatal(message: string, data?: KoriLogData): void {
      if (data !== undefined) {
        pinoLogger.fatal(data, message);
      } else {
        pinoLogger.fatal(message);
      }
    },

    child(name: string, bindings: Record<string, unknown> = {}): KoriLogger {
      const childPino = pinoLogger.child({ name, ...bindings });
      return createPinoLoggerImpl(childPino);
    },
  };
}

export function createPinoKoriLoggerFactory(
  options?: Omit<pino.LoggerOptions, 'serializers'> & {
    level?: KoriLogLevel;
    serializers?: KoriLogSerializers;
  },
): KoriLoggerFactory {
  const koriLevel = options?.level;
  const pinoLevel = koriLevel ? PINO_LEVEL_MAP[koriLevel] : 'info';

  const koriSerializers = options?.serializers ?? {};
  const pinoSerializers: Record<string, pino.SerializerFn> = {};
  for (const [key, serializer] of Object.entries(koriSerializers)) {
    if (serializer) {
      pinoSerializers[key] = serializer;
    }
  }

  const basePinoOptions: pino.LoggerOptions = {
    ...options,
    level: pinoLevel,
    serializers: pinoSerializers,
  };

  return (name: string) => {
    const pinoOptions = { ...basePinoOptions, name };
    const pinoLogger = pino(pinoOptions);
    return createPinoLoggerImpl(pinoLogger);
  };
}
