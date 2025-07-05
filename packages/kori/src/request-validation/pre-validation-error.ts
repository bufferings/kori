export type PreRequestValidationError =
  | {
      type: 'UNSUPPORTED_MEDIA_TYPE';
      message: string;
      supportedTypes: string[];
      requestedType: string | undefined;
    }
  | {
      type: 'INVALID_JSON';
      message: string;
      cause: unknown;
    };
