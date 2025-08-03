/**
 * Safely serializes error objects for logging purposes.
 * Handles Error instances, unknown values, and prevents information loss.
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
