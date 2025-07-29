# File Plugin (Node.js)

Serve static files and handle file downloads in your Kori Node.js application with performance optimization, security features, and flexible configuration.

## Installation

```bash
npm install @korix/file-plugin-nodejs
```

## Features

- 🚀 **High Performance**: Efficient file streaming and caching
- 🔒 **Security**: Path traversal protection and safe file serving
- 📁 **Static Serving**: Serve entire directories or individual files
- 📥 **File Downloads**: Handle file downloads with proper headers
- 🎯 **Range Requests**: Support for partial content and resumable downloads
- 🏷️ **MIME Types**: Automatic MIME type detection
- ⚡ **Caching**: Smart caching with ETags and Last-Modified headers

## Basic Usage

### Send Individual Files

```typescript
import { createKori } from '@korix/kori';
import { sendFilePlugin } from '@korix/file-plugin-nodejs';

const app = createKori().applyPlugin(sendFilePlugin());

app.get('/download/:filename', {
  handler: (ctx) => {
    const { filename } = ctx.req.pathParams();
    return ctx.res.sendFile(`./uploads/${filename}`);
  },
});
```

### Serve Static Directory

```typescript
import { serveStaticPlugin } from '@korix/file-plugin-nodejs';

const app = createKori().applyPlugin(
  serveStaticPlugin({
    root: './public',
    prefix: '/static',
  }),
);

// Now serves files from ./public at /static/*
// Example: /static/css/style.css serves ./public/css/style.css
```

## Send File Plugin

### Configuration Options

```typescript
sendFilePlugin({
  maxAge: '1y', // Cache duration
  immutable: true, // Mark files as immutable
  lastModified: true, // Include Last-Modified header
  etag: true, // Generate ETag headers
  acceptRanges: true, // Support range requests
});
```

### Usage Examples

#### Basic File Download

```typescript
app.get('/files/:id', {
  handler: async (ctx) => {
    const { id } = ctx.req.pathParams();
    const file = await database.files.findById(id);

    if (!file) {
      return ctx.res.notFound({ message: 'File not found' });
    }

    return ctx.res.sendFile(file.path, {
      filename: file.originalName, // Custom download name
      contentType: file.mimeType,
    });
  },
});
```

#### Image Serving with Caching

```typescript
app.get('/images/:filename', {
  handler: (ctx) => {
    const { filename } = ctx.req.pathParams();

    // Validate file extension
    if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
      return ctx.res.badRequest({ message: 'Invalid image format' });
    }

    return ctx.res.sendFile(`./storage/images/${filename}`, {
      maxAge: '30d',
      immutable: true,
    });
  },
});
```

#### Protected File Access

```typescript
app.get('/private/:filename', {
  handler: async (ctx) => {
    const { filename } = ctx.req.pathParams();
    const user = ctx.req.currentUser;

    if (!user) {
      return ctx.res.unauthorized({ message: 'Authentication required' });
    }

    const hasAccess = await checkFilePermission(user.id, filename);
    if (!hasAccess) {
      return ctx.res.forbidden({ message: 'Access denied' });
    }

    return ctx.res.sendFile(`./private/${filename}`, {
      filename: `secure-${filename}`, // Rename for download
    });
  },
});
```

### Response Methods

#### `ctx.res.sendFile()`

```typescript
// Basic usage
ctx.res.sendFile('./path/to/file.pdf');

// With options
ctx.res.sendFile('./path/to/file.pdf', {
  filename: 'document.pdf', // Custom download filename
  contentType: 'application/pdf', // Override MIME type
  maxAge: '1d', // Cache duration
  lastModified: true, // Include Last-Modified header
  etag: true, // Generate ETag
  acceptRanges: true, // Support range requests
});

// Inline vs attachment
ctx.res.sendFile('./image.jpg', {
  disposition: 'inline', // Display in browser
});

ctx.res.sendFile('./document.pdf', {
  disposition: 'attachment', // Force download
  filename: 'my-document.pdf',
});
```

## Serve Static Plugin

### Configuration Options

```typescript
serveStaticPlugin({
  root: './public', // Root directory to serve
  prefix: '/static', // URL prefix (optional)
  index: ['index.html'], // Index files
  maxAge: '1y', // Cache duration
  immutable: false, // Mark files as immutable
  dotFiles: 'ignore', // Handle dotfiles: 'allow', 'deny', 'ignore'
  extensions: ['html'], // Auto-append extensions
  fallthrough: true, // Continue to next handler on missing file
});
```

### Usage Examples

#### Basic Static Serving

```typescript
const appWithAssets = app.applyPlugin(
  serveStaticPlugin({
    root: './public',
    prefix: '/assets',
  }),
);

// Serves:
// /assets/css/style.css → ./public/css/style.css
// /assets/js/app.js → ./public/js/app.js
// /assets/images/logo.png → ./public/images/logo.png
```

#### SPA (Single Page Application) Support

```typescript
const appWithSpa = app.applyPlugin(
  serveStaticPlugin({
    root: './dist',
    index: ['index.html'],
    fallthrough: false, // Ensure SPA routing works
  }),
);

// Serve index.html for all unmatched routes
app.get('*', {
  handler: (ctx) => ctx.res.sendFile('./dist/index.html'),
});
```

#### Multiple Static Directories

```typescript
// Serve CSS and JS with long cache
app.applyPlugin(
  serveStaticPlugin({
    root: './public/assets',
    prefix: '/assets',
    maxAge: '1y',
    immutable: true,
  }),
);

// Serve uploads with shorter cache
app.applyPlugin(
  serveStaticPlugin({
    root: './uploads',
    prefix: '/uploads',
    maxAge: '1d',
  }),
);
```

#### Development vs Production

```typescript
const isDev = process.env.NODE_ENV === 'development';

app.applyPlugin(
  serveStaticPlugin({
    root: './public',
    maxAge: isDev ? '0' : '1y', // No cache in dev
    etag: !isDev, // ETags only in production
    lastModified: !isDev, // Last-Modified only in production
  }),
);
```

## Security Features

### Path Traversal Protection

```typescript
// These are automatically blocked:
// /static/../../../etc/passwd
// /static/..%2F..%2F..%2Fetc%2Fpasswd
// /static/....//....//etc/passwd

app.applyPlugin(
  serveStaticPlugin({
    root: './public',
    prefix: '/static',
    // Path traversal protection is built-in
  }),
);
```

### Dotfile Protection

```typescript
serveStaticPlugin({
  root: './public',
  dotFiles: 'deny', // Block access to .env, .git, etc.
});
```

### File Extension Validation

```typescript
app.get('/images/:filename', {
  handler: (ctx) => {
    const { filename } = ctx.req.pathParams();

    // Validate file extension
    const allowedExtensions = ['.jpg', '.png', '.gif', '.webp'];
    const ext = path.extname(filename).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return ctx.res.badRequest({ message: 'Invalid file type' });
    }

    return ctx.res.sendFile(`./images/${filename}`);
  },
});
```

## Performance Features

### Caching Headers

```typescript
// ETags for cache validation
serveStaticPlugin({
  root: './public',
  etag: true, // Generate ETag headers
  lastModified: true, // Include Last-Modified
  maxAge: '1y', // Cache for 1 year
  immutable: true, // Mark as immutable (never changes)
});
```

### Range Requests (Partial Content)

```typescript
// Automatic support for range requests
app.get('/videos/:filename', {
  handler: (ctx) => {
    const { filename } = ctx.req.pathParams();

    return ctx.res.sendFile(`./videos/${filename}`, {
      acceptRanges: true, // Enable range requests
      // Browsers can resume downloads and stream large files
    });
  },
});
```

### Compression Integration

```typescript
import compression from 'compression';

// Apply compression before static files
app = app.applyPlugin(compressionPlugin());
app = app.applyPlugin(
  serveStaticPlugin({
    root: './public',
  }),
);
```

## Advanced Examples

### File Upload and Serve

```typescript
import { writeFile } from 'fs/promises';
import { zodRequestSchema } from '@korix/zod-schema';

// Upload endpoint
app.post('/upload', {
  requestSchema: zodRequestSchema({
    body: z.object({
      file: z.instanceof(File),
    }),
  }),
  handler: async (ctx) => {
    const { file } = ctx.req.validatedBody();
    const filename = `${Date.now()}-${file.name}`;
    const buffer = await file.arrayBuffer();

    await writeFile(`./uploads/${filename}`, Buffer.from(buffer));

    return ctx.res.json({
      filename,
      url: `/files/${filename}`,
    });
  },
});

// Serve uploaded files
app.get('/files/:filename', {
  handler: (ctx) => {
    const { filename } = ctx.req.pathParams();
    return ctx.res.sendFile(`./uploads/${filename}`);
  },
});
```

### Conditional File Serving

```typescript
app.get('/downloads/:filename', {
  handler: async (ctx) => {
    const { filename } = ctx.req.pathParams();
    const user = ctx.req.currentUser;

    // Check if file exists
    const filePath = `./downloads/${filename}`;
    try {
      await fs.access(filePath);
    } catch {
      return ctx.res.notFound({ message: 'File not found' });
    }

    // Check user permissions
    if (!user?.hasRole('premium')) {
      return ctx.res.forbidden({ message: 'Premium account required' });
    }

    // Log download
    await logFileDownload(user.id, filename);

    return ctx.res.sendFile(filePath, {
      filename: `premium-${filename}`,
    });
  },
});
```

### CDN Integration

```typescript
app.get('/cdn/:filename', {
  handler: async (ctx) => {
    const { filename } = ctx.req.pathParams();

    // Try local file first
    const localPath = `./cache/${filename}`;
    try {
      await fs.access(localPath);
      return ctx.res.sendFile(localPath, { maxAge: '1y' });
    } catch {
      // File not cached locally
    }

    // Fetch from CDN and cache
    const cdnUrl = `https://cdn.example.com/${filename}`;
    const response = await fetch(cdnUrl);

    if (!response.ok) {
      return ctx.res.notFound({ message: 'File not found' });
    }

    const buffer = await response.arrayBuffer();
    await writeFile(localPath, Buffer.from(buffer));

    return ctx.res.sendFile(localPath, { maxAge: '1y' });
  },
});
```

## Testing File Serving

```typescript
import { describe, it, expect } from '@jest/globals';
import { writeFile, mkdir, rm } from 'fs/promises';

describe('File Plugin', () => {
  beforeAll(async () => {
    await mkdir('./test-files', { recursive: true });
    await writeFile('./test-files/test.txt', 'Hello World');
  });

  afterAll(async () => {
    await rm('./test-files', { recursive: true });
  });

  it('should serve static files', async () => {
    const app = createKori()
      .applyPlugin(sendFilePlugin())
      .get('/test', {
        handler: (ctx) => ctx.res.sendFile('./test-files/test.txt'),
      });

    const response = await app.generate()(new Request('http://localhost/test'));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe('Hello World');
    expect(response.headers.get('content-type')).toBe('text/plain');
  });

  it('should handle range requests', async () => {
    const app = createKori()
      .applyPlugin(sendFilePlugin())
      .get('/test', {
        handler: (ctx) => ctx.res.sendFile('./test-files/test.txt'),
      });

    const response = await app.generate()(
      new Request('http://localhost/test', {
        headers: { Range: 'bytes=0-5' },
      }),
    );

    expect(response.status).toBe(206); // Partial Content
    expect(response.headers.get('Content-Range')).toBe('bytes 0-5/11');
  });
});
```

## Best Practices

### 1. Secure File Paths

```typescript
import path from 'path';

app.get('/files/:filename', {
  handler: (ctx) => {
    const { filename } = ctx.req.pathParams();

    // Sanitize filename
    const safeName = path.basename(filename);
    const safePath = path.join('./uploads', safeName);

    // Ensure it's within uploads directory
    if (!safePath.startsWith(path.resolve('./uploads'))) {
      return ctx.res.badRequest({ message: 'Invalid file path' });
    }

    return ctx.res.sendFile(safePath);
  },
});
```

### 2. Appropriate Cache Headers

```typescript
// Static assets (CSS, JS) - long cache
serveStaticPlugin({
  root: './public/assets',
  prefix: '/assets',
  maxAge: '1y',
  immutable: true,
});

// User uploads - short cache
serveStaticPlugin({
  root: './uploads',
  prefix: '/uploads',
  maxAge: '1h',
  etag: true,
});
```

### 3. Error Handling

```typescript
app.get('/files/:filename', {
  handler: async (ctx) => {
    try {
      const { filename } = ctx.req.pathParams();
      return ctx.res.sendFile(`./files/${filename}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return ctx.res.notFound({ message: 'File not found' });
      }
      if (error.code === 'EACCES') {
        return ctx.res.forbidden({ message: 'Access denied' });
      }

      ctx.req.log().error('File serving error', { error });
      return ctx.res.internalError({ message: 'File serving failed' });
    }
  },
});
```

## Next Steps

- [CORS Plugin](/en/extensions/cors-plugin) - Handle cross-origin requests for file serving
- [Security Headers Plugin](/en/extensions/security-headers-plugin) - Add security headers to file responses
- [Body Limit Plugin](/en/extensions/body-limit-plugin) - Limit file upload sizes
