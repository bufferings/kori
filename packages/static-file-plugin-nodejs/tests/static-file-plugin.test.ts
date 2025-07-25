import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createKori } from '@korix/kori';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { staticFilePlugin, type StaticFileOptions } from '../src/index.js';

describe('static-file-plugin-nodejs', () => {
  let tempDir: string;
  let publicDir: string;

  async function fetchFromApp(
    app: ReturnType<typeof createKori>,
    url: string,
    headers?: Record<string, string>,
  ): Promise<Response> {
    const generated = app.generate();
    const { fetchHandler } = await generated.onInit();
    return fetchHandler(new Request(url, { headers }));
  }

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = join(tmpdir(), `kori-static-test-${Date.now()}`);
    publicDir = join(tempDir, 'public');

    await mkdir(publicDir, { recursive: true });

    // Create test files
    await writeFile(join(publicDir, 'index.html'), '<html><body>Index</body></html>');
    await writeFile(join(publicDir, 'style.css'), 'body { margin: 0; }');
    await writeFile(join(publicDir, 'script.js'), 'console.log("test");');
    await writeFile(join(publicDir, 'image.png'), new Uint8Array(Buffer.from('fake-png-data')));
    await writeFile(join(publicDir, '.env'), 'SECRET=test');

    // Create a larger test file for range testing
    const largeContent = 'A'.repeat(1000) + 'B'.repeat(1000) + 'C'.repeat(1000);
    await writeFile(join(publicDir, 'large-file.txt'), largeContent);

    // Create subdirectory with index
    await mkdir(join(publicDir, 'admin'), { recursive: true });
    await writeFile(join(publicDir, 'admin', 'index.html'), '<html><body>Admin</body></html>');

    // Create subdirectory without index
    await mkdir(join(publicDir, 'assets'), { recursive: true });
    await writeFile(join(publicDir, 'assets', 'logo.png'), new Uint8Array(Buffer.from('fake-logo-data')));
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Range Request support', () => {
    it('should include Accept-Ranges header by default', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt');

      expect(response.status).toBe(200);
      expect(response.headers.get('Accept-Ranges')).toBe('bytes');
    });

    it('should serve partial content for valid range requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request first 500 bytes
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-499',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 0-499/3000');
      expect(response.headers.get('Content-Length')).toBe('500');
      expect(response.headers.get('Accept-Ranges')).toBe('bytes');

      const content = await response.text();
      expect(content).toBe('A'.repeat(500));
    });

    it('should handle suffix range requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request last 500 bytes
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=-500',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 2500-2999/3000');
      expect(response.headers.get('Content-Length')).toBe('500');

      const content = await response.text();
      expect(content).toBe('C'.repeat(500));
    });

    it('should handle start range requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request from byte 2500 to end
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=2500-',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 2500-2999/3000');
      expect(response.headers.get('Content-Length')).toBe('500');

      const content = await response.text();
      expect(content).toBe('C'.repeat(500));
    });

    it('should return 416 for unsatisfiable ranges', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request range beyond file size
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=5000-6000',
      });

      expect(response.status).toBe(416);
      expect(response.headers.get('Content-Range')).toBe('bytes */3000');

      const json = (await response.json()) as { error: { type: string; message: string } };
      expect(json.error.type).toBe('RANGE_NOT_SATISFIABLE');
    });

    it('should return 416 for invalid range format', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Invalid range format
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=invalid-range',
      });

      expect(response.status).toBe(416);
      expect(response.headers.get('Content-Range')).toBe('bytes */3000');
    });

    it('should reject multiple ranges when maxRanges is 1', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          maxRanges: 1,
        }),
      );

      // Multiple ranges request
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-499,1000-1499',
      });

      expect(response.status).toBe(416);

      const json = (await response.json()) as { error: { type: string; message: string } };
      expect(json.error.type).toBe('TOO_MANY_RANGES');
    });

    it('should disable range requests when ranges option is false', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          ranges: false,
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-499',
      });

      // Should return full file, not partial content
      expect(response.status).toBe(200);
      expect(response.headers.get('Accept-Ranges')).toBe('none');
      expect(response.headers.get('Content-Length')).toBe('3000');

      const content = await response.text();
      expect(content.length).toBe(3000);
    });

    it('should work with conditional requests and ranges', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          etag: true,
        }),
      );

      // First request to get ETag
      const firstResponse = await fetchFromApp(app, 'http://localhost/static/large-file.txt');
      const etag = firstResponse.headers.get('etag');
      expect(etag).toBeTruthy();

      // Range request with matching ETag should return 304
      if (etag) {
        const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
          Range: 'bytes=0-499',
          'If-None-Match': etag,
        });

        expect(response.status).toBe(304);
      }
    });

    it('should handle range requests for different MIME types', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Test with CSS file
      const response = await fetchFromApp(app, 'http://localhost/static/style.css', {
        Range: 'bytes=0-9',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Type')).toBe('text/css');
      expect(response.headers.get('Content-Range')).toBe('bytes 0-9/19');

      const content = await response.text();
      expect(content).toBe('body { mar');
    });

    it('should handle edge cases with range boundaries', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request exactly to file boundary
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-2999',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 0-2999/3000');
      expect(response.headers.get('Content-Length')).toBe('3000');

      const content = await response.text();
      expect(content.length).toBe(3000);
    });

    it('should handle zero-length range requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request single byte
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-0',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 0-0/3000');
      expect(response.headers.get('Content-Length')).toBe('1');

      const content = await response.text();
      expect(content).toBe('A');
    });
  });

  describe('basic functionality', () => {
    it('should serve static files', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/index.html');

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('<html><body>Index</body></html>');
    });

    it('should detect correct MIME types', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const responses = await Promise.all([
        fetchFromApp(app, 'http://localhost/static/style.css'),
        fetchFromApp(app, 'http://localhost/static/script.js'),
        fetchFromApp(app, 'http://localhost/static/image.png'),
      ]);

      expect(responses[0].headers.get('content-type')).toBe('text/css');
      expect(responses[1].headers.get('content-type')).toBe('text/javascript');
      expect(responses[2].headers.get('content-type')).toBe('image/png');
    });

    it('should return 404 for non-existent files', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/nonexistent.txt');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: {
          type: 'NOT_FOUND',
          message: 'File not found',
        },
      });
    });

    it('should ignore requests that do not match mountAt', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/assets',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/index.html');

      expect(response.status).toBe(404);
    });
  });

  describe('index file resolution', () => {
    it('should serve index.html for directory requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(await response.text()).toBe('<html><body>Index</body></html>');
    });

    it('should serve index.html for mount point without trailing slash', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(await response.text()).toBe('<html><body>Index</body></html>');
    });

    it('should handle various path patterns correctly', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Test various path patterns
      const testCases = [
        { path: 'http://localhost/static', expectedStatus: 200 },
        { path: 'http://localhost/static/', expectedStatus: 200 },
        { path: 'http://localhost/static/index.html', expectedStatus: 200 },
        { path: 'http://localhost/static/admin', expectedStatus: 200 },
        { path: 'http://localhost/static/admin/', expectedStatus: 200 },
      ];

      for (const { path, expectedStatus } of testCases) {
        const response = await fetchFromApp(app, path);
        expect(response.status).toBe(expectedStatus);
      }
    });

    it('should serve index.html for subdirectory requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/admin/');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(await response.text()).toBe('<html><body>Admin</body></html>');
    });

    it('should return 404 for directories without index files', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/assets/');

      expect(response.status).toBe(404);
    });

    it('should respect index: false option', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          index: false,
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/');

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: {
          type: 'FORBIDDEN',
          message: 'Directory listing is disabled',
        },
      });
    });
  });

  describe('dotfiles handling', () => {
    it('should deny dotfiles by default', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/.env');

      expect(response.status).toBe(404);
    });

    it('should deny dotfiles when configured', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          dotfiles: 'deny',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/.env');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: {
          type: 'NOT_FOUND',
          message: 'File not found',
        },
      });
    });

    it('should allow dotfiles when configured', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          dotfiles: 'allow',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/.env');

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('SECRET=test');
    });
  });

  describe('caching headers', () => {
    it('should set cache headers', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          maxAge: 3600,
          etag: true,
          lastModified: true,
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/index.html');

      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
      expect(response.headers.get('etag')).toBeTruthy();
      expect(response.headers.get('last-modified')).toBeTruthy();
    });

    it('should handle conditional requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          etag: true,
        }),
      );

      // First request to get ETag
      const firstResponse = await fetchFromApp(app, 'http://localhost/static/index.html');
      const etag = firstResponse.headers.get('etag');

      expect(firstResponse.status).toBe(200);
      expect(etag).toBeTruthy();

      // Second request with If-None-Match header
      const generated = app.generate();
      const { fetchHandler } = await generated.onInit();
      const secondResponse = await fetchHandler(
        new Request('http://localhost/static/index.html', {
          headers: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            'if-none-match': etag!,
          },
        }),
      );

      expect(secondResponse.status).toBe(304);
    });
  });

  describe('security', () => {
    it('should prevent directory traversal attacks', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/../../../etc/passwd');

      expect(response.status).toBe(404);
    });

    it('should handle encoded path traversal attempts', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/%2e%2e%2f%2e%2e%2fetc%2fpasswd');

      expect(response.status).toBe(404);
    });
  });

  describe('validation', () => {
    it('should require root directory', () => {
      expect(() => {
        createKori().applyPlugin(staticFilePlugin({} as StaticFileOptions));
      }).toThrow('Static file plugin requires a serveFrom directory');
    });

    it('should validate maxAge', () => {
      expect(() => {
        createKori().applyPlugin(
          staticFilePlugin({
            serveFrom: publicDir,
            maxAge: -1,
          }),
        );
      }).toThrow('maxAge must be a non-negative number');
    });

    it('should validate prefix format', () => {
      expect(() => {
        createKori().applyPlugin(
          staticFilePlugin({
            serveFrom: publicDir,
            mountAt: 'invalid-prefix',
          }),
        );
      }).toThrow('mountAt must start with "/"');
    });
  });
});
