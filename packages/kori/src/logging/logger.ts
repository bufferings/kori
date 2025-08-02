import { createConsoleReporter } from './console-log-reporter.js';
import { applyKoriLogSerializers, defaultKoriLogSerializers } from './log-serializers.js';
import { type KoriLogSerializers } from './log-serializers.js';

export const SYS_CHANNEL = 'sys' as const;

export type KoriLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type KoriLoggerMeta = {
  channel: string;
  name: string;
  bindings: Record<string, unknown>;
  level: KoriLogLevel;
};

export type KoriLogData = {
  err?: unknown;
  [key: string]: unknown;
};

export type KoriLogDataFactory = () => KoriLogData;
export type KoriLogDataOrFactory = KoriLogData | KoriLogDataFactory;

export type KoriLogEntry = {
  time: number;
  level: KoriLogLevel;
  channel: string;
  name: string;
  message: string;
  data?: Record<string, unknown>;
};

export type KoriLogReporter = (entry: KoriLogEntry) => void;

export type KoriLoggerFactory = (meta: { channel: string; name: string }) => KoriLogger;

export type KoriLogger = {
  trace(message: string, data?: KoriLogDataOrFactory): void;
  debug(message: string, data?: KoriLogDataOrFactory): void;
  info(message: string, data?: KoriLogDataOrFactory): void;
  warn(message: string, data?: KoriLogDataOrFactory): void;
  error(message: string, data?: KoriLogDataOrFactory): void;
  fatal(message: string, data?: KoriLogDataOrFactory): void;

  isLevelEnabled(level: KoriLogLevel): boolean;

  channel(channelName: string): KoriLogger;
  addBindings(bindings: Record<string, unknown>): KoriLogger;
  child(name: string, bindings?: Record<string, unknown>): KoriLogger;
};

const LOG_LEVELS: Record<KoriLogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

function createLogEntry(
  level: KoriLogLevel,
  message: string,
  channel: string,
  name: string,
  bindings: Record<string, unknown>,
  data: KoriLogData | undefined,
  serializers: KoriLogSerializers,
): {
  time: number;
  level: KoriLogLevel;
  channel: string;
  name: string;
  message: string;
  data?: Record<string, unknown>;
} {
  const baseEntry = {
    time: Date.now(),
    level,
    channel,
    name,
    message,
  };

  if (!data) {
    return baseEntry;
  }

  const serializedData = applyKoriLogSerializers(data, serializers);
  return {
    ...baseEntry,
    data: { ...bindings, data: serializedData },
  };
}

function createKoriLogger(options: {
  channel: string;
  name: string;
  level: KoriLogLevel;
  serializers: KoriLogSerializers;
  bindings: Record<string, unknown>;
  reporters: KoriLogReporter[];
  sharedBindings?: Record<string, unknown>; // shared context reference
}): KoriLogger {
  // Mutable bindings state for this logger instance
  const mutableBindings = { ...options.bindings };

  function log(level: KoriLogLevel, message: string, dataOrFactory?: KoriLogDataOrFactory): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[options.level]) {
      return;
    }

    // Resolve factory function lazily only when logging is enabled
    const data = typeof dataOrFactory === 'function' ? dataOrFactory() : dataOrFactory;

    const allBindings = {
      ...mutableBindings,
      ...(options.sharedBindings ?? {}),
    };
    const logEntry = createLogEntry(
      level,
      message,
      options.channel,
      options.name,
      allBindings,
      data,
      options.serializers,
    );

    for (const reporter of options.reporters) {
      try {
        reporter(logEntry);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Reporter error:', error);
      }
    }
  }

  function isLevelEnabled(level: KoriLogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[options.level];
  }

  const logger: KoriLogger = {
    trace: (message: string, data?: KoriLogDataOrFactory) => log('trace', message, data),
    debug: (message: string, data?: KoriLogDataOrFactory) => log('debug', message, data),
    info: (message: string, data?: KoriLogDataOrFactory) => log('info', message, data),
    warn: (message: string, data?: KoriLogDataOrFactory) => log('warn', message, data),
    error: (message: string, data?: KoriLogDataOrFactory) => log('error', message, data),
    fatal: (message: string, data?: KoriLogDataOrFactory) => log('fatal', message, data),

    isLevelEnabled,

    child: (childName: string, childBindings: Record<string, unknown> = {}) => {
      const combinedName = options.name ? `${options.name}.${childName}` : childName;
      return createKoriLogger({
        channel: options.channel,
        name: combinedName,
        level: options.level,
        serializers: options.serializers,
        bindings: { ...mutableBindings, ...childBindings },
        reporters: options.reporters,
        sharedBindings: options.sharedBindings,
      });
    },

    channel: (channelName: string) => {
      return createKoriLogger({
        channel: channelName,
        name: options.name,
        level: options.level,
        serializers: options.serializers,
        bindings: mutableBindings,
        reporters: options.reporters,
        sharedBindings: options.sharedBindings,
      });
    },

    addBindings: (newBindings: Record<string, unknown>) => {
      Object.assign(mutableBindings, newBindings);
      return logger; // Return self for chaining
    },
  };

  return logger;
}

export type KoriLoggerOptions = {
  level?: KoriLogLevel;
  serializers?: KoriLogSerializers;
  bindings?: Record<string, unknown>;
  reporters?: KoriLogReporter[];
};

export function createKoriLoggerFactory(options?: KoriLoggerOptions): KoriLoggerFactory {
  return (meta: { channel: string; name: string }) => {
    return createKoriLogger({
      channel: meta.channel,
      name: meta.name,
      level: options?.level ?? 'info',
      serializers: { ...defaultKoriLogSerializers, ...options?.serializers },
      bindings: options?.bindings ?? {},
      reporters: options?.reporters ?? [createConsoleReporter()],
      sharedBindings: undefined,
    });
  };
}
