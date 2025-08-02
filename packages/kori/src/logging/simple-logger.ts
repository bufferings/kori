import { applyKoriLogSerializers, defaultKoriLogSerializers } from './log-serializers.js';
import { type KoriLogSerializers } from './log-serializers.js';
import {
  type KoriLogData,
  type KoriLogger,
  type KoriLogLevel,
  type KoriLoggerFactory,
  type KoriReporter,
} from './logger.js';
import { createConsoleReporter } from './simple-reporter.js';

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

function createSimpleLogger(options: {
  channel: string;
  name: string;
  level: KoriLogLevel;
  serializers: KoriLogSerializers;
  bindings: Record<string, unknown>;
  reporters: KoriReporter[];
  sharedBindings?: Record<string, unknown>; // shared context reference
}): KoriLogger {
  function log(level: KoriLogLevel, message: string, data?: KoriLogData): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[options.level]) {
      return;
    }

    const allBindings = {
      ...options.bindings,
      ...(options.sharedBindings || {}),
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
      return createSimpleLogger({
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
      return createSimpleLogger({
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
      if (options.sharedBindings) {
        Object.assign(options.sharedBindings, newBindings);
      }
      return createSimpleLogger({
        channel: options.channel,
        name: options.name,
        level: options.level,
        serializers: options.serializers,
        bindings: { ...options.bindings, ...newBindings },
        reporters: options.reporters,
        sharedBindings: options.sharedBindings,
      });
    },
  };
}

export type KoriSimpleLoggerOptions = {
  level?: KoriLogLevel;
  serializers?: KoriLogSerializers;
  bindings?: Record<string, unknown>;
  reporters?: KoriReporter[];
};

export function createKoriSimpleLoggerFactory(options?: KoriSimpleLoggerOptions): KoriLoggerFactory {
  const defaultReporters = [createConsoleReporter()];

  return (meta: { channel: string; name: string }) => {
    const sharedBindings = {}; // Create shared object per request/instance
    return createSimpleLogger({
      channel: meta.channel,
      name: meta.name,
      level: options?.level ?? 'info',
      serializers: { ...defaultKoriLogSerializers, ...options?.serializers },
      bindings: options?.bindings ?? {},
      reporters: options?.reporters ?? defaultReporters,
      sharedBindings,
    });
  };
}
