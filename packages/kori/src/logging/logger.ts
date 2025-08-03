import { createConsoleReporter } from './console-log-reporter.js';

export type KoriLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type KoriLogMeta = Record<string, unknown>;
export type KoriLogMetaFactory = () => KoriLogMeta | undefined;
export type KoriLogMetaOrFactory = KoriLogMeta | KoriLogMetaFactory;

export type KoriLogEntry = {
  time: number;
  level: KoriLogLevel;
  channel: string;
  name: string;
  message: string;
  meta?: Record<string, unknown>;
};

export type KoriLogReporter = (entry: KoriLogEntry) => void;

export type KoriLoggerFactory = (loggerOptions: { channel: string; name: string }) => KoriLogger;

export type KoriLogger = {
  debug(message: string, meta?: KoriLogMetaOrFactory): void;
  info(message: string, meta?: KoriLogMetaOrFactory): void;
  warn(message: string, meta?: KoriLogMetaOrFactory): void;
  error(message: string, meta?: KoriLogMetaOrFactory): void;
  fatal(message: string, meta?: KoriLogMetaOrFactory): void;

  isLevelEnabled(level: KoriLogLevel): boolean;

  channel(channelName: string): KoriLogger;
  child(options: { name: string; channelName?: string; bindings?: Record<string, unknown> }): KoriLogger;
  addBindings(bindings: Record<string, unknown>): KoriLogger;
};

const LOG_LEVELS: Record<KoriLogLevel, number> = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

function createLogEntry({
  level,
  channel,
  name,
  message,
  bindings,
  meta,
}: {
  level: KoriLogLevel;
  channel: string;
  name: string;
  message: string;
  bindings: Record<string, unknown>;
  meta?: KoriLogMeta;
}): KoriLogEntry {
  return {
    time: Date.now(),
    level,
    channel,
    name,
    message,
    meta: { ...bindings, ...(meta ?? {}) },
  };
}

function createKoriLogger(options: {
  channel: string;
  name: string;
  level: KoriLogLevel;
  bindings: Record<string, unknown>;
  reporters: KoriLogReporter[];
}): KoriLogger {
  let _bindings = { ...options.bindings };

  function isLevelEnabled(level: KoriLogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[options.level];
  }

  function log(level: KoriLogLevel, message: string, metaOrFactory?: KoriLogMetaOrFactory): void {
    if (!isLevelEnabled(level)) {
      return;
    }

    // Resolve factory function lazily only when logging is enabled
    const meta = typeof metaOrFactory === 'function' ? metaOrFactory() : metaOrFactory;

    const logEntry = createLogEntry({
      level,
      channel: options.channel,
      name: options.name,
      message,
      bindings: _bindings,
      meta,
    });

    for (const reporter of options.reporters) {
      try {
        reporter(logEntry);
      } catch {
        // We can't do anything about this, so we just ignore it
      }
    }
  }

  function createChildName({ parentName, childName }: { parentName: string; childName: string }): string {
    return parentName ? `${parentName}.${childName}` : childName;
  }

  const logger: KoriLogger = {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    fatal: (message, meta) => log('fatal', message, meta),

    isLevelEnabled,

    channel: (channelName) => {
      return createKoriLogger({
        channel: channelName,
        name: options.name,
        level: options.level,
        bindings: _bindings,
        reporters: options.reporters,
      });
    },

    child: (childOptions) => {
      return createKoriLogger({
        channel: childOptions.channelName ?? options.channel,
        name: createChildName({ parentName: options.name, childName: childOptions.name }),
        level: options.level,
        bindings: { ..._bindings, ...childOptions.bindings },
        reporters: options.reporters,
      });
    },

    addBindings: (bindings) => {
      _bindings = { ..._bindings, ...bindings };
      return logger; // Return self for chaining
    },
  };

  return logger;
}

export type KoriLoggerOptions = {
  level?: KoriLogLevel;
  bindings?: Record<string, unknown>;
  reporters?: KoriLogReporter[];
};

export function createKoriLoggerFactory({ level, bindings, reporters }: KoriLoggerOptions = {}): KoriLoggerFactory {
  return ({ channel, name }: { channel: string; name: string }) => {
    return createKoriLogger({
      channel,
      name,
      level: level ?? 'info',
      bindings: bindings ?? {},
      reporters: reporters ?? [createConsoleReporter()],
    });
  };
}
