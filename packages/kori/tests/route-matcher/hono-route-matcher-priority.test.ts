import { describe, test, expect } from 'vitest';

import { createHonoRouteMatcher } from '../../src/route-matcher/index.js';

function createRequest(url: string, method: string): Request {
  return new Request(url, { method });
}

function routeId(label: string): symbol {
  return Symbol(label);
}

describe('HonoRouteMatcher route priority and conflict resolution', () => {
  test('first registration wins for duplicate routes', () => {
    const matcher = createHonoRouteMatcher();
    const first = routeId('first');
    const second = routeId('second');
    matcher.addRoute({ method: 'GET', path: '/same', routeId: first });
    matcher.addRoute({ method: 'GET', path: '/same', routeId: second });

    const compiled = matcher.compile();
    const match = compiled(createRequest('https://example.com/same', 'GET'));

    expect(match?.routeId).toBe(first);
  });

  test('registration order takes precedence - specific registered first', () => {
    const matcher = createHonoRouteMatcher();
    const specific = routeId('specific');
    const param = routeId('param');

    matcher.addRoute({ method: 'GET', path: '/book/a', routeId: specific });
    matcher.addRoute({ method: 'GET', path: '/book/:slug', routeId: param });
    const compiled = matcher.compile();

    const specificMatch = compiled(createRequest('https://example.com/book/a', 'GET'));
    expect(specificMatch?.routeId).toBe(specific);

    const paramMatch = compiled(createRequest('https://example.com/book/b', 'GET'));
    expect(paramMatch?.routeId).toBe(param);
  });

  test('registration order takes precedence - param registered first', () => {
    const matcher = createHonoRouteMatcher();
    const specific = routeId('specific');
    const param = routeId('param');

    matcher.addRoute({ method: 'GET', path: '/book/:slug', routeId: param });
    matcher.addRoute({ method: 'GET', path: '/book/a', routeId: specific });
    const compiled = matcher.compile();

    const specificPathMatch = compiled(createRequest('https://example.com/book/a', 'GET'));
    expect(specificPathMatch?.routeId).toBe(param);

    const paramPathMatch = compiled(createRequest('https://example.com/book/b', 'GET'));
    expect(paramPathMatch?.routeId).toBe(param);
  });
});
