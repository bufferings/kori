import { defineKoriPlugin } from 'kori';

export function zodOpenApiPlugin(): ReturnType<typeof defineKoriPlugin> {
  return defineKoriPlugin({
    name: 'zod-openapi',
    version: '0.0.1',
    apply: (kori) => {
      return kori.onInit((ctx) => {
        return ctx;
      });
    },
  });
}

export { createZodSchemaConverter } from './converter.js';
