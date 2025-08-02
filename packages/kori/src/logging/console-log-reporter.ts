import { type KoriLogEntry, type KoriLogReporter } from './logger.js';

export function createConsoleReporter(filter: (entry: KoriLogEntry) => boolean = () => true): KoriLogReporter {
  return (entry: KoriLogEntry) => {
    if (!filter(entry)) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  };
}
