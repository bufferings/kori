import { describe, test, expect, expectTypeOf } from 'vitest';

import { type KoriRequest } from '../../src/context/request.js';
import { createKoriResponse, isKoriResponse, type KoriResponse } from '../../src/context/response.js';

const mockReq = { header: () => undefined } as unknown as KoriRequest;

describe('KoriResponse build contract', () => {
  test('build() returns a Response with status, headers, and body', async () => {
    const res = createKoriResponse(mockReq).json({ ok: true });

    const response = res.build();

    expect(response instanceof Response).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  test('build() can be called only once', () => {
    const res = createKoriResponse(mockReq).json({ ok: true });

    const r1 = res.build();

    expect(r1.status).toBe(200);
    expect(() => res.build()).toThrow();
  });
});

describe('KoriResponse flags and type guard', () => {
  test('isReady/isStream reflect body kind', () => {
    const r0 = createKoriResponse(mockReq);
    expect(r0.isReady()).toBe(false);
    expect(r0.isStream()).toBe(false);

    const r1 = createKoriResponse(mockReq).json({ ok: true });
    expect(r1.isReady()).toBe(true);
    expect(r1.isStream()).toBe(false);

    const r2 = createKoriResponse(mockReq).text('hi');
    expect(r2.isReady()).toBe(true);
    expect(r2.isStream()).toBe(false);

    const r3 = createKoriResponse(mockReq).html('<p>x</p>');
    expect(r3.isReady()).toBe(true);
    expect(r3.isStream()).toBe(false);

    const r4 = createKoriResponse(mockReq).empty();
    expect(r4.isReady()).toBe(true);
    expect(r4.isStream()).toBe(false);

    const r5 = createKoriResponse(mockReq).stream(new ReadableStream());
    expect(r5.isReady()).toBe(true);
    expect(r5.isStream()).toBe(true);
  });

  test('isKoriResponse type guard (runtime and type)', () => {
    const res = createKoriResponse(mockReq);
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
