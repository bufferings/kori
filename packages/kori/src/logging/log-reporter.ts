import { type KoriLogEntry } from './log-entry.js';

/**
 * Function that outputs log entries to a destination.
 * Should not throw errors as failures are silently ignored.
 */
export type KoriLogReporter = (entry: KoriLogEntry) => void;
