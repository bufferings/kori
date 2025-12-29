import { createKori } from '@korix/kori';
import { stdSchemaOpenApiPlugin } from '@korix/std-schema-openapi-plugin';
import { describe, test, expect } from 'vitest';

import { swaggerUiPlugin } from '../src/index.js';

describe('swaggerUiPlugin', () => {
  test('registers routes for Swagger UI', () => {
    const app = createKori()
      .applyPlugin(
        stdSchemaOpenApiPlugin({
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

  test('uses default options when none provided', () => {
    const app = createKori()
      .applyPlugin(
        stdSchemaOpenApiPlugin({
          info: { title: 'Test API', version: '1.0.0' },
        }),
      )
      .applyPlugin(swaggerUiPlugin());

    expect(app).toBeDefined();
  });
});
