import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

import { createKori } from '@korix/kori';
import { createNodeFileAdapter } from '@korix/file-adapter-node';
import { serveStaticPlugin } from '../src/serve-static-plugin.js';

describe('Serve Static Plugin', () => {
  let tempDir: string;
  
  // Helper function to test static plugin
  async function testStaticPlugin(
    plugin: ReturnType<typeof serveStaticPlugin>,
    requestPath: string,
    init?: RequestInit
  ): Promise<Response> {
    const handler = createKori().applyPlugin(plugin);
    const { fetchHandler } = await handler.generate().onStart();
    return fetchHandler(new Request(`http://localhost${requestPath}`, init));
  }
  
  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(import.meta.dirname, 'test-static-'));
  });
  
  afterAll(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  beforeEach(async () => {
    // Clean up files before each test
    try {
      const files = await fs.readdir(tempDir);
      await Promise.all(
        files.map(file => fs.rm(path.join(tempDir, file), { recursive: true, force: true }))
      );
    } catch {
      // Ignore cleanup errors
    }
  });
  
  describe('Basic file serving', () => {
    test('serves static files', async () => {
      const content = '<html><body>Hello World</body></html>';
      await fs.writeFile(path.join(tempDir, 'index.html'), content);
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/index.html'
      );
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(content);
      expect(response.headers.get('content-type')).toBe('text/html');
    });
    
    test('returns 404 for non-existent files', async () => {
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/nonexistent.html'
      );
      
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not Found');
    });
    
    test('handles different file types', async () => {
      await fs.writeFile(path.join(tempDir, 'style.css'), 'body { color: red; }');
      await fs.writeFile(path.join(tempDir, 'script.js'), 'console.log("hello");');
      await fs.writeFile(path.join(tempDir, 'data.json'), '{"key": "value"}');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      
      const cssResponse = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/assets', adapter }),
        '/assets/style.css'
      );
      expect(cssResponse.headers.get('content-type')).toBe('text/css');
      
      const jsResponse = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/assets', adapter }),
        '/assets/script.js'
      );
      expect(jsResponse.headers.get('content-type')).toBe('application/javascript');
      
      const jsonResponse = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/assets', adapter }),
        '/assets/data.json'
      );
      expect(jsonResponse.headers.get('content-type')).toBe('application/json');
    });
  });
  
  describe('HTTP caching', () => {
    test('sets ETag header', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter, etag: true }),
        '/static/test.txt'
      );
      
      expect(response.status).toBe(200);
      expect(response.headers.get('etag')).toBeTruthy();
    });
    
    test('sets Last-Modified header', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter, lastModified: true }),
        '/static/test.txt'
      );
      
      expect(response.status).toBe(200);
      expect(response.headers.get('last-modified')).toBeTruthy();
    });
    
    test('sets Cache-Control header with maxAge', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ 
          mountAt: '/static', 
          adapter, 
          maxAge: 3600,
          immutable: true,
        }),
        '/static/test.txt'
      );
      
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('public, max-age=3600, immutable');
    });
    
    test('returns 304 Not Modified for matching ETag', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      
      // First request to get ETag
      const firstResponse = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter, etag: true }),
        '/static/test.txt'
      );
      const etag = firstResponse.headers.get('etag');
      
      // Second request with If-None-Match
      const secondResponse = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter, etag: true }),
        '/static/test.txt',
        { headers: { 'If-None-Match': etag! } }
      );
      
      expect(secondResponse.status).toBe(304);
    });
    
    test('returns 304 Not Modified for matching Last-Modified', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      
      // First request to get Last-Modified
      const firstResponse = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter, lastModified: true }),
        '/static/test.txt'
      );
      const lastModified = firstResponse.headers.get('last-modified');
      
      // Second request with If-Modified-Since
      const secondResponse = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter, lastModified: true }),
        '/static/test.txt',
        { headers: { 'If-Modified-Since': lastModified! } }
      );
      
      expect(secondResponse.status).toBe(304);
    });
  });
  
  describe('HEAD requests', () => {
    test('supports HEAD requests with correct headers', async () => {
      const content = 'test content for HEAD';
      await fs.writeFile(path.join(tempDir, 'test.txt'), content);
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/test.txt',
        { method: 'HEAD' }
      );
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/plain');
      expect(response.headers.get('content-length')).toBe(content.length.toString());
      expect(await response.text()).toBe(''); // No body for HEAD
    });
  });
  
  describe('Index files', () => {
    test('serves index.html for directory requests', async () => {
      await fs.mkdir(path.join(tempDir, 'subdir'));
      await fs.writeFile(path.join(tempDir, 'subdir', 'index.html'), '<html>Index</html>');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/subdir/'
      );
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('<html>Index</html>');
    });
    
    test('serves custom index files', async () => {
      await fs.mkdir(path.join(tempDir, 'subdir'));
      await fs.writeFile(path.join(tempDir, 'subdir', 'default.htm'), '<html>Default</html>');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ 
          mountAt: '/static', 
          adapter,
          index: ['default.htm', 'index.html'],
        }),
        '/static/subdir/'
      );
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('<html>Default</html>');
    });
    
    test('returns 404 when no index file found', async () => {
      await fs.mkdir(path.join(tempDir, 'empty'));
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/empty/'
      );
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('Dotfiles handling', () => {
    test('denies dotfiles by default with allowWellKnown', async () => {
      await fs.writeFile(path.join(tempDir, '.hidden'), 'secret');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/.hidden'
      );
      
      expect(response.status).toBe(404);
    });
    
    test('allows .well-known files by default', async () => {
      await fs.mkdir(path.join(tempDir, '.well-known'), { recursive: true });
      await fs.writeFile(path.join(tempDir, '.well-known', 'security.txt'), 'security info');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/.well-known/security.txt'
      );
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('security info');
    });
    
    test('allows all dotfiles with "allow" option', async () => {
      await fs.writeFile(path.join(tempDir, '.hidden'), 'secret');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ 
          mountAt: '/static', 
          adapter,
          dotfiles: 'allow',
        }),
        '/static/.hidden'
      );
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('secret');
    });
    
    test('denies all dotfiles with "deny" option', async () => {
      await fs.mkdir(path.join(tempDir, '.well-known'), { recursive: true });
      await fs.writeFile(path.join(tempDir, '.well-known', 'security.txt'), 'security info');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ 
          mountAt: '/static', 
          adapter,
          dotfiles: 'deny',
        }),
        '/static/.well-known/security.txt'
      );
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('Security', () => {
    test('blocks path traversal attempts', async () => {
      // Create a file outside the served directory
      await fs.writeFile(path.join(path.dirname(tempDir), 'secret.txt'), 'secret content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/../secret.txt'
      );
      
      expect(response.status).toBe(403);
      expect(await response.text()).toBe('Forbidden');
    });
    
    test('normalizes paths safely', async () => {
      await fs.mkdir(path.join(tempDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'subdir', 'file.txt'), 'content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/subdir/../subdir/./file.txt'
      );
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('content');
    });
  });
  
  describe('Mount paths', () => {
    test('handles mount path without trailing slash', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/assets', adapter }),
        '/assets/test.txt'
      );
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('content');
    });
    
    test('handles mount path with trailing slash', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/assets/', adapter }),
        '/assets/test.txt'
      );
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('content');
    });
    
    test('serves root index file', async () => {
      await fs.writeFile(path.join(tempDir, 'index.html'), '<html>Root</html>');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/'
      );
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('<html>Root</html>');
    });
  });
  
  describe('Error handling', () => {
    test('handles adapter errors gracefully', async () => {
      const mockAdapter = {
        exists: vi.fn().mockRejectedValue(new Error('Adapter error')),
        stat: vi.fn(),
        read: vi.fn(),
      };
      
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter: mockAdapter }),
        '/static/test.txt'
      );
      
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Internal Server Error');
    });
    
    test('ignores non-GET/HEAD methods', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');
      
      const adapter = createNodeFileAdapter({ root: tempDir });
      const response = await testStaticPlugin(
        serveStaticPlugin({ mountAt: '/static', adapter }),
        '/static/test.txt',
        { method: 'POST' }
      );
      
      // Should not be handled by static plugin, so expect 404 from Kori
      expect(response.status).toBe(404);
    });
  });
});