import {
  defineKoriPlugin,
  type KoriPlugin,
  type KoriResponse,
  type KoriRequest,
  type KoriEnvironment,
  HttpResponseHeader,
} from '@korix/kori';

import { PLUGIN_VERSION } from './version.js';

const PLUGIN_NAME = 'security-headers';

// CSP directive values as constants
export const CSP_VALUES = {
  FRAME_ANCESTORS: {
    NONE: "'none'",
    SELF: "'self'",
  },
} as const;

// CSP directive names as constants
export const CSP_DIRECTIVES = {
  FRAME_ANCESTORS: 'frame-ancestors',
  DEFAULT_SRC: 'default-src',
  SCRIPT_SRC: 'script-src',
  STYLE_SRC: 'style-src',
  IMG_SRC: 'img-src',
  CONNECT_SRC: 'connect-src',
  FONT_SRC: 'font-src',
  OBJECT_SRC: 'object-src',
  MEDIA_SRC: 'media-src',
  CHILD_SRC: 'child-src',
} as const;

export type CspDirectives = Partial<Record<(typeof CSP_DIRECTIVES)[keyof typeof CSP_DIRECTIVES], string | string[]>> &
  Record<string, string | string[]>;

export type SecurityHeadersOptions = {
  /** x-frame-options header (legacy support, use CSP frame-ancestors for modern browsers) */
  frameOptions?: 'deny' | 'sameorigin' | false;

  /** x-content-type-options header */
  contentTypeOptions?: 'nosniff' | false;

  /**
   * x-xss-protection header control
   * When true: sets 'X-XSS-Protection: 0' to disable dangerous browser XSS auditor
   * When false: header is not set (allows manual configuration)
   * Note: This header is deprecated, but setting it to '0' prevents XSS vulnerabilities in older browsers
   */
  xssProtection?: boolean;

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
   * Defaults to `{ 'frame-ancestors': "'none'" }` to prevent all framing (clickjacking).
   * Uses CSP-first approach for modern web security best practices.
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
  frameOptions: 'deny',
  contentTypeOptions: 'nosniff',
  xssProtection: true,
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
    res.setHeader(HttpResponseHeader.X_CONTENT_TYPE_OPTIONS, finalOptions.contentTypeOptions);
  }

  if (finalOptions.xssProtection) {
    // This header is deprecated, but it's important to set it to '0'
    // to disable the browser's built-in XSS auditor in older browsers,
    // which can introduce XSS vulnerabilities.
    res.setHeader(HttpResponseHeader.X_XSS_PROTECTION, '0');
  }

  if (finalOptions.frameOptions !== false) {
    res.setHeader(HttpResponseHeader.X_FRAME_OPTIONS, finalOptions.frameOptions);
  }

  if (finalOptions.strictTransportSecurity !== false) {
    res.setHeader(HttpResponseHeader.STRICT_TRANSPORT_SECURITY, finalOptions.strictTransportSecurity);
  }

  if (finalOptions.referrerPolicy !== false) {
    res.setHeader(HttpResponseHeader.REFERRER_POLICY, finalOptions.referrerPolicy);
  }

  if (finalOptions.contentSecurityPolicy !== false) {
    let cspString: string;

    if (typeof finalOptions.contentSecurityPolicy === 'string') {
      cspString = finalOptions.contentSecurityPolicy;
    } else {
      cspString = buildCspString(finalOptions.contentSecurityPolicy);
    }
    res.setHeader(HttpResponseHeader.CONTENT_SECURITY_POLICY, cspString);
  }

  if (finalOptions.permittedCrossDomainPolicies !== false) {
    res.setHeader(HttpResponseHeader.X_PERMITTED_CROSS_DOMAIN_POLICIES, finalOptions.permittedCrossDomainPolicies);
  }

  if (finalOptions.downloadOptions !== false) {
    res.setHeader(HttpResponseHeader.X_DOWNLOAD_OPTIONS, finalOptions.downloadOptions);
  }

  if (finalOptions.crossOriginEmbedderPolicy !== false) {
    res.setHeader(HttpResponseHeader.CROSS_ORIGIN_EMBEDDER_POLICY, finalOptions.crossOriginEmbedderPolicy);
  }

  if (finalOptions.crossOriginOpenerPolicy !== false) {
    res.setHeader(HttpResponseHeader.CROSS_ORIGIN_OPENER_POLICY, finalOptions.crossOriginOpenerPolicy);
  }

  if (finalOptions.crossOriginResourcePolicy !== false) {
    res.setHeader(HttpResponseHeader.CROSS_ORIGIN_RESOURCE_POLICY, finalOptions.crossOriginResourcePolicy);
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
      const log = kori.createPluginLogger(PLUGIN_NAME);

      log.info('Security headers plugin initialized', {
        frameOptions: options.frameOptions ?? DEFAULT_OPTIONS.frameOptions,
        contentTypeOptions: options.contentTypeOptions ?? DEFAULT_OPTIONS.contentTypeOptions,
        strictTransportSecurity: options.strictTransportSecurity ?? DEFAULT_OPTIONS.strictTransportSecurity,
        referrerPolicy: options.referrerPolicy ?? DEFAULT_OPTIONS.referrerPolicy,
        contentSecurityPolicy:
          options.contentSecurityPolicy === false
            ? 'disabled'
            : typeof options.contentSecurityPolicy === 'object'
              ? 'custom-directives'
              : (options.contentSecurityPolicy ?? 'default-object'),
        skipPathsCount: skipPaths.length,
      });

      return kori.onRequest((ctx) => {
        // Defer security headers setting until after handler execution
        ctx.defer((deferCtx) => {
          const pathname = deferCtx.req.url().pathname;

          // Skip security headers for specified paths
          if (shouldSkipPath(pathname, skipPaths)) {
            return;
          }

          setSecurityHeaders(deferCtx.res, options);
        });
      });
    },
  });
}
