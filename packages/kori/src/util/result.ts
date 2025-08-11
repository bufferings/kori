/**
 * Success result containing a value.
 *
 * @template T - The success value type
 */
export type KoriOk<T> = { ok: true; value: T };

/**
 * Error result containing an error.
 *
 * @template E - The error type
 */
export type KoriErr<E> = { ok: false; error: E };

/**
 * Result type for operations that can succeed or fail.
 *
 * Provides type-safe error handling without throwing exceptions.
 * Use the `ok` property to check if the operation succeeded.
 *
 * @template T - The success value type
 * @template E - The error type
 *
 * @example
 * ```typescript
 * function parseNumber(str: string): KoriResult<number, string> {
 *   const num = parseInt(str);
 *   if (isNaN(num)) {
 *     return err('Invalid number');
 *   }
 *   return ok(num);
 * }
 *
 * const result = parseNumber('42');
 * if (result.ok) {
 *   console.log(result.value); // 42
 * } else {
 *   console.log(result.error); // error message
 * }
 * ```
 */
export type KoriResult<T, E> = KoriOk<T> | KoriErr<E>;

/**
 * Creates a success result.
 *
 * @template T - The value type
 * @param value - The success value
 * @returns Success result containing the value
 */
export function ok<T>(value: T): KoriOk<T> {
  return { ok: true, value };
}

/**
 * Creates an error result.
 *
 * @template E - The error type
 * @param error - The error value
 * @returns Error result containing the error
 */
export function err<E>(error: E): KoriErr<E> {
  return { ok: false, error };
}
