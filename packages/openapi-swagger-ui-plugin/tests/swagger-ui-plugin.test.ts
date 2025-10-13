import { createKori } from '@korix/kori';
import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
import { describe, it, expect } from 'vitest';

import { swaggerUiPlugin } from '../src/index.js';

describe('swaggerUiPlugin', () => {
  it('should register routes for Swagger UI', () => {
    const app = createKori()
      .applyPlugin(
        zodOpenApiPlugin({
          info: { title: 'Test API', version: '1.0.0' },
        }),
      )
      .applyPlugin(
        swaggerUiPlugin({
          path: '/docs',
          title: 'Test Documentation',
        }),
      );

    expect(app).toBeDefined();
  });

  it('should use default options when none provided', () => {
    const app = createKori()
      .applyPlugin(
        zodOpenApiPlugin({
          info: { title: 'Test API', version: '1.0.0' },
        }),
      )
      .applyPlugin(swaggerUiPlugin());

    expect(app).toBeDefined();
  });
});
