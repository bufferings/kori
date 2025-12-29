/**
 * Machine-readable error codes used by KoriError.
 *
 * Use these constants when throwing KoriError to ensure consistency.
 * Users can also define custom error codes as strings.
 */
export const KoriErrorCode = {
  COOKIE_ERROR: 'COOKIE_ERROR',
  SET_COOKIE_HEADER_ERROR: 'SET_COOKIE_HEADER_ERROR',
  RESPONSE_BUILD_ERROR: 'RESPONSE_BUILD_ERROR',
  ROUTE_DEFINITION_ERROR: 'ROUTE_DEFINITION_ERROR',
  VALIDATION_CONFIG_ERROR: 'VALIDATION_CONFIG_ERROR',
  INVALID_RESPONSE_RETURN: 'INVALID_RESPONSE_RETURN',
} as const;
