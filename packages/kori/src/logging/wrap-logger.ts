import { type KoriLogger, type KoriLogData } from './logger.js';

export type KoriLoggerFactory = (name: string) => KoriLogger;

function wrapLogger(logger: KoriLogger, name: string): KoriLogger {
  return {
    trace: (message: string, data?: KoriLogData) => logger.trace(message, data),
    debug: (message: string, data?: KoriLogData) => logger.debug(message, data),
    info: (message: string, data?: KoriLogData) => logger.info(message, data),
    warn: (message: string, data?: KoriLogData) => logger.warn(message, data),
    error: (message: string, data?: KoriLogData) => logger.error(message, data),
    fatal: (message: string, data?: KoriLogData) => logger.fatal(message, data),

    child(childName: string, bindings?: Record<string, unknown>): KoriLogger {
      const combinedName = `${name}.${childName}`;
      return wrapLogger(logger.child(combinedName, bindings), combinedName);
    },
  };
}

export function wrapKoriLogger({
  loggerFactory,
  name = 'root',
}: {
  loggerFactory: KoriLoggerFactory;
  name?: string;
}): KoriLogger {
  return wrapLogger(loggerFactory(name), name);
}
