import { createKori, defineKoriPlugin, type KoriEnvironment, type KoriRequest, type KoriResponse } from 'kori';

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
  user?: { id: string; role: string }; // Optional, only present when authenticated is true
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
  apply: (kori) => {
    return kori
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

  return defineKoriPlugin<KoriEnvironment, KoriRequest, KoriResponse, unknown, unknown>({
    name: 'cors',
    apply: (kori) => {
      return kori.onResponse((ctx) => {
        ctx.res.setHeader('Access-Control-Allow-Origin', config.origin);
        ctx.res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '));
        ctx.res.setHeader('Access-Control-Allow-Headers', config.headers.join(', '));
        ctx.res.setHeader('Access-Control-Allow-Credentials', config.credentials.toString());
      });
    },
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
    apply: (kori) => {
      return kori
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
        });
    },
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
  apply: (kori) => {
    return kori
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
      });
  },
});

// Auth plugin factory with proper types
function createAuthPlugin(options: { secretKey: string }) {
  return defineKoriPlugin<KoriEnvironment, KoriRequest, KoriResponse, unknown, AuthRequestExtension>({
    name: 'auth',
    apply: (kori) => {
      return kori.onRequest((ctx) => {
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
      });
    },
  });
}

// Create app with plugins applied individually for proper type inference
const app = createKori()
  .applyPlugin(timingPlugin)
  .applyPlugin(createCorsPlugin())
  .applyPlugin(createRateLimitPlugin())
  .applyPlugin(requestIdPlugin)
  .applyPlugin(createAuthPlugin({ secretKey: process.env.DEMO_AUTH_TOKEN ?? 'demo-token-replace-in-production' }))
  .get('/public', (ctx) =>
    // Type inference should work properly with individual plugin application
    ctx.res.json({
      message: 'This is a public endpoint',
      requestId: ctx.req.requestId,
    }),
  )
  .get('/protected', (ctx) => {
    // Type inference should work properly with individual plugin application
    const { authenticated, user, requestId } = ctx.req;

    if (!authenticated || !user) {
      return ctx.res.status(401).json({ message: 'Authentication required' });
    }

    return ctx.res.json({
      message: 'This is a protected endpoint',
      user,
      requestId,
    });
  })
  .get('/rate-limit-test', (ctx) => {
    // Type inference should work properly with individual plugin application
    const { rateLimit } = ctx.req;

    return ctx.res.json({
      message: 'Rate limit test',
      rateLimit: rateLimit
        ? {
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
            resetTime: new Date(rateLimit.reset).toISOString(),
          }
        : null,
    });
  });

// Example of a custom plugin with proper types
const customPlugin = defineKoriPlugin<KoriEnvironment, KoriRequest, KoriResponse, unknown, CustomDataRequestExtension>({
  name: 'customPlugin',
  apply: (kori) => {
    return kori
      .onInit((ctx) => {
        // Custom plugin initialized
        return ctx;
      })
      .onRequest((ctx) => {
        // Custom plugin processing request
        return ctx.withReq({ customData: { timestamp: Date.now() } });
      });
  },
});

const pluginApp = createKori()
  .applyPlugin(customPlugin)
  .get('/custom', (ctx) =>
    // Type inference should work properly with individual plugin application
    ctx.res.json({
      message: 'Custom plugin example',
      customData: ctx.req.customData,
    }),
  );

export { app, pluginApp };
