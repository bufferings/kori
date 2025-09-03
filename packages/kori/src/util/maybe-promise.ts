/**
 * Type that can be either synchronous or asynchronous.
 *
 * Useful for functions that can handle both sync and async operations
 * without requiring callers to always return promises.
 *
 * @template T - The value type
 *
 * @example
 * ```typescript
 * function processData(data: string): MaybePromise<number> {
 *   if (data.length < 10) {
 *     return data.length; // sync
 *   }
 *   return Promise.resolve(data.length); // async
 * }
 * ```
 */
export type MaybePromise<T> = T | Promise<T>;
