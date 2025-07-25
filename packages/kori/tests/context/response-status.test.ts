import { describe, test, expect } from 'vitest';

import { createKoriResponse } from '../../src/context/response.js';
import { HttpStatus } from '../../src/http/index.js';

describe('KoriResponse status code handling', () => {
  test('uninitialized response returns 200 OK by default', () => {
    const res = createKoriResponse();

    // No body method called - should default to 200 OK
    const response = res.build();
    expect(response.status).toBe(HttpStatus.OK);
  });

  test('explicit empty() call returns 204 No Content', () => {
    const res = createKoriResponse();

    res.empty();
    const response = res.build();
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
  });

  test('json response returns 200 OK by default', () => {
    const res = createKoriResponse();

    res.json({ message: 'test' });
    const response = res.build();
    expect(response.status).toBe(HttpStatus.OK);
  });

  test('text response returns 200 OK by default', () => {
    const res = createKoriResponse();

    res.text('Hello World');
    const response = res.build();
    expect(response.status).toBe(HttpStatus.OK);
  });

  test('html response returns 200 OK by default', () => {
    const res = createKoriResponse();

    res.html('<h1>Hello</h1>');
    const response = res.build();
    expect(response.status).toBe(HttpStatus.OK);
  });

  test('explicit status code overrides default behavior', () => {
    const res = createKoriResponse();

    // Set explicit status code before empty()
    res.status(HttpStatus.ACCEPTED).empty();
    const response = res.build();
    expect(response.status).toBe(HttpStatus.ACCEPTED);
  });

  test('explicit status code overrides default for uninitialized response', () => {
    const res = createKoriResponse();

    // Set explicit status code without calling any body method
    res.status(HttpStatus.NOT_FOUND);
    const response = res.build();
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
  });
});
