import { type KoriRequest, type KoriResponse } from '../context/index.js';

export type KoriLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type KoriLogData = {
  req?: KoriRequest;
  res?: KoriResponse;
  err?: unknown;
  [key: string]: unknown;
};

export type KoriLogger = {
  trace(message: string, data?: KoriLogData): void;
  debug(message: string, data?: KoriLogData): void;
  info(message: string, data?: KoriLogData): void;
  warn(message: string, data?: KoriLogData): void;
  error(message: string, data?: KoriLogData): void;
  fatal(message: string, data?: KoriLogData): void;

  child(name: string, bindings?: Record<string, unknown>): KoriLogger;
};
