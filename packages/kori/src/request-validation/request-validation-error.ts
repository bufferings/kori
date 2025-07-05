import { type KoriPreRequestValidationError } from './pre-validation-error.js';

export type KoriRequestValidationError<TValidatorError = unknown> =
  | {
      stage: 'pre-validation';
      error: KoriPreRequestValidationError;
    }
  | {
      stage: 'validation';
      error: TValidatorError;
    };
