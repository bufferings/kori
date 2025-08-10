import { describe, expect, test } from 'vitest';

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
      expect(result.stack).toContain('Something went wrong');
    });

    test('should serialize TypeError with correct name', () => {
      const error = new TypeError('Type mismatch');
      const result = serializeError(error);

      expect(result).toEqual({
        name: 'TypeError',
        message: 'Type mismatch',
        stack: expect.any(String),
      });
    });

    test('should serialize RangeError with correct name', () => {
      const error = new RangeError('Value out of range');
      const result = serializeError(error);

      expect(result).toEqual({
        name: 'RangeError',
        message: 'Value out of range',
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
        cause: {
          type: 'string',
          value: 'String cause',
        },
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
  });

  describe('non-Error objects', () => {
    test('should serialize plain objects', () => {
      const obj = { type: 'validation', field: 'email', code: 'INVALID_FORMAT' };
      const result = serializeError(obj);

      expect(result).toEqual({
        type: 'non-error-object',
        value: { type: 'validation', field: 'email', code: 'INVALID_FORMAT' },
      });
    });

    test('should serialize objects with nested properties', () => {
      const obj = {
        message: 'Custom error',
        details: {
          field: 'password',
          constraints: ['minLength', 'hasSpecialChar'],
        },
        timestamp: 1640995200000,
      };
      const result = serializeError(obj);

      expect(result).toEqual({
        type: 'non-error-object',
        value: obj,
      });
    });

    test('should handle objects with methods', () => {
      const obj = {
        name: 'CustomError',
        getMessage() {
          return 'Dynamic message';
        },
      };
      const result = serializeError(obj);

      expect(result).toEqual({
        type: 'non-error-object',
        value: { name: 'CustomError', getMessage: expect.any(Function) },
      });
    });

    test('should handle empty objects', () => {
      const result = serializeError({});

      expect(result).toEqual({
        type: 'non-error-object',
        value: {},
      });
    });
  });

  describe('primitive values', () => {
    test('should serialize string values', () => {
      const result = serializeError('Simple error message');

      expect(result).toEqual({
        type: 'string',
        value: 'Simple error message',
      });
    });

    test('should serialize number values', () => {
      const result = serializeError(404);

      expect(result).toEqual({
        type: 'number',
        value: 404,
      });
    });

    test('should serialize boolean values', () => {
      const result = serializeError(false);

      expect(result).toEqual({
        type: 'boolean',
        value: false,
      });
    });

    test('should serialize undefined', () => {
      const result = serializeError(undefined);

      expect(result).toEqual({
        type: 'undefined',
        value: undefined,
      });
    });

    test('should serialize null', () => {
      const result = serializeError(null);

      expect(result).toEqual({
        type: 'object',
        value: null,
      });
    });

    test('should serialize bigint values', () => {
      const result = serializeError(BigInt(123));

      expect(result).toEqual({
        type: 'bigint',
        value: BigInt(123),
      });
    });

    test('should serialize symbol values', () => {
      const sym = Symbol('test');
      const result = serializeError(sym);

      expect(result).toEqual({
        type: 'symbol',
        value: sym,
      });
    });
  });

  describe('edge cases', () => {
    test('should handle circular references in non-Error objects', () => {
      const circular: Record<string, unknown> = { name: 'circular' };
      circular.self = circular;

      const result = serializeError(circular);

      expect(result).toEqual({
        type: 'non-error-object',
        value: expect.objectContaining({ name: 'circular', self: expect.any(Object) }),
      });
    });

    test('should handle arrays as errors', () => {
      const arrayError = ['error', 'with', 'multiple', 'parts'];
      const result = serializeError(arrayError);

      expect(result).toEqual({
        type: 'non-error-object',
        value: {
          '0': 'error',
          '1': 'with',
          '2': 'multiple',
          '3': 'parts',
        },
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
      });
    });

    test('should handle Error with additional properties', () => {
      const error = new Error('Enhanced error');
      (error as Error & { code: string; statusCode: number }).code = 'E_VALIDATION';
      (error as Error & { code: string; statusCode: number }).statusCode = 400;

      const result = serializeError(error);

      // Should only serialize standard Error properties
      expect(result).toEqual({
        name: 'Error',
        message: 'Enhanced error',
        stack: expect.any(String),
      });
      expect(result).not.toHaveProperty('code');
      expect(result).not.toHaveProperty('statusCode');
    });
  });
});
