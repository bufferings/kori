import { describe, test, expect } from 'vitest';

import { ZOD_SCHEMA_PROVIDER } from '../../src/zod-schema/index.js';
import {
  failGeneral,
  failZod,
  isKoriZodFailure,
  isKoriZodFailureGeneral,
  isKoriZodFailureZod,
  type KoriZodFailure,
} from '../../src/zod-validator/index.js';

describe('zod-failure utilities', () => {
  describe('failGeneral', () => {
    test('creates general failure result', () => {
      const result = failGeneral({
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

  describe('failZod', () => {
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

      const result = failZod({
        message: 'Validation failed',
        issues,
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason).toEqual({
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'Zod',
        message: 'Validation failed',
        issues,
      });
    });
  });

  describe('type guards', () => {
    test('isKoriZodFailureGeneral identifies general failures', () => {
      const generalFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Error',
        detail: 'Detail',
      };

      const zodFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'Zod',
        message: 'Error',
        issues: [],
      };

      expect(isKoriZodFailureGeneral(generalFailure)).toBe(true);
      expect(isKoriZodFailureGeneral(zodFailure)).toBe(false);
    });

    test('isKoriZodFailureZod identifies Zod failures', () => {
      const generalFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Error',
        detail: 'Detail',
      };

      const zodFailure: KoriZodFailure = {
        provider: ZOD_SCHEMA_PROVIDER,
        type: 'Zod',
        message: 'Error',
        issues: [],
      };

      expect(isKoriZodFailureZod(zodFailure)).toBe(true);
      expect(isKoriZodFailureZod(generalFailure)).toBe(false);
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
        type: 'Zod',
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
      expect(isKoriZodFailureGeneral(null as any)).toBe(false);
      expect(isKoriZodFailureGeneral(undefined as any)).toBe(false);
      expect(isKoriZodFailureGeneral({} as any)).toBe(false);
      expect(isKoriZodFailureGeneral({ provider: 'wrong', type: 'General' } as any)).toBe(false);

      expect(isKoriZodFailureZod(null as any)).toBe(false);
      expect(isKoriZodFailureZod(undefined as any)).toBe(false);
      expect(isKoriZodFailureZod({} as any)).toBe(false);
      expect(isKoriZodFailureZod({ provider: 'wrong', type: 'Zod' } as any)).toBe(false);
    });
  });
});
