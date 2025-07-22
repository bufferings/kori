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
  /** x-frame-options header */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | `ALLOW-FROM ${string}` | false;

  /** x-content-type-options header */
  contentTypeOptions?: 'nosniff' | false;

  /** x-xss-protection header */
  xssProtection?: '0' | '1' | '1; mode=block' | false;

  /** strict-transport-security header */
  strictTransportSecurity?: string | false;

  /** referrer-policy header */
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

  /** content-security-policy header */
  contentSecurityPolicy?: string | false;

  /** x-permitted-cross-domain-policies header */
  permittedCrossDomainPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all' | false;

  /** x-download-options header */
  downloadOptions?: 'noopen' | false;

  /** cross-origin-embedder-policy header */
  crossOriginEmbedderPolicy?: 'unsafe-none' | 'require-corp' | false;

  /** cross-origin-opener-policy header */
  crossOriginOpenerPolicy?: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin' | false;

  /** cross-origin-resource-policy header */
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

  // x-frame-options
  if (finalOptions.frameOptions !== false) {
    res.setHeader('x-frame-options', finalOptions.frameOptions);
  }

  // x-content-type-options
  if (finalOptions.contentTypeOptions !== false) {
    res.setHeader('x-content-type-options', finalOptions.contentTypeOptions);
  }

  // x-xss-protection
  if (finalOptions.xssProtection !== false) {
    res.setHeader('x-xss-protection', finalOptions.xssProtection);
  }

  // strict-transport-security
  if (finalOptions.strictTransportSecurity !== false) {
    res.setHeader('strict-transport-security', finalOptions.strictTransportSecurity);
  }

  // referrer-policy
  if (finalOptions.referrerPolicy !== false) {
    res.setHeader('referrer-policy', finalOptions.referrerPolicy);
  }

  // content-security-policy
  if (finalOptions.contentSecurityPolicy !== false) {
    res.setHeader('content-security-policy', finalOptions.contentSecurityPolicy);
  }

  // x-permitted-cross-domain-policies
  if (finalOptions.permittedCrossDomainPolicies !== false) {
    res.setHeader('x-permitted-cross-domain-policies', finalOptions.permittedCrossDomainPolicies);
  }

  // x-download-options
  if (finalOptions.downloadOptions !== false) {
    res.setHeader('x-download-options', finalOptions.downloadOptions);
  }

  // cross-origin-embedder-policy
  if (finalOptions.crossOriginEmbedderPolicy !== false) {
    res.setHeader('cross-origin-embedder-policy', finalOptions.crossOriginEmbedderPolicy);
  }

  // cross-origin-opener-policy
  if (finalOptions.crossOriginOpenerPolicy !== false) {
    res.setHeader('cross-origin-opener-policy', finalOptions.crossOriginOpenerPolicy);
  }

  // cross-origin-resource-policy
  if (finalOptions.crossOriginResourcePolicy !== false) {
    res.setHeader('cross-origin-resource-policy', finalOptions.crossOriginResourcePolicy);
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
 * Includes headers like x-frame-options, x-content-type-options, strict-transport-security, etc.
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
