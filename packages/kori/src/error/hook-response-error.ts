import { KoriError } from './kori-error.js';

/**
 * Error thrown when a hook returns a KoriResponse that is not the ctx.res instance.
 *
 * Hooks must return ctx.res when aborting request processing. This error indicates
 * a programming error where a hook returned a different KoriResponse instance.
 */
export class KoriHookResponseError extends KoriError {
  /**
   * Creates a KoriHookResponseError with code "HOOK_RESPONSE_ERROR".
   *
   * @param message - Description of the hook response violation
   */
  constructor(message: string) {
    super(message, { code: 'HOOK_RESPONSE_ERROR' });
  }
}
