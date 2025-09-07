import { describe, test, expect } from 'vitest';

import { joinPaths } from '../../../src/_internal/core/path.js';

describe('joinPaths', () => {
  describe('normal cases', () => {
    test('joins prefix and path with single slash', () => {
      expect(joinPaths('/api', '/users')).toBe('/api/users');
    });

    test('adds missing slash when path has no leading slash', () => {
      expect(joinPaths('/api', 'users')).toBe('/api/users');
    });

    test('removes duplicate slash when prefix ends with slash', () => {
      expect(joinPaths('/api/', '/users')).toBe('/api/users');
    });

    test('handles both prefix ending with slash and path without leading slash', () => {
      expect(joinPaths('/api/', 'users')).toBe('/api/users');
    });
  });

  describe('edge cases', () => {
    test('returns path when prefix is empty', () => {
      expect(joinPaths('', '/users')).toBe('/users');
      expect(joinPaths('', 'users')).toBe('/users');
    });

    test('returns prefix when path is empty', () => {
      expect(joinPaths('/api', '')).toBe('/api');
      expect(joinPaths('/api/', '')).toBe('/api/');
    });

    test('handles both empty prefix and path as root path', () => {
      expect(joinPaths('', '')).toBe('/');
    });

    test('handles root paths', () => {
      expect(joinPaths('/', '/users')).toBe('/users');
      expect(joinPaths('/api', '/')).toBe('/api/');
    });
  });

  describe('nested prefixes', () => {
    test('handles multiple level prefixes', () => {
      expect(joinPaths('/api/v1', '/users')).toBe('/api/v1/users');
      expect(joinPaths('/api/v1/', '/users')).toBe('/api/v1/users');
    });

    test('joins complex paths', () => {
      expect(joinPaths('/admin/dashboard', 'settings/profile')).toBe('/admin/dashboard/settings/profile');
    });
  });

  describe('path parameters', () => {
    test('preserves path parameters', () => {
      expect(joinPaths('/api', '/users/:id')).toBe('/api/users/:id');
      expect(joinPaths('/api/', 'users/:id/posts/:postId')).toBe('/api/users/:id/posts/:postId');
    });
  });
});
