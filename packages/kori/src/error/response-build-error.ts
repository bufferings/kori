import { KoriError } from './kori-error.js';

/**
 * Error thrown when response building rules are violated.
 *
 * Indicates programming errors in response handling, such as attempting
 * to build a response multiple times or modifying an already-built response.
 */
export class KoriResponseBuildError extends KoriError {
  /**
   * Creates a KoriResponseBuildError with code "RESPONSE_BUILD_ERROR".
   *
   * @param message - Description of the response building violation
   */
  constructor(message: string) {
    super(message, { code: 'RESPONSE_BUILD_ERROR' });
  }
}
