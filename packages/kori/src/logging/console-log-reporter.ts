import { type KoriLogEntry, type KoriLogReporter } from './logger.js';

export function createConsoleReporter(filter?: (entry: KoriLogEntry) => boolean): KoriLogReporter {
  return (entry: KoriLogEntry) => {
    if (!filter?.(entry)) {
      return;
    }

    try {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry));
    } catch (error) {
      // Fallback for serialization errors (e.g., circular references)
      // eslint-disable-next-line no-console
      console.log(
        `[LOG] ${entry.time} ${entry.level.toUpperCase()} [${entry.channel}:${entry.name}] ${entry.message}`,
        {
          serialization_error: error instanceof Error ? error.message : String(error),
          data: '[Object with serialization issues]',
        },
      );
    }
  };
}
