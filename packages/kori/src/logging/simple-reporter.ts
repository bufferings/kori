import { type KoriLogEntry, type KoriReporter } from './logger.js';

export function createConsoleReporter(filter: (entry: KoriLogEntry) => boolean = () => true): KoriReporter {
  return (entry: KoriLogEntry) => {
    if (!filter(entry)) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  };
}
