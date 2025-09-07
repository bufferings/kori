import { describe, test, expect } from 'vitest';

import { joinPaths } from '../../../src/_internal/core/path.js';

describe('joinPaths', () => {
  describe('when prefix is empty', () => {
    test('when path is empty', () => {
      expect(joinPaths('', '')).toBe('/');
    });

    test('when path is single slash', () => {
      expect(joinPaths('', '/')).toBe('/');
    });

    test('when path has no leading slash', () => {
      expect(joinPaths('', 'users')).toBe('/users');
    });

    test('when path has single leading slash', () => {
      expect(joinPaths('', '/users')).toBe('/users');
    });

    test('when path has multiple leading slashes', () => {
      expect(joinPaths('', '///users')).toBe('/users');
    });
  });

  describe('when prefix is single slash', () => {
    test('when path is empty', () => {
      expect(joinPaths('/', '')).toBe('/');
    });

    test('when path is single slash', () => {
      expect(joinPaths('/', '/')).toBe('/');
    });

    test('when path has no leading slash', () => {
      expect(joinPaths('/', 'users')).toBe('/users');
    });

    test('when path has single leading slash', () => {
      expect(joinPaths('/', '/users')).toBe('/users');
    });

    test('when path has multiple leading slashes', () => {
      expect(joinPaths('/', '///users')).toBe('/users');
    });
  });

  describe('when prefix has no trailing slash', () => {
    test('when path is empty', () => {
      expect(joinPaths('/api', '')).toBe('/api');
    });

    test('when path is single slash', () => {
      expect(joinPaths('/api', '/')).toBe('/api/');
    });

    test('when path has no leading slash', () => {
      expect(joinPaths('/api', 'users')).toBe('/api/users');
    });

    test('when path has single leading slash', () => {
      expect(joinPaths('/api', '/users')).toBe('/api/users');
    });

    test('when path has multiple leading slashes', () => {
      expect(joinPaths('/api', '///users')).toBe('/api/users');
    });
  });

  describe('when prefix has single trailing slash', () => {
    test('when path is empty', () => {
      expect(joinPaths('/api/', '')).toBe('/api/');
    });

    test('when path is single slash', () => {
      expect(joinPaths('/api/', '/')).toBe('/api/');
    });

    test('when path has no leading slash', () => {
      expect(joinPaths('/api/', 'users')).toBe('/api/users');
    });

    test('when path has single leading slash', () => {
      expect(joinPaths('/api/', '/users')).toBe('/api/users');
    });

    test('when path has multiple leading slashes', () => {
      expect(joinPaths('/api/', '///users')).toBe('/api/users');
    });
  });

  describe('when prefix has multiple trailing slashes', () => {
    test('when path is empty', () => {
      expect(joinPaths('/api//', '')).toBe('/api/');
    });

    test('when path is single slash', () => {
      expect(joinPaths('/api//', '/')).toBe('/api/');
    });

    test('when path has no leading slash', () => {
      expect(joinPaths('/api//', 'users')).toBe('/api/users');
    });

    test('when path has single leading slash', () => {
      expect(joinPaths('/api//', '/users')).toBe('/api/users');
    });

    test('when path has multiple leading slashes', () => {
      expect(joinPaths('/api//', '///users')).toBe('/api/users');
    });
  });

  describe('complex path patterns', () => {
    test('handles multi-level paths', () => {
      expect(joinPaths('/api/v1', '/users')).toBe('/api/v1/users');
      expect(joinPaths('/admin/dashboard', 'settings/profile')).toBe('/admin/dashboard/settings/profile');
    });

    test('preserves path parameters', () => {
      expect(joinPaths('/api', '/users/:id')).toBe('/api/users/:id');
      expect(joinPaths('/api/', 'users/:id/posts/:postId')).toBe('/api/users/:id/posts/:postId');
    });
  });

  describe('when paths contain internal multiple slashes', () => {
    test('preserves internal multiple slashes in prefix', () => {
      expect(joinPaths('/api//v1', '/users')).toBe('/api//v1/users');
      expect(joinPaths('/api//v1/', '/users')).toBe('/api//v1/users');
      expect(joinPaths('/api//v1//', '/users')).toBe('/api//v1/users');
    });

    test('preserves internal multiple slashes in path', () => {
      expect(joinPaths('/api', '/users//profile')).toBe('/api/users//profile');
      expect(joinPaths('/api/', 'users//profile')).toBe('/api/users//profile');
      expect(joinPaths('/api//', 'users//profile')).toBe('/api/users//profile');
    });

    test('preserves internal multiple slashes in both prefix and path', () => {
      expect(joinPaths('/api//v1', '/users//profile')).toBe('/api//v1/users//profile');
      expect(joinPaths('/api//v1/', '/users//profile')).toBe('/api//v1/users//profile');
    });
  });
});
