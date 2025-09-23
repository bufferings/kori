import { type KoriLoggerFactory } from './logger-factory.js';
import { type KoriLogger } from './logger.js';

/**
 * Logger channel constants for Kori framework.
 *
 * Provides standardized channel names for organizing log output:
 * - APP: Application-level logs (instance and request lifecycle)
 * - SYSTEM: Framework internal diagnostics
 * - PLUGIN_PREFIX: Namespace prefix for plugin-specific channels
 */
export const LoggerChannel = {
  APP: 'app',
  SYSTEM: 'sys',
  PLUGIN_PREFIX: 'plugin',
} as const;

/**
 * Logger name constants for Kori framework components.
 *
 * Provides standardized logger names for different framework lifecycle stages:
 * - INSTANCE: Kori instance startup, configuration, shutdown
 * - REQUEST: Individual HTTP request processing lifecycle
 */
export const LoggerName = {
  INSTANCE: 'instance',
  REQUEST: 'request',
} as const;

/**
 * Creates logger for Kori instance lifecycle events.
 * Used for application startup, configuration, and shutdown logs.
 *
 * @packageInternal Framework infrastructure
 *
 * @param loggerFactory - Factory that creates loggers scoped by channel and name
 * @returns Instance-scoped logger
 */
export function createInstanceLogger(loggerFactory: KoriLoggerFactory): KoriLogger {
  return loggerFactory({
    channel: LoggerChannel.APP,
    name: LoggerName.INSTANCE,
  });
}

/**
 * Creates logger for request handling lifecycle.
 * Used to track individual HTTP request processing.
 *
 * @packageInternal Framework infrastructure
 *
 * @param loggerFactory - Factory that creates loggers scoped by channel and name
 * @returns Request-scoped logger
 */
export function createRequestLogger(loggerFactory: KoriLoggerFactory): KoriLogger {
  return loggerFactory({
    channel: LoggerChannel.APP,
    name: LoggerName.REQUEST,
  });
}

/**
 * Creates system logger for framework internals.
 * Used for Kori's internal operations.
 *
 * Preserves all bindings from the base logger while redirecting to the system channel.
 *
 * @param options.baseLogger - Base logger to retarget to the system channel (preserves bindings)
 * @returns System-channel logger with inherited bindings
 */
export function createKoriSystemLogger(options: { baseLogger: KoriLogger }): KoriLogger {
  return options.baseLogger.channel(LoggerChannel.SYSTEM);
}

/**
 * Creates logger for plugin-specific operations.
 * Automatically namespaces under 'plugin.*' channel for organization.
 *
 * Preserves all bindings from the base logger while redirecting to the plugin channel.
 *
 * @param options.baseLogger - Base logger to retarget to the plugin channel (preserves bindings)
 * @param options.pluginName - Plugin name appended to the plugin channel
 * @returns Plugin-channel logger with inherited bindings
 */
export function createKoriPluginLogger(options: { baseLogger: KoriLogger; pluginName: string }): KoriLogger {
  const channelName = `${LoggerChannel.PLUGIN_PREFIX}.${options.pluginName}`;
  return options.baseLogger.channel(channelName);
}
