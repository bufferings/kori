import { applyKoriLogSerializers, defaultKoriLogSerializers } from './log-serializers.js';
import { type KoriLogSerializers } from './log-serializers.js';
import { type KoriLogData, type KoriLogger, type KoriLogLevel } from './logger.js';
import { type KoriLoggerFactory } from './wrap-logger.js';

const LOG_LEVELS: Record<KoriLogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

function createJsonLogEntry(
  level: KoriLogLevel,
  message: string,
  name: string,
  bindings: object,
  data: KoriLogData | undefined,
  serializers: KoriLogSerializers,
): object {
  const baseEntry = {
    level,
    time: Date.now(),
    name,
    message,
    ...bindings,
  };

  if (!data) {
    return baseEntry;
  }

  const serializedData = applyKoriLogSerializers(data, serializers);
  if (typeof serializedData === 'object' && serializedData !== null) {
    return {
      ...baseEntry,
      ...serializedData,
    };
  } else {
    return {
      ...baseEntry,
      data: serializedData,
    };
  }
}

function createSimpleLogger(options: {
  name: string;
  level: KoriLogLevel;
  serializers: KoriLogSerializers;
  bindings: object;
}): KoriLogger {
  function log(level: KoriLogLevel, message: string, data?: KoriLogData): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[options.level]) {
      return;
    }

    const logEntry = createJsonLogEntry(level, message, options.name, options.bindings, data, options.serializers);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry));
  }

  function isLevelEnabled(level: KoriLogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[options.level];
  }

  return {
    trace: (message: string, data?: KoriLogData) => log('trace', message, data),
    debug: (message: string, data?: KoriLogData) => log('debug', message, data),
    info: (message: string, data?: KoriLogData) => log('info', message, data),
    warn: (message: string, data?: KoriLogData) => log('warn', message, data),
    error: (message: string, data?: KoriLogData) => log('error', message, data),
    fatal: (message: string, data?: KoriLogData) => log('fatal', message, data),

    isLevelEnabled,

    child: (childName: string, childBindings: Record<string, unknown> = {}) => {
      return createSimpleLogger({
        name: childName,
        level: options.level,
        serializers: options.serializers,
        bindings: { ...options.bindings, ...childBindings },
      });
    },
  };
}

export type KoriSimpleLoggerOptions = {
  level?: KoriLogLevel;
  serializers?: KoriLogSerializers;
  bindings?: Record<string, unknown>;
};

export function createKoriSimpleLoggerFactory(options?: {
  level?: KoriLogLevel;
  serializers?: KoriLogSerializers;
  bindings?: Record<string, unknown>;
}): KoriLoggerFactory {
  return (name: string) =>
    createSimpleLogger({
      name,
      level: options?.level ?? 'info',
      serializers: { ...defaultKoriLogSerializers, ...options?.serializers },
      bindings: options?.bindings ?? {},
    });
}
