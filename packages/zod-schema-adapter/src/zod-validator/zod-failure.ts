import { fail, type KoriFailure } from '@korix/kori';

import { ZOD_SCHEMA_PROVIDER, type KoriZodSchemaProvider } from '../zod-schema/index.js';

import type z from 'zod';

/**
 * Represents a general failure from Zod validation.
 */
export type KoriZodGeneralFailure = {
  provider: KoriZodSchemaProvider;
  type: 'General';
  message: string;
  detail: string;
};

/**
 * Represents a validation failure from Zod validation.
 */
export type KoriZodValidationFailure = {
  provider: KoriZodSchemaProvider;
  type: 'Validation';
  message: string;
  issues: z.core.$ZodIssue[];
};

/**
 * Represents failure information from Zod validation.
 */
export type KoriZodFailure = KoriZodGeneralFailure | KoriZodValidationFailure;

/**
 * Guards if the given value is a general failure produced by Zod validation.
 *
 * @param failure - The failure to check
 * @returns True if the failure is a general failure from Zod validation
 */
export function isKoriZodGeneralFailure(failure: unknown): failure is KoriZodGeneralFailure {
  return (
    typeof failure === 'object' &&
    failure !== null &&
    'provider' in failure &&
    failure.provider === ZOD_SCHEMA_PROVIDER &&
    'type' in failure &&
    failure.type === 'General'
  );
}

/**
 * Guards if the given value is a validation failure produced by Zod validation.
 *
 * @param failure - The failure to check
 * @returns True if the failure is a validation failure from Zod validation
 */
export function isKoriZodValidationFailure(failure: unknown): failure is KoriZodValidationFailure {
  return (
    typeof failure === 'object' &&
    failure !== null &&
    'provider' in failure &&
    failure.provider === ZOD_SCHEMA_PROVIDER &&
    'type' in failure &&
    failure.type === 'Validation'
  );
}

/**
 * Guards if the given value is a Zod validation failure.
 *
 * @param failure - The failure to check
 * @returns True if the failure is a Zod validation failure
 */
export function isKoriZodFailure(failure: unknown): failure is KoriZodFailure {
  return isKoriZodGeneralFailure(failure) || isKoriZodValidationFailure(failure);
}

/**
 * Creates a failure result for a general failure from Zod validation.
 *
 * @param options.message - The message to include in the failure
 * @param options.detail - The detail to include in the failure
 * @returns A failure result for a general failure from Zod validation
 */
export function failWithZodGeneralFailure({
  message,
  detail,
}: {
  message: string;
  detail: string;
}): KoriFailure<KoriZodGeneralFailure> {
  return fail({ provider: ZOD_SCHEMA_PROVIDER, type: 'General', message, detail });
}

/**
 * Creates a failure result for a validation failure from Zod validation.
 *
 * @param options.message - The message to include in the failure
 * @param options.issues - The issues to include in the failure
 * @returns A failure result for a validation failure from Zod validation
 */
export function failWithZodValidationFailure({
  message,
  issues,
}: {
  message: string;
  issues: z.core.$ZodIssue[];
}): KoriFailure<KoriZodValidationFailure> {
  return fail({ provider: ZOD_SCHEMA_PROVIDER, type: 'Validation', message, issues });
}
