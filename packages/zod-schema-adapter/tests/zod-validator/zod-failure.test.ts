import { describe, test, expect } from 'vitest';

import { ZOD_SCHEMA_PROVIDER } from '../../src/zod-schema/index.js';
import {
  failWithZodGeneralFailure,
  failWithZodValidationFailure,
  isKoriZodFailure,
  isKoriZodGeneralFailure,
  isKoriZodValidationFailure,
  type KoriZodFailure,
} from '../../src/zod-validator/index.js';

describe('zod-failure utilities', () => {
  describe('failWithZodGeneralFailure', () => {
    test('creates general failure result', () => {
      const result = failWithZodGeneralFailure({
        message: 'Custom error',
        detail: 'Something went wrong',
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason).toEqual({
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Custom error',
        detail: 'Something went wrong',
      });
    });
  });

  describe('failWithZodValidationFailure', () => {
    test('creates Zod failure result', () => {
      const issues: any[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['field'],
          message: 'Expected string, received number',
        },
      ];

      const result = failWithZodValidationFailure({
        message: 'Validation failed',
        issues,
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason).toEqual({
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'Validation',
        message: 'Validation failed',
        issues,
      });
    });
  });

  describe('type guards', () => {
    test('isKoriZodGeneralFailure identifies general failures', () => {
      const generalFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Error',
        detail: 'Detail',
      };

      const zodFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'Validation',
        message: 'Error',
        issues: [],
      };

      expect(isKoriZodGeneralFailure(generalFailure)).toBe(true);
      expect(isKoriZodGeneralFailure(zodFailure)).toBe(false);
    });

    test('isKoriZodValidationFailure identifies validation failures', () => {
      const generalFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Error',
        detail: 'Detail',
      };

      const zodFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'Validation',
        message: 'Error',
        issues: [],
      };

      expect(isKoriZodValidationFailure(zodFailure)).toBe(true);
      expect(isKoriZodValidationFailure(generalFailure)).toBe(false);
    });

    test('isKoriZodFailure identifies any Zod failure', () => {
      const generalFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Error',
        detail: 'Detail',
      };

      const zodFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'Validation',
        message: 'Error',
        issues: [],
      };

      const otherFailure = {
        provider: 'other',
        type: 'Unknown',
      };

      expect(isKoriZodFailure(generalFailure)).toBe(true);
      expect(isKoriZodFailure(zodFailure)).toBe(true);
      expect(isKoriZodFailure(otherFailure as any)).toBe(false);
    });

    test('type guards handle invalid inputs', () => {
      expect(isKoriZodGeneralFailure(null as any)).toBe(false);
      expect(isKoriZodGeneralFailure(undefined as any)).toBe(false);
      expect(isKoriZodGeneralFailure({} as any)).toBe(false);
      expect(isKoriZodGeneralFailure({ provider: 'wrong', type: 'General' } as any)).toBe(false);

      expect(isKoriZodValidationFailure(null as any)).toBe(false);
      expect(isKoriZodValidationFailure(undefined as any)).toBe(false);
      expect(isKoriZodValidationFailure({} as any)).toBe(false);
      expect(isKoriZodValidationFailure({ provider: 'wrong', type: 'Validation' } as any)).toBe(false);
    });
  });
});
