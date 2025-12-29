import { describe, test, expect, expectTypeOf } from 'vitest';

import { createKoriResponse, isKoriResponse, type KoriResponse } from '../../src/context/response.js';

describe('KoriResponse build contract', () => {
  test('build() returns a Response with status, headers, and body', async () => {
    const res = createKoriResponse().json({ ok: true });

    const response = res.build();

    expect(response instanceof Response).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  test('build() can be called only once', () => {
    const res = createKoriResponse().json({ ok: true });

    const r1 = res.build();

    expect(r1.status).toBe(200);
    expect(() => res.build()).toThrow();
  });
});

describe('KoriResponse flags and type guard', () => {
  test('isReady/isStream reflect body kind', () => {
    const r0 = createKoriResponse();
    expect(r0.isReady()).toBe(false);
    expect(r0.isStream()).toBe(false);

    const r1 = createKoriResponse().json({ ok: true });
    expect(r1.isReady()).toBe(true);
    expect(r1.isStream()).toBe(false);

    const r2 = createKoriResponse().text('hi');
    expect(r2.isReady()).toBe(true);
    expect(r2.isStream()).toBe(false);

    const r3 = createKoriResponse().html('<p>x</p>');
    expect(r3.isReady()).toBe(true);
    expect(r3.isStream()).toBe(false);

    const r4 = createKoriResponse().empty();
    expect(r4.isReady()).toBe(true);
    expect(r4.isStream()).toBe(false);

    const r5 = createKoriResponse().stream(new ReadableStream());
    expect(r5.isReady()).toBe(true);
    expect(r5.isStream()).toBe(true);
  });

  test('isKoriResponse type guard (runtime and type)', () => {
    const res = createKoriResponse();
    // runtime
    expect(isKoriResponse(res)).toBe(true);
    expect(isKoriResponse({})).toBe(false);

    // type narrowing
    const unknownVal: unknown = res;
    if (isKoriResponse(unknownVal)) {
      expectTypeOf(unknownVal).toEqualTypeOf<KoriResponse>();
      expectTypeOf(unknownVal.json).toBeFunction();
    }
    // @ts-expect-error - not narrowed outside guard
    expectTypeOf(unknownVal.json).toBeAny();
  });
});
