import { type KoriLogger, type KoriLoggerFactory } from './logger.js';

const DEFAULT_LOG_CHANNEL = 'app';
const SYS_LOGGER_CHANNEL = 'sys';
const INSTANCE_LOGGER_NAME = 'instance';
const HANDLER_LOGGER_NAME = 'request';
const PLUGIN_LOGGER_CHANNEL_PREFIX = 'plugin';

export const KoriLoggerUtils = {
  DEFAULT_LOG_CHANNEL,
  SYS_LOGGER_CHANNEL,
  INSTANCE_LOGGER_NAME,
  HANDLER_LOGGER_NAME,
  PLUGIN_LOGGER_CHANNEL_PREFIX,

  createInstanceLogger(loggerFactory: KoriLoggerFactory) {
    return loggerFactory({
      channel: DEFAULT_LOG_CHANNEL,
      name: INSTANCE_LOGGER_NAME,
    });
  },

  createRequestLogger(loggerFactory: KoriLoggerFactory) {
    return loggerFactory({
      channel: DEFAULT_LOG_CHANNEL,
      name: HANDLER_LOGGER_NAME,
    });
  },

  createSysLogger(options: { logger: KoriLogger }) {
    return options.logger.channel(SYS_LOGGER_CHANNEL);
  },

  createPluginLogger(options: { logger: KoriLogger; pluginName: string }) {
    const channelName = `${PLUGIN_LOGGER_CHANNEL_PREFIX}.${options.pluginName}`;
    return options.logger.channel(channelName);
  },
} as const;
