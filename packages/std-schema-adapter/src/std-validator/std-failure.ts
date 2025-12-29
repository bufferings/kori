import { fail, type KoriFailure } from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import { STANDARD_SCHEMA_PROVIDER, type KoriStdSchemaProvider } from '../std-schema/index.js';

/**
 * Represents a general failure from Standard Schema validation.
 */
export type KoriStdGeneralFailure = {
  provider: KoriStdSchemaProvider;
  type: 'General';
  message: string;
  detail: string;
};

/**
 * Represents a validation failure from Standard Schema validation.
 */
export type KoriStdValidationFailure = {
  provider: KoriStdSchemaProvider;
  type: 'Validation';
  message: string;
  issues: StandardSchemaV1.Issue[];
};

/**
 * Represents failure information from Standard Schema validation.
 */
export type KoriStdFailure = KoriStdGeneralFailure | KoriStdValidationFailure;

/**
 * Guards if the given value is a general failure produced by Standard Schema validation.
 *
 * @param failure - The failure to check
 * @returns True if the failure is a general failure from Standard Schema validation
 */
export function isKoriStdGeneralFailure(failure: unknown): failure is KoriStdGeneralFailure {
  return (
    typeof failure === 'object' &&
    failure !== null &&
    'provider' in failure &&
    failure.provider === STANDARD_SCHEMA_PROVIDER &&
    'type' in failure &&
    failure?.type === 'General'
  );
}

/**
 * Guards if the given value is a validation failure produced by Standard Schema validation.
 *
 * @param failure - The failure to check
 * @returns True if the failure is a validation failure from Standard Schema validation
 */
export function isKoriStdValidationFailure(failure: unknown): failure is KoriStdValidationFailure {
  return (
    typeof failure === 'object' &&
    failure !== null &&
    'provider' in failure &&
    failure.provider === STANDARD_SCHEMA_PROVIDER &&
    'type' in failure &&
    failure?.type === 'Validation'
  );
}

/**
 * Guards if the given value is a Standard Schema validation failure.
 *
 * @param failure - The failure to check
 * @returns True if the failure is a Standard Schema validation failure
 */
export function isKoriStdFailure(failure: unknown): failure is KoriStdFailure {
  return isKoriStdGeneralFailure(failure) || isKoriStdValidationFailure(failure);
}

/**
 * Creates a failure result for a general failure from Standard Schema validation.
 *
 * @param options.message - The message to include in the failure
 * @param options.detail - The detail to include in the failure
 * @returns A failure result for a general failure from Standard Schema validation
 */
export function failWithStdGeneralFailure({
  message,
  detail,
}: {
  message: string;
  detail: string;
}): KoriFailure<KoriStdGeneralFailure> {
  return fail({ provider: STANDARD_SCHEMA_PROVIDER, type: 'General', message, detail });
}

/**
 * Creates a failure result for a Standard Schema validation failure.
 *
 * @param options.message - The message to include in the failure
 * @param options.issues - The issues to include in the failure
 * @returns A failure result for a Standard Schema validation failure
 */
export function failWithStdValidationFailure({
  message,
  issues,
}: {
  message: string;
  issues: StandardSchemaV1.Issue[];
}): KoriFailure<KoriStdValidationFailure> {
  return fail({ provider: STANDARD_SCHEMA_PROVIDER, type: 'Validation', message, issues });
}
