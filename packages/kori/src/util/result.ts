/**
 * Success result containing a value.
 *
 * @template V - The success value type
 */
export type KoriSuccess<V> = { success: true; value: V };

/**
 * Failure result containing a reason.
 *
 * @template R - The failure reason type
 */
export type KoriFailure<R> = { success: false; reason: R };

/**
 * Result type for operations that can succeed or fail.
 *
 * Provides type-safe failure handling without throwing errors.
 * Use the `success` property to check if the operation succeeded.
 *
 * @template V - The success value type
 * @template R - The reason type
 *
 * @example
 * ```typescript
 * function parseNumber(str: string): KoriResult<number, string> {
 *   const num = parseInt(str);
 *   if (isNaN(num)) {
 *     return fail('Invalid number');
 *   }
 *   return succeed(num);
 * }
 *
 * const result = parseNumber('42');
 * if (result.success) {
 *   const n = result.value;
 *   // use n
 * } else {
 *   const reason = result.reason;
 *   // handle failure
 * }
 * ```
 */
export type KoriResult<V, R> = KoriSuccess<V> | KoriFailure<R>;

/**
 * Creates a success result.
 *
 * @template V - The value type
 * @param value - The success value
 * @returns Success result containing the value
 */
export function succeed<V>(value: V): KoriSuccess<V> {
  return { success: true, value };
}

/**
 * Creates a failure result.
 *
 * @template R - The failure reason type
 * @param reason - The failure reason
 * @returns Failure result containing the failure reason
 */
export function fail<R>(reason: R): KoriFailure<R> {
  return { success: false, reason };
}
