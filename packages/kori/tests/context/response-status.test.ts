import { describe, test, expect } from 'vitest';

import { type KoriRequest } from '../../src/context/request.js';
import { createKoriResponse } from '../../src/context/response.js';
import { HttpStatus } from '../../src/http/index.js';

// Mock request for testing
const mockRequest = {
  header: () => 'application/json',
} as unknown as KoriRequest;

describe('KoriResponse status', () => {
  test('status() sets and returns correct status code', () => {
    const res = createKoriResponse(mockRequest);

    res.status(HttpStatus.NOT_FOUND);
    expect(res.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });

  test('status() can be chained with other methods', () => {
    const res = createKoriResponse(mockRequest);

    res.status(HttpStatus.CREATED).json({ message: 'Created' });
    expect(res.getStatus()).toBe(HttpStatus.CREATED);
  });

  test('status() is reflected in built response', () => {
    const res = createKoriResponse(mockRequest);

    res.status(HttpStatus.NO_CONTENT).empty();
    const response = res.build();
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
  });

  test('default status is 200 for json response', () => {
    const res = createKoriResponse(mockRequest);

    res.json({ message: 'OK' });
    const response = res.build();
    expect(response.status).toBe(HttpStatus.OK);
  });

  test('default status is 200 for text response', () => {
    const res = createKoriResponse(mockRequest);

    res.text('OK');
    const response = res.build();
    expect(response.status).toBe(HttpStatus.OK);
  });

  test('default status is 200 for html response', () => {
    const res = createKoriResponse(mockRequest);

    res.html('<p>OK</p>');
    const response = res.build();
    expect(response.status).toBe(HttpStatus.OK);
  });

  test('default status is 204 for empty response', () => {
    const res = createKoriResponse(mockRequest);

    res.empty();
    const response = res.build();
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
  });
});
