import { describe, test, expect } from 'vitest';

import { STANDARD_SCHEMA_PROVIDER } from '../../src/std-schema/index.js';
import {
  failWithStdGeneralFailure,
  failWithStdValidationFailure,
  isKoriStdFailure,
  isKoriStdGeneralFailure,
  isKoriStdValidationFailure,
  type KoriStdFailure,
} from '../../src/std-validator/index.js';

describe('std-failure utilities', () => {
  describe('failGeneral', () => {
    test('creates general failure result', () => {
      const result = failWithStdGeneralFailure({
        message: 'Custom error',
        detail: 'Something went wrong',
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason).toEqual({
        provider: STANDARD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Custom error',
        detail: 'Something went wrong',
      });
    });
  });

  describe('failWithStdValidationFailure', () => {
    test('creates Standard Schema validation failure result', () => {
      const issues: any[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['field'],
          message: 'Expected string, received number',
        },
      ];

      const result = failWithStdValidationFailure({
        message: 'Validation failed',
        issues,
      });

      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason).toEqual({
        provider: STANDARD_SCHEMA_PROVIDER,
        type: 'Validation',
        message: 'Validation failed',
        issues,
      });
    });
  });

  describe('type guards', () => {
    test('isKoriStdGeneralFailure identifies general failures', () => {
      const generalFailure: KoriStdFailure = {
        provider: STANDARD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Error',
        detail: 'Detail',
      };

      const stdFailure: KoriStdFailure = {
        provider: STANDARD_SCHEMA_PROVIDER,
        type: 'Validation',
        message: 'Error',
        issues: [],
      };

      expect(isKoriStdGeneralFailure(generalFailure)).toBe(true);
      expect(isKoriStdGeneralFailure(stdFailure)).toBe(false);
    });

    test('isKoriStdValidationFailure identifies validation failures', () => {
      const generalFailure: KoriStdFailure = {
        provider: STANDARD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Error',
        detail: 'Detail',
      };

      const stdFailure: KoriStdFailure = {
        provider: STANDARD_SCHEMA_PROVIDER,
        type: 'Validation',
        message: 'Error',
        issues: [],
      };

      expect(isKoriStdValidationFailure(stdFailure)).toBe(true);
      expect(isKoriStdValidationFailure(generalFailure)).toBe(false);
    });

    test('isKoriStdFailure identifies any Standard Schema failure', () => {
      const generalFailure: KoriStdFailure = {
        provider: STANDARD_SCHEMA_PROVIDER,
        type: 'General',
        message: 'Error',
        detail: 'Detail',
      };

      const stdFailure: KoriStdFailure = {
        provider: STANDARD_SCHEMA_PROVIDER,
        type: 'Validation',
        message: 'Error',
        issues: [],
      };

      const otherFailure = {
        provider: 'other',
        type: 'Unknown',
      };

      expect(isKoriStdFailure(generalFailure)).toBe(true);
      expect(isKoriStdFailure(stdFailure)).toBe(true);
      expect(isKoriStdFailure(otherFailure as any)).toBe(false);
    });

    test('type guards handle invalid inputs', () => {
      expect(isKoriStdGeneralFailure(null as any)).toBe(false);
      expect(isKoriStdGeneralFailure(undefined as any)).toBe(false);
      expect(isKoriStdGeneralFailure({} as any)).toBe(false);
      expect(isKoriStdGeneralFailure({ provider: 'wrong', type: 'General' } as any)).toBe(false);

      expect(isKoriStdValidationFailure(null as any)).toBe(false);
      expect(isKoriStdValidationFailure(undefined as any)).toBe(false);
      expect(isKoriStdValidationFailure({} as any)).toBe(false);
      expect(isKoriStdValidationFailure({ provider: 'wrong', type: 'Validation' } as any)).toBe(false);
    });
  });
});
