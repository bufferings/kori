import { fail, type KoriFailure } from '@korix/kori';

import { ZOD_SCHEMA_PROVIDER, type KoriZodSchemaProvider } from '../zod-schema/index.js';

import type z from 'zod';

/**
 * Represents a general failure from Zod validation.
 */
export type KoriZodFailureGeneral = {
  provider: KoriZodSchemaProvider;
  type: 'General';
  message: string;
  detail: string;
};

/**
 * Represents a Zod validation failure.
 */
export type KoriZodFailureZod = {
  provider: KoriZodSchemaProvider;
  type: 'Zod';
  message: string;
  issues: z.core.$ZodIssue[];
};

/**
 * Represents validation failure information from Zod validation.
 */
export type KoriZodFailure = KoriZodFailureGeneral | KoriZodFailureZod;

/**
 * Checks if a failure is a general failure from Zod validation.
 */
export function isKoriZodFailureGeneral(failure: KoriZodFailure): failure is KoriZodFailureGeneral {
  return (
    typeof failure === 'object' &&
    failure !== null &&
    failure?.provider === ZOD_SCHEMA_PROVIDER &&
    failure?.type === 'General'
  );
}

/**
 * Checks if a failure is a Zod validation failure.
 */
export function isKoriZodFailureZod(failure: KoriZodFailure): failure is KoriZodFailureZod {
  return (
    typeof failure === 'object' &&
    failure !== null &&
    failure?.provider === ZOD_SCHEMA_PROVIDER &&
    failure?.type === 'Zod'
  );
}

/**
 * Checks if a failure is a Zod validation failure.
 */
export function isKoriZodFailure(failure: KoriZodFailure): failure is KoriZodFailure {
  return isKoriZodFailureGeneral(failure) || isKoriZodFailureZod(failure);
}

/**
 * Creates a failure result for a general failure from Zod validation.
 */
export function failGeneral({
  message,
  detail,
}: {
  message: string;
  detail: string;
}): KoriFailure<KoriZodFailureGeneral> {
  return fail({ provider: ZOD_SCHEMA_PROVIDER, type: 'General', message, detail });
}

/**
 * Creates a failure result for a Zod validation failure.
 */
export function failZod({
  message,
  issues,
}: {
  message: string;
  issues: z.core.$ZodIssue[];
}): KoriFailure<KoriZodFailureZod> {
  return fail({ provider: ZOD_SCHEMA_PROVIDER, type: 'Zod', message, issues });
}
