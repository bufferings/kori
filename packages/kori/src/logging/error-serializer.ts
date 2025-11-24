/**
 * Function that serializes error values for safe logging.
 *
 * @param error - Any value that might be an error
 * @returns Serialized representation safe for logging
 */
export type KoriErrorSerializer = (error: unknown) => unknown;

function serializeErrorInstance(options: { error: Error; visited: Set<Error> }): Record<string, unknown> {
  const { error, visited } = options;

  // Circular reference check
  if (visited.has(error)) {
    return { type: 'circular-reference' };
  }

  visited.add(error);
  const serialized: Record<string, unknown> = {};

  // Add standard Error properties (non-enumerable)
  if (error.name) {
    serialized.name = error.name;
  }
  if (error.message !== undefined) {
    serialized.message = error.message;
  }
  if (error.stack) {
    serialized.stack = error.stack;
  }

  // Handle cause property explicitly (might be non-enumerable)
  if ('cause' in error && error.cause !== undefined) {
    if (error.cause instanceof Error) {
      serialized.cause = serializeErrorInstance({ error: error.cause, visited });
    } else {
      serialized.cause = error.cause; // Primitive values and objects directly
    }
  }

  // Get all enumerable properties including custom ones
  for (const key in error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const value = (error as any)[key];
    if (typeof value !== 'function' && key !== 'cause') {
      serialized[key] = value;
    }
  }

  return serialized;
}

/**
 * Serializes Error instances for safe logging, with fallback for non-Error values.
 *
 * Error Processing: Converts Error objects to serializable format preserving
 * standard properties (name, message, stack), custom properties, and ES2022 cause
 * chains with circular reference protection.
 *
 * Non-Error Values: Returns the value unchanged, allowing primitives and
 * objects to be logged directly.
 *
 * @param error - Any value that might be an error (typically from catch blocks)
 * @returns For Error instances: serialized object; for others: the original value
 *
 * @example
 * ```typescript
 * // Error serialization
 * try {
 *   throw new Error('Database failed', { cause: new Error('Connection timeout') });
 * } catch (e) {
 *   req.log().error('Database operation failed', { err: serializeError(e) });
 *   // err metadata: { name: 'Error', message: 'Database failed',
 *   //                cause: { name: 'Error', message: 'Connection timeout', stack: '...' } }
 * }
 *
 * // Non-Error values pass through unchanged
 * serializeError('simple string');    // Returns: 'simple string'
 * serializeError({ code: 404 });      // Returns: { code: 404 }
 * serializeError(null);               // Returns: null
 * ```
 */
export function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  return serializeErrorInstance({ error, visited: new Set<Error>() });
}
