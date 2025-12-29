import { describe, expect, test } from 'vitest';

import { KoriValidationConfigError } from '../../src/error/index.js';

import { serializeError } from '../../src/logging/error-serializer.js';

describe('serializeError', () => {
  describe('Error instances', () => {
    test('should serialize basic Error with name and message', () => {
      const error = new Error('Something went wrong');
      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'Something went wrong',
        stack: expect.any(String),
      });
    });

    test('should handle Error without stack trace', () => {
      const error = new Error('No stack');
      delete (error as Error & { stack?: string }).stack;

      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'No stack',
      });
      expect(result).not.toHaveProperty('stack');
    });

    test('should handle Error with empty message', () => {
      const error = new Error('');
      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: '',
        stack: expect.any(String),
      });
    });

    test('should handle custom Error subclasses', () => {
      class CustomError extends Error {
        public code: string;

        constructor(message: string, code: string) {
          super(message);
          this.name = 'CustomError';
          this.code = code;
        }
      }

      const error = new CustomError('Custom error occurred', 'E_CUSTOM');
      const result = serializeError(error);

      expect(result).toEqual({
        name: 'CustomError',
        message: 'Custom error occurred',
        stack: expect.any(String),
        code: 'E_CUSTOM',
      });
    });

    test('should handle Error with additional properties', () => {
      const error = new Error('Database connection failed');
      (error as Error & { code: string; retryCount: number }).code = 'DB_CONNECTION_ERROR';
      (error as Error & { code: string; retryCount: number }).retryCount = 3;

      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'Database connection failed',
        stack: expect.any(String),
        code: 'DB_CONNECTION_ERROR',
        retryCount: 3,
      });
    });

    test('should handle KoriValidationConfigError', () => {
      const validationError = new KoriValidationConfigError('Invalid schema mapping', {
        data: { provider: 'zod', reason: 'missing content type' },
      });

      const result = serializeError(validationError);

      expect(result).toEqual({
        name: 'KoriValidationConfigError',
        message: 'Invalid schema mapping',
        stack: expect.any(String),
        code: 'VALIDATION_CONFIG_ERROR',
        data: { provider: 'zod', reason: 'missing content type' },
      });
    });

    test('should exclude function properties from Error', () => {
      const error = new Error('Error with methods');
      (error as Error & { helper: () => string; data: string }).helper = () => 'help';
      (error as Error & { helper: () => string; data: string }).data = 'important';

      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'Error with methods',
        stack: expect.any(String),
        data: 'important',
      });
      expect(result).not.toHaveProperty('helper');
    });

    test('should not include prototype chain properties', () => {
      class ErrorWithPrototype extends Error {
        public ownProp = 'own';
      }
      // Add enumerable property to prototype
      Object.defineProperty(ErrorWithPrototype.prototype, 'protoProp', {
        value: 'proto',
        enumerable: true,
      });

      const error = new ErrorWithPrototype('test');
      const result = serializeError(error) as Record<string, unknown>;

      expect(result.ownProp).toBe('own');
      expect(result).not.toHaveProperty('protoProp');
    });

    test('should return fallback when getter throws an error', () => {
      const error = new Error('test');
      // Add an enumerable getter that throws
      Object.defineProperty(error, 'badGetter', {
        enumerable: true,
        get() {
          throw new Error('getter exploded');
        },
      });

      const result = serializeError(error) as Record<string, unknown>;

      expect(result).toEqual({
        type: 'serialization-error',
        name: 'Error',
        message: 'test',
      });
    });
  });

  describe('Error cause chains (ES2022)', () => {
    test('should serialize Error with cause property', () => {
      const rootCause = new TypeError('Type validation failed');
      const error = new Error('Processing failed', { cause: rootCause });

      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'Processing failed',
        stack: expect.any(String),
        cause: {
          name: 'TypeError',
          message: 'Type validation failed',
          stack: expect.any(String),
        },
      });
    });

    test('should handle nested cause chains', () => {
      const deepCause = new Error('Deep error');
      const middleCause = new Error('Middle error', { cause: deepCause });
      const topError = new Error('Top error', { cause: middleCause });

      const result = serializeError(topError);

      expect(result).toEqual({
        name: 'Error',
        message: 'Top error',
        stack: expect.any(String),
        cause: {
          name: 'Error',
          message: 'Middle error',
          stack: expect.any(String),
          cause: {
            name: 'Error',
            message: 'Deep error',
            stack: expect.any(String),
          },
        },
      });
    });

    test('should handle cause that is not an Error instance', () => {
      const error = new Error('Main error');
      (error as Error & { cause: unknown }).cause = 'String cause';

      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'Main error',
        stack: expect.any(String),
        cause: 'String cause',
      });
    });

    test('should handle undefined cause', () => {
      const error = new Error('Main error');
      (error as Error & { cause: unknown }).cause = undefined;

      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'Main error',
        stack: expect.any(String),
      });
      expect(result).not.toHaveProperty('cause');
    });

    test('should handle circular cause references', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error', { cause: error1 });
      (error1 as Error & { cause: unknown }).cause = error2;

      const result = serializeError(error1);

      expect(result).toEqual({
        name: 'Error',
        message: 'First error',
        stack: expect.any(String),
        cause: {
          name: 'Error',
          message: 'Second error',
          stack: expect.any(String),
          cause: {
            type: 'circular-reference',
          },
        },
      });
    });
  });

  describe('non-Error objects', () => {
    test('should return plain objects unchanged', () => {
      const obj = { type: 'validation', field: 'email', code: 'INVALID_FORMAT' };
      const result = serializeError(obj);

      expect(result).toEqual(obj);
    });

    test('should return objects with methods unchanged', () => {
      const obj = {
        name: 'CustomError',
        getMessage() {
          return 'Dynamic message';
        },
      };
      const result = serializeError(obj);

      expect(result).toEqual({ name: 'CustomError', getMessage: expect.any(Function) });
    });

    test('should return empty objects unchanged', () => {
      const result = serializeError({});

      expect(result).toEqual({});
    });
  });

  describe('primitive values', () => {
    test('should return string values unchanged', () => {
      const result = serializeError('Simple error message');

      expect(result).toEqual('Simple error message');
    });

    test('should return number values unchanged', () => {
      const result = serializeError(404);

      expect(result).toEqual(404);
    });

    test('should return null unchanged', () => {
      const result = serializeError(null);

      expect(result).toEqual(null);
    });
  });
});
