import { type PreRequestValidationError } from './pre-validation-error.js';

export type RequestValidationError<TValidatorError = unknown> =
  | {
      stage: 'pre-validation';
      error: PreRequestValidationError;
    }
  | {
      stage: 'validation';
      error: TValidatorError;
    };
