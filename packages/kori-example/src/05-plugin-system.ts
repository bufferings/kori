/**
 * Kori Plugin System Guide
 *
 * This file demonstrates plugin system capabilities including:
 * - Custom plugin creation with defineKoriPlugin
 * - Timing, CORS, rate limiting, authentication plugins
 * - Type-safe plugin extensions
 * - Plugin composition and application
 */

import { type Kori, type KoriEnvironment, type KoriRequest, type KoriResponse, defineKoriPlugin } from 'kori';
import { type KoriZodRequestValidator, type KoriZodResponseValidator } from 'kori-zod-validator';

// Type definitions for plugin extensions
export type TimingEnvironmentExtension = {
  timings: Map<string, number>;
};

export type TimingRequestExtension = {
  timingId: string;
};

export type RateLimitEnvironmentExtension = {
  rateLimitStore: Map<string, { count: number; resetTime: number }>;
};

export type RateLimitRequestExtension = {
  rateLimit: {
    limit: number;
    remaining: number;
    reset: number;
  };
};

export type RequestIdRequestExtension = {
  requestId: string;
};

export type AuthRequestExtension = {
  authenticated: boolean;
  user?: { id: string; role: string };
};

export type CustomDataRequestExtension = {
  customData: { timestamp: number };
};

// Basic timing plugin with proper types
const timingPlugin = defineKoriPlugin<
  KoriEnvironment,
  KoriRequest,
  KoriResponse,
  TimingEnvironmentExtension,
  TimingRequestExtension
>({
  name: 'timing',
  apply: (k) => {
    return k
      .onInit((ctx) => {
        return ctx.withEnv({ timings: new Map<string, number>() });
      })
      .onRequest((ctx) => {
        const start = Date.now();
        const timings = ctx.env.timings;
        const requestId = `${ctx.req.method}-${ctx.req.url.href}-${start}`;
        timings.set(requestId, start);
        return ctx.withReq({ timingId: requestId });
      })
      .onResponse((ctx) => {
        const timings = ctx.env.timings;
        const timingId = ctx.req.timingId;
        const start = timings.get(timingId);

        if (start) {
          const duration = Date.now() - start;
          ctx.res.setHeader('X-Response-Time', `${duration}ms`);
          timings.delete(timingId);
        }
      });
  },
});

// CORS plugin factory with proper types
function createCorsPlugin(
  options: {
    origin?: string;
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  } = {},
) {
  const config = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true,
    ...options,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return defineKoriPlugin<KoriEnvironment, KoriRequest, KoriResponse, unknown, unknown, unknown, any, any>({
    name: 'cors',
    apply: (k) =>
      k.onResponse((ctx) => {
        ctx.res.setHeader('Access-Control-Allow-Origin', config.origin);
        ctx.res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '));
        ctx.res.setHeader('Access-Control-Allow-Headers', config.headers.join(', '));
        ctx.res.setHeader('Access-Control-Allow-Credentials', config.credentials.toString());
      }),
  });
}

// Rate limiting plugin factory with proper types
function createRateLimitPlugin(
  options: {
    windowMs?: number;
    max?: number;
  } = {},
) {
  const config = {
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    ...options,
  };

  return defineKoriPlugin<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    RateLimitEnvironmentExtension,
    RateLimitRequestExtension
  >({
    name: 'rateLimit',
    apply: (k) =>
      k
        .onInit((ctx) => {
          return ctx.withEnv({ rateLimitStore: new Map<string, { count: number; resetTime: number }>() });
        })
        .onRequest((ctx) => {
          const store = ctx.env.rateLimitStore;
          const clientIp = ctx.req.headers['x-forwarded-for'] ?? 'unknown';
          const now = Date.now();

          let clientData = store.get(clientIp);

          if (!clientData || now > clientData.resetTime) {
            clientData = {
              count: 0,
              resetTime: now + config.windowMs,
            };
            store.set(clientIp, clientData);
          }

          clientData.count++;

          const rateLimit = {
            limit: config.max,
            remaining: Math.max(0, config.max - clientData.count),
            reset: clientData.resetTime,
          };

          if (clientData.count > config.max) {
            throw new Error('Too Many Requests');
          }

          return ctx.withReq({ rateLimit });
        })
        .onResponse((ctx) => {
          const rateLimit = ctx.req.rateLimit;
          if (rateLimit) {
            ctx.res.setHeader('X-RateLimit-Limit', rateLimit.limit.toString());
            ctx.res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
            ctx.res.setHeader('X-RateLimit-Reset', rateLimit.reset.toString());
          }
        })
        .onError((ctx, error) => {
          if (error instanceof Error && error.message === 'Too Many Requests') {
            const rateLimit = ctx.req.rateLimit;
            if (rateLimit) {
              ctx.res
                .status(429)
                .setHeader('X-RateLimit-Limit', rateLimit.limit.toString())
                .setHeader('X-RateLimit-Remaining', '0')
                .setHeader('X-RateLimit-Reset', rateLimit.reset.toString())
                .setHeader('Retry-After', Math.ceil((rateLimit.reset - Date.now()) / 1000).toString())
                .json({ error: 'Too Many Requests' });
            }
          }
        }),
  });
}

// Request ID plugin with proper types
const requestIdPlugin = defineKoriPlugin<
  KoriEnvironment,
  KoriRequest,
  KoriResponse,
  unknown,
  RequestIdRequestExtension
>({
  name: 'requestId',
  apply: (k) =>
    k
      .onRequest((ctx) => {
        const requestId =
          ctx.req.headers['x-request-id'] ?? `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        return ctx.withReq({ requestId });
      })
      .onResponse((ctx) => {
        const requestId = ctx.req.requestId;
        if (requestId) {
          ctx.res.setHeader('X-Request-Id', requestId);
        }
      }),
});

// Auth plugin factory with proper types
function createAuthPlugin(options: { secretKey: string }) {
  return defineKoriPlugin<KoriEnvironment, KoriRequest, KoriResponse, unknown, AuthRequestExtension>({
    name: 'auth',
    apply: (k) =>
      k.onRequest((ctx) => {
        const authHeader = ctx.req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');

        const authResult =
          token === options.secretKey
            ? {
                authenticated: true,
                user: { id: 'demo-user-id', role: 'admin' },
              }
            : {
                authenticated: false,
                user: undefined,
              };

        return ctx.withReq(authResult);
      }),
  });
}

// Custom plugin with proper types
const customPlugin = defineKoriPlugin<KoriEnvironment, KoriRequest, KoriResponse, unknown, CustomDataRequestExtension>({
  name: 'customPlugin',
  apply: (k) =>
    k
      .onInit((ctx) => {
        // Custom plugin initialized
        return ctx;
      })
      .onRequest((ctx) => {
        // Custom plugin processing request
        return ctx.withReq({ customData: { timestamp: Date.now() } });
      }),
});

/**
 * Configure Plugin System example routes
 * This demonstrates comprehensive plugin usage and creation
 */
export function configure<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  k: Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator>,
): Kori<Env, Req, Res, KoriZodRequestValidator, KoriZodResponseValidator> {
  // Welcome route
  k.get('/', (ctx) =>
    ctx.res.json({
      message: 'Welcome to Kori Plugin System Examples!',
      description: 'This example demonstrates plugin creation and usage',
      availablePlugins: [
        'timing - Response time tracking',
        'cors - Cross-origin resource sharing',
        'rateLimit - Request rate limiting',
        'requestId - Request ID generation',
        'auth - Authentication',
        'custom - Custom plugin example',
      ],
    }),
  );

  // Apply plugins and create routes demonstrating plugin functionality
  // Note: In a real application, you would apply plugins to the main app
  // For demonstration, we'll create child instances with different plugin combinations

  // Basic plugin demonstration
  k.createChild({
    prefix: '/basic',
    configure: (kc) =>
      kc
        .applyPlugin(timingPlugin)
        .applyPlugin(createCorsPlugin())
        .applyPlugin(requestIdPlugin)
        .get('/public', (ctx) =>
          ctx.res.json({
            message: 'This endpoint uses basic plugins',
            requestId: ctx.req.requestId,
            note: 'Check response headers for timing and CORS headers',
          }),
        ),
  });

  // Auth plugin demonstration
  k.createChild({
    prefix: '/auth',
    configure: (kc) =>
      kc
        .applyPlugin(
          createAuthPlugin({
            secretKey: process.env.DEMO_AUTH_TOKEN ?? 'demo-token-replace-in-production',
          }),
        )

        .get('/protected', (ctx) => {
          const { authenticated, user } = ctx.req;

          if (!authenticated || !user) {
            return ctx.res.status(401).json({ message: 'Authentication required' });
          }

          return ctx.res.json({
            message: 'This is a protected endpoint',
            user,
            note: 'Send Authorization: Bearer demo-token-replace-in-production',
          });
        }),
  });

  // Rate limit plugin demonstration
  k.createChild({
    prefix: '/rate-limited',
    configure: (kc) =>
      kc
        // 5 requests per minute
        .applyPlugin(
          createRateLimitPlugin({
            windowMs: 60 * 1000,
            max: 5,
          }),
        )
        .get('/test', (ctx) => {
          const { rateLimit } = ctx.req;

          return ctx.res.json({
            message: 'Rate limit test endpoint',
            rateLimit: rateLimit
              ? {
                  limit: rateLimit.limit,
                  remaining: rateLimit.remaining,
                  resetTime: new Date(rateLimit.reset).toISOString(),
                }
              : null,
            note: 'Try calling this endpoint multiple times quickly',
          });
        }),
  });

  // Custom plugin demonstration
  k.createChild({
    prefix: '/custom',
    configure: (kc) =>
      kc.applyPlugin(customPlugin).get('/demo', (ctx) =>
        ctx.res.json({
          message: 'Custom plugin demonstration',

          customData: ctx.req.customData,
          note: 'This uses a custom plugin that adds timestamp data',
        }),
      ),
  });

  // Combined plugins demonstration
  k.createChild({
    prefix: '/combined',
    configure: (kc) =>
      kc
        .applyPlugin(timingPlugin)
        .applyPlugin(requestIdPlugin)
        .applyPlugin(createCorsPlugin())
        .applyPlugin(createRateLimitPlugin({ max: 10 }))
        .get('/all-features', (ctx) =>
          ctx.res.json({
            message: 'This endpoint uses multiple plugins combined',

            requestId: ctx.req.requestId,
            note: 'Check headers for timing, CORS, rate limit, and request ID',
            features: ['timing', 'requestId', 'cors', 'rateLimit'],
          }),
        ),
  });

  // Initialization hook
  k.onInit(() => {
    k.log.info('Plugin System example initialized!');
    k.log.info('Available endpoints:');
    k.log.info('   GET  /              - Welcome message');
    k.log.info('   GET  /basic/public  - Basic plugins demo');
    k.log.info('   GET  /auth/protected - Auth plugin demo');
    k.log.info('   GET  /rate-limited/test - Rate limit demo');
    k.log.info('   GET  /custom/demo   - Custom plugin demo');
    k.log.info('   GET  /combined/all-features - Combined plugins demo');
    k.log.info('');
    k.log.info('Plugin System example ready!');
  });

  return k;
}
