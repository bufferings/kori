import { describe, test, expect } from 'vitest';

import { joinPaths, hasNonTrailingOptionalParam } from '../../../src/_internal/core/path.js';

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

describe('hasNonTrailingOptionalParam', () => {
  describe('returns true for middle optional parameters', () => {
    test('single middle optional', () => {
      expect(hasNonTrailingOptionalParam('/api/:version?/users')).toBe(true);
    });

    test('multiple middle optionals', () => {
      expect(hasNonTrailingOptionalParam('/:lang?/api/:version?/users/:id')).toBe(true);
    });

    test('optional with constraints in middle', () => {
      expect(hasNonTrailingOptionalParam('/api/:version{v[0-9]+}?/users/:id')).toBe(true);
    });

    test('complex pattern', () => {
      expect(hasNonTrailingOptionalParam('/prefix/:opt1?/middle/:opt2?/suffix')).toBe(true);
    });

    test('optional parameter followed by trailing slash', () => {
      expect(hasNonTrailingOptionalParam('/api/:version?/')).toBe(true);
    });

    test('optional parameter with constraint followed by trailing slash', () => {
      expect(hasNonTrailingOptionalParam('/users/:id{[0-9]+}?/')).toBe(true);
    });
  });

  describe('returns false for valid patterns', () => {
    test('trailing optional parameter', () => {
      expect(hasNonTrailingOptionalParam('/api/users/:id?')).toBe(false);
    });

    test('no optional parameters', () => {
      expect(hasNonTrailingOptionalParam('/api/users/:id')).toBe(false);
    });

    test('optional with constraints at end', () => {
      expect(hasNonTrailingOptionalParam('/api/users/:id{[0-9]+}?')).toBe(false);
    });

    test('empty path', () => {
      expect(hasNonTrailingOptionalParam('')).toBe(false);
    });

    test('root path', () => {
      expect(hasNonTrailingOptionalParam('/')).toBe(false);
    });

    test('fixed path without parameters', () => {
      expect(hasNonTrailingOptionalParam('/health')).toBe(false);
    });

    test('root level optional only', () => {
      expect(hasNonTrailingOptionalParam('/:version?')).toBe(false);
    });

    test('optional parameter at end only', () => {
      expect(hasNonTrailingOptionalParam('/users/:id/posts/:slug?')).toBe(false);
    });
  });
});
