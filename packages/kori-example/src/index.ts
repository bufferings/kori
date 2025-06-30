import { createKori } from 'kori';
import { startNodeServer } from 'kori-nodejs-adapter';
import { scalarUIPlugin } from 'kori-openapi-ui-scalar';
import { zodOpenApiPlugin } from 'kori-zod-openapi-plugin';
import { createKoriZodRequestValidator } from 'kori-zod-validator';

import { configure as configure01 } from './01-getting-started.js';
import { configure as configure02 } from './02-basic-routing.js';
import { configure as configure03 } from './03-validation.js';
import { configure as configure04 } from './04-lifecycle-hooks.js';
import { configure as configure05 } from './05-plugin-system.js';
import { configure as configure06 } from './06-child-instances.js';
import { configure as configure07 } from './07-logging.js';
import { configure as configure08 } from './08-error-handling.js';
import { configure as configure09 } from './09-openapi.js';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'Kori Framework Examples',
        version: '1.0.0',
        description: 'Collection of standalone examples demonstrating Kori features.',
      },
      servers: [{ url: 'http://localhost:3000', description: 'Local dev' }],
    }),
  )
  .applyPlugin(
    scalarUIPlugin({
      title: 'Kori Examples – API Docs',
      theme: 'auto',
    }),
  );

// Landing page with links to each example
app.get('/', (ctx) => {
  const links = [
    ['01 - Getting Started', '/01-getting-started'],
    ['02 - Basic Routing', '/02-basic-routing'],
    ['03 - Validation', '/03-validation'],
    ['04 - Lifecycle Hooks', '/04-lifecycle-hooks'],
    ['05 - Plugin System', '/05-plugin-system'],
    ['06 - Child Instances', '/06-child-instances'],
    ['07 - Logging', '/07-logging'],
    ['08 - Error Handling', '/08-error-handling'],
    ['09 - OpenAPI', '/09-openapi'],
  ]
    .map(([title, href]) => `<li><a href="${href}">${title}</a></li>`) 
    .join('');

  return ctx.res.html(`<!DOCTYPE html>
<html><head><title>Kori Examples</title></head><body>
<h1>Kori Framework – Examples</h1>
<ul>${links}</ul>
<p>API documentation available at <a href="/docs">/docs</a>.</p>
</body></html>`);
});

// Mount each example under its prefix
app.createChild({ prefix: '/01-getting-started', configure: configure01 });
app.createChild({ prefix: '/02-basic-routing', configure: configure02 });
app.createChild({ prefix: '/03-validation', configure: configure03 });
app.createChild({ prefix: '/04-lifecycle-hooks', configure: configure04 });
app.createChild({ prefix: '/05-plugin-system', configure: configure05 });
app.createChild({ prefix: '/06-child-instances', configure: configure06 });
app.createChild({ prefix: '/07-logging', configure: configure07 });
app.createChild({ prefix: '/08-error-handling', configure: configure08 });
app.createChild({ prefix: '/09-openapi', configure: configure09 });

await startNodeServer(app, { port: 3000, host: 'localhost' });
