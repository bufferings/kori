import { describe, expect, test } from 'vitest';

import { createKori } from '../../src/index.js';

describe('Kori initialization methods', () => {
  test('generate().onStart() initializes application', async () => {
    const app = createKori();
    app.get('/', (ctx) => ctx.res.text('ok'));

    const { fetchHandler } = await app.generate().onStart();
    const res = await fetchHandler(new Request('http://localhost/'));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  test('start() shortcut initializes application', async () => {
    const app = createKori();
    app.get('/', (ctx) => ctx.res.text('ok'));

    const { fetchHandler } = await app.start();
    const res = await fetchHandler(new Request('http://localhost/'));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });
});
