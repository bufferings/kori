import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
} from '@korix/kori';

import { PLUGIN_VERSION } from './version.js';

const PLUGIN_NAME = 'security-headers-plugin';

// CSP directive values as constants
export const CSP_VALUES = {
  FRAME_ANCESTORS: {
    NONE: "'none'",
    SELF: "'self'",
  },
} as const;

export type CspDirectives = Record<string, string | string[]>;

export type SecurityHeadersOptions = {
  /** x-content-type-options header */
  contentTypeOptions?: 'nosniff' | false;

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

  /**
   * Sets the `Content-Security-Policy` header.
   * Can be a string for simple policies, or a directive object for granular control.
   * When using the object form, specifying `frame-ancestors` will also set the legacy
   * `X-Frame-Options` header for backward compatibility.
   * Defaults to `{ 'frame-ancestors': "'none'" }` to prevent all framing (clickjacking).
   */
  contentSecurityPolicy?: string | CspDirectives | false;

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
  contentTypeOptions: 'nosniff',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  referrerPolicy: 'strict-origin-when-cross-origin',
  contentSecurityPolicy: { 'frame-ancestors': CSP_VALUES.FRAME_ANCESTORS.NONE },
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

function buildCspString(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([directive, value]) => {
      if (Array.isArray(value)) {
        return `${directive} ${value.join(' ')}`;
      }
      return `${directive} ${value}`;
    })
    .join('; ');
}

function setSecurityHeaders(res: KoriResponse, options: SecurityHeadersOptions): void {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  if (finalOptions.contentTypeOptions !== false) {
    res.setHeader('x-content-type-options', finalOptions.contentTypeOptions);
  }

  // This header is deprecated, but it's important to set it to '0'
  // to disable the browser's built-in XSS auditor in older browsers,
  // which can introduce XSS vulnerabilities. It is not configurable.
  res.setHeader('x-xss-protection', '0');

  if (finalOptions.strictTransportSecurity !== false) {
    res.setHeader('strict-transport-security', finalOptions.strictTransportSecurity);
  }

  if (finalOptions.referrerPolicy !== false) {
    res.setHeader('referrer-policy', finalOptions.referrerPolicy);
  }

  if (finalOptions.contentSecurityPolicy !== false) {
    let cspString: string;

    if (typeof finalOptions.contentSecurityPolicy === 'string') {
      cspString = finalOptions.contentSecurityPolicy;
    } else {
      const directives = finalOptions.contentSecurityPolicy;
      const frameAncestors = directives['frame-ancestors'];

      if (frameAncestors === CSP_VALUES.FRAME_ANCESTORS.NONE) {
        res.setHeader('x-frame-options', 'deny');
      } else if (frameAncestors === CSP_VALUES.FRAME_ANCESTORS.SELF) {
        res.setHeader('x-frame-options', 'sameorigin');
      }
      cspString = buildCspString(directives);
    }
    res.setHeader('content-security-policy', cspString);
  }

  if (finalOptions.permittedCrossDomainPolicies !== false) {
    res.setHeader('x-permitted-cross-domain-policies', finalOptions.permittedCrossDomainPolicies);
  }

  if (finalOptions.downloadOptions !== false) {
    res.setHeader('x-download-options', finalOptions.downloadOptions);
  }

  if (finalOptions.crossOriginEmbedderPolicy !== false) {
    res.setHeader('cross-origin-embedder-policy', finalOptions.crossOriginEmbedderPolicy);
  }

  if (finalOptions.crossOriginOpenerPolicy !== false) {
    res.setHeader('cross-origin-opener-policy', finalOptions.crossOriginOpenerPolicy);
  }

  if (finalOptions.crossOriginResourcePolicy !== false) {
    res.setHeader('cross-origin-resource-policy', finalOptions.crossOriginResourcePolicy);
  }

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
        contentTypeOptions: options.contentTypeOptions ?? DEFAULT_OPTIONS.contentTypeOptions,
        strictTransportSecurity: options.strictTransportSecurity ?? DEFAULT_OPTIONS.strictTransportSecurity,
        referrerPolicy: options.referrerPolicy ?? DEFAULT_OPTIONS.referrerPolicy,
        contentSecurityPolicy:
          typeof options.contentSecurityPolicy === 'object'
            ? 'custom-directives'
            : (options.contentSecurityPolicy ?? 'default'),
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
