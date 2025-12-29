import { describe, test, expect } from 'vitest';

import { createKoriResponse } from '../../src/context/response.js';

describe('KoriResponse status', () => {
  test('status() sets and returns correct status code', () => {
    const res = createKoriResponse();

    res.status(404);
    expect(res.getStatus()).toBe(404);
  });

  test('status() can be chained with other methods', () => {
    const res = createKoriResponse();

    res.status(201).json({ message: 'Created' });
    expect(res.getStatus()).toBe(201);
  });

  test('status() is reflected in built response', () => {
    const res = createKoriResponse();

    res.status(204).empty();
    const response = res.build();
    expect(response.status).toBe(204);
  });

  test('default status is 200 for json response', () => {
    const res = createKoriResponse();

    res.json({ message: 'OK' });
    const response = res.build();
    expect(response.status).toBe(200);
  });

  test('default status is 200 for text response', () => {
    const res = createKoriResponse();

    res.text('OK');
    const response = res.build();
    expect(response.status).toBe(200);
  });

  test('default status is 200 for html response', () => {
    const res = createKoriResponse();

    res.html('<p>OK</p>');
    const response = res.build();
    expect(response.status).toBe(200);
  });

  test('default status is 204 for empty response', () => {
    const res = createKoriResponse();

    res.empty();
    const response = res.build();
    expect(response.status).toBe(204);
  });

  test('getStatus default is 200 before build when nothing set', () => {
    const res = createKoriResponse();
    expect(res.getStatus()).toBe(200);
  });

  test('getStatus is 204 after empty() before build', () => {
    const res = createKoriResponse();
    res.empty();
    expect(res.getStatus()).toBe(204);
  });

  test('json() then status(...) overrides default (pre/post build)', () => {
    const res = createKoriResponse();
    res.json({ ok: true });
    expect(res.getStatus()).toBe(200);

    res.status(201);
    expect(res.getStatus()).toBe(201);

    const built = res.build();
    expect(built.status).toBe(201);
  });

  test('empty() then status(...) overrides 204 default (pre/post build)', () => {
    const res = createKoriResponse();
    res.empty();
    expect(res.getStatus()).toBe(204);

    res.status(202);
    expect(res.getStatus()).toBe(202);

    const built = res.build();
    expect(built.status).toBe(202);
  });

  test('status(...) then json() is reflected in built response', () => {
    const res = createKoriResponse();
    res.status(201).json({ ok: true });
    const response = res.build();
    expect(response.status).toBe(201);
  });
});
