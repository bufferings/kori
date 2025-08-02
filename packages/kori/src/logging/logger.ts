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
  trace(message: string, data?: KoriLogData): void;
  debug(message: string, data?: KoriLogData): void;
  info(message: string, data?: KoriLogData): void;
  warn(message: string, data?: KoriLogData): void;
  error(message: string, data?: KoriLogData): void;
  fatal(message: string, data?: KoriLogData): void;

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
  if (typeof serializedData === 'object' && serializedData !== null) {
    return {
      ...baseEntry,
      data: { ...bindings, ...serializedData },
    };
  } else {
    return {
      ...baseEntry,
      data: { ...bindings, data: serializedData },
    };
  }
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
  function log(level: KoriLogLevel, message: string, data?: KoriLogData): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[options.level]) {
      return;
    }

    const allBindings = {
      ...options.bindings,
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

  return {
    trace: (message: string, data?: KoriLogData) => log('trace', message, data),
    debug: (message: string, data?: KoriLogData) => log('debug', message, data),
    info: (message: string, data?: KoriLogData) => log('info', message, data),
    warn: (message: string, data?: KoriLogData) => log('warn', message, data),
    error: (message: string, data?: KoriLogData) => log('error', message, data),
    fatal: (message: string, data?: KoriLogData) => log('fatal', message, data),

    isLevelEnabled,

    child: (childName: string, childBindings: Record<string, unknown> = {}) => {
      const combinedName = options.name ? `${options.name}.${childName}` : childName;
      return createKoriLogger({
        channel: options.channel,
        name: combinedName,
        level: options.level,
        serializers: options.serializers,
        bindings: { ...options.bindings, ...childBindings },
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
        bindings: options.bindings,
        reporters: options.reporters,
        sharedBindings: options.sharedBindings,
      });
    },

    addBindings: (newBindings: Record<string, unknown>) => {
      // Create a new sharedBindings object to avoid modifying the original
      const newSharedBindings = {
        ...(options.sharedBindings ?? {}),
        ...newBindings,
      };
      return createKoriLogger({
        channel: options.channel,
        name: options.name,
        level: options.level,
        serializers: options.serializers,
        bindings: { ...options.bindings, ...newBindings },
        reporters: options.reporters,
        sharedBindings: newSharedBindings,
      });
    },
  };
}

export type KoriLoggerOptions = {
  level?: KoriLogLevel;
  serializers?: KoriLogSerializers;
  bindings?: Record<string, unknown>;
  reporters?: KoriLogReporter[];
};

export function createKoriLoggerFactory(options?: KoriLoggerOptions): KoriLoggerFactory {
  return (meta: { channel: string; name: string }) => {
    const sharedBindings = {};
    return createKoriLogger({
      channel: meta.channel,
      name: meta.name,
      level: options?.level ?? 'info',
      serializers: { ...defaultKoriLogSerializers, ...options?.serializers },
      bindings: options?.bindings ?? {},
      reporters: options?.reporters ?? [createConsoleReporter()],
      sharedBindings,
    });
  };
}
