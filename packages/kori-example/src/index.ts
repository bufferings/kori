import { createKori } from 'kori';
import { startNodeServer } from 'kori-nodejs-adapter';
import { scalarUIPlugin } from 'kori-openapi-ui-scalar';
import { zodOpenApiPlugin } from 'kori-zod-openapi-plugin';
import { createKoriZodRequestValidator } from 'kori-zod-validator';

import { configure as configureGettingStarted } from './01-getting-started.js';
import { configure as configureBasicRouting } from './02-basic-routing.js';
import { configure as configureValidation } from './03-validation.js';
import { configure as configureLifecycleHooks } from './04-lifecycle-hooks.js';
import { configure as configurePluginSystem, configureCustom as configureCustomPlugin } from './05-plugin-system.js';
import { configure as configureChildInstances } from './06-child-instances.js';
import { configure as configureLogging } from './07-logging.js';
import { configure as configureErrorHandling, configureGraceful as configureGracefulErrors } from './08-error-handling.js';
import { configure as configureOpenApi } from './09-openapi.js';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'Kori Framework Examples',
        version: '1.0.0',
        description: 'Comprehensive examples demonstrating Kori framework capabilities',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
    }),
  )
  .applyPlugin(
    scalarUIPlugin({
      title: 'Kori Framework Examples - API Documentation',
      theme: 'auto',
    }),
  );

app.get('/', (ctx) => {
  return ctx.res.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kori Framework Examples</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
          }
          h1 { color: #333; }
          h2 { color: #555; margin-top: 2rem; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
          .card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 1rem;
            background: #f9f9f9;
          }
          .card h3 { margin-top: 0; color: #0066cc; }
          a {
            color: #0066cc;
            text-decoration: none;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            transition: background 0.2s;
          }
          a:hover { background: #e6f3ff; }
          .docs-link {
            display: inline-block;
            background: #0066cc;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            font-weight: bold;
            margin: 1rem 0;
          }
          .docs-link:hover { background: #0052a3; color: white; }
        </style>
      </head>
      <body>
        <h1>Kori Framework Examples</h1>
        <p>Welcome to the comprehensive Kori framework examples. This server demonstrates all major features and capabilities.</p>
        
        <a href="/docs" class="docs-link">View API Documentation (Scalar UI)</a>
        
        <div class="grid">
          <div class="card">
            <h3>01 - Getting Started</h3>
            <p>Basic Kori usage, hello world, path parameters, query parameters, validation</p>
            <a href="/01-getting-started/">Welcome message</a><br>
            <a href="/01-getting-started/hello/World">Greeting</a><br>
            <a href="/01-getting-started/search?q=kori">Search</a>
          </div>
          
          <div class="card">
            <h3>02 - Basic Routing</h3>
            <p>HTTP methods, path parameters, different response types</p>
            <a href="/02-basic-routing/hello/World">GET /hello/:name</a><br>
            <a href="/02-basic-routing/users">GET /users</a><br>
            <a href="/02-basic-routing/text">Plain text response</a>
          </div>
          
          <div class="card">
            <h3>03 - Validation</h3>
            <p>Request validation with Zod schemas</p>
            <a href="/03-validation/users?page=1&limit=5">GET /users (with query validation)</a><br>
            <p>POST /users (with body validation)</p>
          </div>
          
          <div class="card">
            <h3>04 - Lifecycle Hooks</h3>
            <p>Request lifecycle management and hooks</p>
            <a href="/04-lifecycle-hooks/health">GET /health</a><br>
            <a href="/04-lifecycle-hooks/slow">GET /slow (2s delay)</a><br>
            <a href="/04-lifecycle-hooks/data/123">GET /data/:id</a>
          </div>
          
          <div class="card">
            <h3>05 - Plugin System</h3>
            <p>Timing, CORS, rate limiting, authentication plugins</p>
            <a href="/05-plugin-system/public">GET /public</a><br>
            <a href="/05-plugin-system/protected">GET /protected (needs auth)</a><br>
            <a href="/05-plugin-system/rate-limit-test">GET /rate-limit-test</a>
          </div>
          
          <div class="card">
            <h3>06 - Child Instances</h3>
            <p>API versioning and nested routing</p>
            <a href="/06-child-instances/api/v1/users">GET /api/v1/users</a><br>
            <a href="/06-child-instances/api/v2/users">GET /api/v2/users</a><br>
            <a href="/06-child-instances/admin/stats">GET /admin/stats (needs header)</a>
          </div>
          
          <div class="card">
            <h3>07 - Logging</h3>
            <p>Different logging strategies and performance tracking</p>
            <a href="/07-logging/simple/hello">GET /simple/hello</a><br>
            <a href="/07-logging/contextual/user/123">GET /contextual/user/:id</a><br>
            <a href="/07-logging/performance/metrics">GET /performance/metrics</a>
          </div>
          
          <div class="card">
            <h3>08 - Error Handling</h3>
            <p>Custom error types and error handling strategies</p>
            <a href="/08-error-handling/error/basic">GET /error/basic</a><br>
            <a href="/08-error-handling/error/custom">GET /error/custom</a><br>
            <a href="/08-error-handling/safe/divide">GET /safe/divide</a>
          </div>
          
          <div class="card">
            <h3>09 - OpenAPI</h3>
            <p>OpenAPI documentation and Zod schema integration</p>
            <a href="/09-openapi/users">GET /users (with OpenAPI docs)</a><br>
            <a href="/09-openapi/users/1">GET /users/:id</a><br>
            <p>POST /users (with request validation)</p>
          </div>
        </div>
      </body>
      </html>
    `);
});

// Mount each example with its own prefix
app.createChild({
  prefix: '/01-getting-started',
  configure: configureGettingStarted,
});

app.createChild({
  prefix: '/02-basic-routing',
  configure: configureBasicRouting,
});

app.createChild({
  prefix: '/03-validation',
  configure: configureValidation,
});

app.createChild({
  prefix: '/04-lifecycle-hooks',
  configure: configureLifecycleHooks,
});

app.createChild({
  prefix: '/05-plugin-system',
  configure: configurePluginSystem,
});

app.createChild({
  prefix: '/05-plugin-custom',
  configure: configureCustomPlugin,
});

app.createChild({
  prefix: '/06-child-instances',
  configure: configureChildInstances,
});

app.createChild({
  prefix: '/07-logging',
  configure: configureLogging,
});

app.createChild({
  prefix: '/08-error-handling',
  configure: configureErrorHandling,
});

app.createChild({
  prefix: '/08-graceful-errors',
  configure: configureGracefulErrors,
});

app.createChild({
  prefix: '/09-openapi',
  configure: configureOpenApi,
});

app.onInit(() => {
  app.log.info('Kori comprehensive example server starting...');
  app.log.info('Main page available at: http://localhost:3000');
  app.log.info('');
  app.log.info('Available example categories:');
  app.log.info('  * 01 - Getting Started: /01-getting-started/*');
  app.log.info('  * 02 - Basic Routing: /02-basic-routing/*');
  app.log.info('  * 03 - Validation: /03-validation/*');
  app.log.info('  * 04 - Lifecycle Hooks: /04-lifecycle-hooks/*');
  app.log.info('  * 05 - Plugin System: /05-plugin-system/*');
  app.log.info('  * 06 - Child Instances: /06-child-instances/*');
  app.log.info('  * 07 - Logging: /07-logging/*');
  app.log.info('  * 08 - Error Handling: /08-error-handling/*');
  app.log.info('  * 09 - OpenAPI: /09-openapi/*');
  app.log.info('');
  app.log.info('All individual examples are now properly integrated and accessible!');
});

await startNodeServer(app, { port: 3000, host: 'localhost' });
app.log.info('Kori comprehensive example server started on http://localhost:3000');
