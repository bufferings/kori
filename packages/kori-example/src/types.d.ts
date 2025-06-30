declare module 'kori' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface KoriRequest {
    validated?: any;
    requestId?: string;
    startTime?: number;
    apiVersion?: string;
    appVersion?: string;
    features?: string[];
    isAdmin?: boolean;
    apiKey?: string;
  }
}