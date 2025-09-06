import { type KoriLogEntry } from './log-entry.js';

/**
 * Function that determines whether a log entry should be processed.
 *
 * @param entry - Log entry to evaluate for filtering
 * @returns `true` if entry should be processed, `false` to skip
 */
export type KoriLogFilter = (entry: KoriLogEntry) => boolean;
