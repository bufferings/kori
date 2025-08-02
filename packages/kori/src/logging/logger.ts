export type KoriLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const SYS_CHANNEL = 'sys' as const;

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

export type KoriReporter = (entry: KoriLogEntry) => void;

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
