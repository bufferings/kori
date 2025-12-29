import { createKori } from '@korix/kori';
import { describe, expect, test } from 'vitest';

import { stdSchemaOpenApiPlugin } from '../src/std-schema-openapi-plugin.js';

describe('std-schema-openapi-plugin', () => {
  test('creates plugin with Standard JSON Schema converter', () => {
    const app = createKori().applyPlugin(
      stdSchemaOpenApiPlugin({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      }),
    );

    expect(app).toBeDefined();
  });
});
