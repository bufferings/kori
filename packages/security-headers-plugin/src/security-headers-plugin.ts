import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
} from '@korix/kori';

import { PLUGIN_VERSION } from './version.js';

const PLUGIN_NAME = 'security-headers-plugin';

export type SecurityHeadersOptions = {
  /** X-Frame-Options header */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | `ALLOW-FROM ${string}` | false;

  /** X-Content-Type-Options header */
  contentTypeOptions?: 'nosniff' | false;

  /** X-XSS-Protection header */
  xssProtection?: '0' | '1' | '1; mode=block' | false;

  /** Strict-Transport-Security header */
  strictTransportSecurity?: string | false;

  /** Referrer-Policy header */
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'
    | false;

  /** Content-Security-Policy header */
  contentSecurityPolicy?: string | false;

  /** X-Permitted-Cross-Domain-Policies header */
  permittedCrossDomainPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all' | false;

  /** X-Download-Options header */
  downloadOptions?: 'noopen' | false;

  /** Cross-Origin-Embedder-Policy header */
  crossOriginEmbedderPolicy?: 'unsafe-none' | 'require-corp' | false;

  /** Cross-Origin-Opener-Policy header */
  crossOriginOpenerPolicy?: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin' | false;

  /** Cross-Origin-Resource-Policy header */
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin' | false;

  /** Custom headers to add */
  customHeaders?: Record<string, string>;

  /** Skip security headers for certain paths (regex patterns) */
  skipPaths?: (string | RegExp)[];
};

const DEFAULT_OPTIONS: Required<Omit<SecurityHeadersOptions, 'customHeaders' | 'skipPaths'>> = {
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
  xssProtection: '1; mode=block',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  referrerPolicy: 'strict-origin-when-cross-origin',
  contentSecurityPolicy: false,
  permittedCrossDomainPolicies: 'none',
  downloadOptions: 'noopen',
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
};

function shouldSkipPath(pathname: string, skipPaths: (string | RegExp)[]): boolean {
  for (const pattern of skipPaths) {
    if (typeof pattern === 'string') {
      if (pathname === pattern) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(pathname)) {
        return true;
      }
    }
  }
  return false;
}

function setSecurityHeaders(res: KoriResponse, options: SecurityHeadersOptions): void {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  // X-Frame-Options
  if (finalOptions.frameOptions !== false) {
    res.setHeader('X-Frame-Options', finalOptions.frameOptions);
  }

  // X-Content-Type-Options
  if (finalOptions.contentTypeOptions !== false) {
    res.setHeader('X-Content-Type-Options', finalOptions.contentTypeOptions);
  }

  // X-XSS-Protection
  if (finalOptions.xssProtection !== false) {
    res.setHeader('X-XSS-Protection', finalOptions.xssProtection);
  }

  // Strict-Transport-Security
  if (finalOptions.strictTransportSecurity !== false) {
    res.setHeader('Strict-Transport-Security', finalOptions.strictTransportSecurity);
  }

  // Referrer-Policy
  if (finalOptions.referrerPolicy !== false) {
    res.setHeader('Referrer-Policy', finalOptions.referrerPolicy);
  }

  // Content-Security-Policy
  if (finalOptions.contentSecurityPolicy !== false) {
    res.setHeader('Content-Security-Policy', finalOptions.contentSecurityPolicy);
  }

  // X-Permitted-Cross-Domain-Policies
  if (finalOptions.permittedCrossDomainPolicies !== false) {
    res.setHeader('X-Permitted-Cross-Domain-Policies', finalOptions.permittedCrossDomainPolicies);
  }

  // X-Download-Options
  if (finalOptions.downloadOptions !== false) {
    res.setHeader('X-Download-Options', finalOptions.downloadOptions);
  }

  // Cross-Origin-Embedder-Policy
  if (finalOptions.crossOriginEmbedderPolicy !== false) {
    res.setHeader('Cross-Origin-Embedder-Policy', finalOptions.crossOriginEmbedderPolicy);
  }

  // Cross-Origin-Opener-Policy
  if (finalOptions.crossOriginOpenerPolicy !== false) {
    res.setHeader('Cross-Origin-Opener-Policy', finalOptions.crossOriginOpenerPolicy);
  }

  // Cross-Origin-Resource-Policy
  if (finalOptions.crossOriginResourcePolicy !== false) {
    res.setHeader('Cross-Origin-Resource-Policy', finalOptions.crossOriginResourcePolicy);
  }

  // Custom headers
  if (options.customHeaders) {
    for (const [headerName, headerValue] of Object.entries(options.customHeaders)) {
      res.setHeader(headerName, headerValue);
    }
  }
}

/**
 * Security headers plugin for Kori framework
 *
 * Adds common security headers to HTTP responses to improve application security.
 * Includes headers like X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc.
 */
export function securityHeadersPlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: SecurityHeadersOptions = {},
): KoriPlugin<Env, Req, Res> {
  const skipPaths = options.skipPaths ?? [];

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      const log = kori.log().child(PLUGIN_NAME);

      log.info('Security headers plugin initialized', {
        frameOptions: options.frameOptions ?? DEFAULT_OPTIONS.frameOptions,
        contentTypeOptions: options.contentTypeOptions ?? DEFAULT_OPTIONS.contentTypeOptions,
        xssProtection: options.xssProtection ?? DEFAULT_OPTIONS.xssProtection,
        strictTransportSecurity: options.strictTransportSecurity ?? DEFAULT_OPTIONS.strictTransportSecurity,
        referrerPolicy: options.referrerPolicy ?? DEFAULT_OPTIONS.referrerPolicy,
        contentSecurityPolicy: options.contentSecurityPolicy ?? 'disabled',
        skipPathsCount: skipPaths.length,
      });

      return kori.onResponse((ctx) => {
        const pathname = ctx.req.url().pathname;

        // Skip security headers for specified paths
        if (shouldSkipPath(pathname, skipPaths)) {
          return;
        }

        setSecurityHeaders(ctx.res, options);
      });
    },
  });
}
