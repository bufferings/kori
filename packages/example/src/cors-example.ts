import { createKori } from '@korix/kori';
import { corsPlugin } from 'kori-cors-plugin';

// Basic CORS setup - allows all origins
const app1 = createKori()
  .applyPlugin(corsPlugin())
  .get('/api/data', (ctx) => {
    return ctx.res.json({ message: 'Hello from CORS-enabled API!' });
  });

// Specific origin configuration with credentials (CORS compliant)
const app2 = createKori()
  .applyPlugin(
    corsPlugin({
      origin: 'https://example.com', // Specific origin required when credentials: true
      credentials: true,
    }),
  )
  .get('/api/secure', (ctx) => {
    return ctx.res.json({ data: 'Secure data' });
  });

// Multiple origins
const app3 = createKori()
  .applyPlugin(
    corsPlugin({
      origin: ['https://app1.com', 'https://app2.com'],
      methods: ['GET', 'POST', 'PUT'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Total-Count'],
      maxAge: 3600, // 1 hour
    }),
  )
  .get('/api/multi-origin', (ctx) => {
    return ctx.res.json({ message: 'Multi-origin enabled' });
  });

// Dynamic origin validation
const app4 = createKori()
  .applyPlugin(
    corsPlugin({
      origin: (origin: string | undefined, req: any) => {
        // Allow requests from subdomains of example.com
        if (!origin) return false;
        return origin.endsWith('.example.com') || origin === 'https://example.com';
      },
      credentials: true,
    }),
  )
  .get('/api/dynamic', (ctx) => {
    return ctx.res.json({ message: 'Dynamic origin validation' });
  });

// Preflight continue example (no credentials with wildcard origin)
const app5 = createKori()
  .applyPlugin(
    corsPlugin({
      origin: true, // Wildcard origin - credentials must be false
      preflightContinue: true,
      optionsSuccessStatus: 200,
      credentials: false, // Explicit to show CORS compliance
    }),
  )
  .options('/api/custom-preflight', (ctx) => {
    // Custom preflight handling
    return ctx.res.json({ message: 'Custom preflight response' });
  })
  .post('/api/custom-preflight', (ctx) => {
    return ctx.res.json({ message: 'POST request after preflight' });
  });

export { app1, app2, app3, app4, app5 };
