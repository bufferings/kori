import { type PreValidationError } from './pre-validation-error.js';

export type RequestValidationError<TValidatorError = unknown> =
  | {
      stage: 'pre-validation';
      error: PreValidationError;
    }
  | {
      stage: 'validation';
      error: TValidatorError;
    };
