/**
 * Type definition for a custom error serializer function.
 * Consumers can provide their own implementation to customize how errors are serialized for logging.
 */
export type KoriErrorSerializer = (error: unknown) => Record<string, unknown>;

/**
 * Default implementation for safely serializing error objects for logging metadata.
 *
 * Handles Error instances, unknown values, and prevents information loss
 * by extracting key properties and recursively processing error chains.
 * Used when no custom error serializer is provided to the logger factory.
 *
 * @param error - Any value that might be an error
 * @returns Serializable object representing the error
 *
 * @example
 * ```typescript
 * try {
 *   throw new Error('Something went wrong', { cause: new TypeError('Type mismatch') });
 * } catch (e) {
 *   const serialized = serializeError(e);
 *   // { name: 'Error', message: 'Something went wrong', cause: { name: 'TypeError', ... } }
 * }
 * ```
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    // Include stack trace if available
    if (error.stack) {
      serialized.stack = error.stack;
    }

    // Include cause if available (ES2022 Error cause)
    if ('cause' in error && error.cause !== undefined) {
      serialized.cause = serializeError(error.cause);
    }

    return serialized;
  }

  // Handle non-Error objects
  if (error !== null && typeof error === 'object') {
    return {
      type: 'non-error-object',
      value: { ...error },
    };
  }

  // Handle primitives and null
  return {
    type: typeof error,
    value: error,
  };
}
