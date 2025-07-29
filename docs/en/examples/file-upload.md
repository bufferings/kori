# File Upload Example

Learn how to handle file uploads in Kori with validation, storage, and serving. Includes single files, multiple files, and image processing.

## Complete Example

```typescript
import { createKori, HttpStatus } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';
import { corsPlugin } from '@korix/cors-plugin';
import { bodyLimitPlugin } from '@korix/body-limit-plugin';
import { sendFilePlugin, serveStaticPlugin } from '@korix/file-plugin-nodejs';
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { z } from 'zod/v4';
import { writeFile, mkdir, access, stat, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';
import { createHash } from 'crypto';

// Ensure upload directories exist
await mkdir('./uploads', { recursive: true });
await mkdir('./uploads/images', { recursive: true });
await mkdir('./uploads/documents', { recursive: true });
await mkdir('./uploads/temp', { recursive: true });

// File validation schemas
const ImageFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024, // 5MB
      { message: 'Image must be smaller than 5MB' },
    )
    .refine((file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type), {
      message: 'Only JPEG, PNG, GIF, and WebP images are allowed',
    }),
});

const DocumentFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB
      { message: 'Document must be smaller than 10MB' },
    )
    .refine(
      (file) =>
        [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ].includes(file.type),
      { message: 'Only PDF, TXT, DOC, and DOCX files are allowed' },
    ),
});

const MultipleFilesSchema = z.object({
  files: z.array(z.instanceof(File)).min(1).max(5),
  description: z.string().optional(),
});

// Utility functions
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const ext = extname(originalName);
  const base = basename(originalName, ext);
  return `${timestamp}-${random}-${base}${ext}`;
}

function getFileHash(buffer: ArrayBuffer): string {
  return createHash('md5').update(Buffer.from(buffer)).digest('hex');
}

async function saveFile(file: File, directory: string): Promise<{ filename: string; path: string; hash: string }> {
  const buffer = await file.arrayBuffer();
  const filename = generateFileName(file.name);
  const path = join(directory, filename);

  await writeFile(path, Buffer.from(buffer));

  return {
    filename,
    path,
    hash: getFileHash(buffer),
  };
}

// Create Kori app
const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  .applyPlugin(corsPlugin({ origin: true }))
  .applyPlugin(bodyLimitPlugin({ maxSize: '50mb' })) // Large limit for file uploads
  .applyPlugin(sendFilePlugin())
  .applyPlugin(
    serveStaticPlugin({
      root: './uploads',
      prefix: '/files',
    }),
  )

  .onRequest((ctx) => {
    ctx.req.log().info('File upload request', {
      method: ctx.req.method(),
      path: ctx.req.url().pathname,
      contentType: ctx.req.header('content-type'),
    });
    return ctx;
  })

  .onError((ctx, error) => {
    ctx.req.log().error('File upload error', { error: error.message });

    if (!ctx.res.isReady()) {
      ctx.res.internalError({ message: 'File upload failed' });
    }
  });

// Single image upload
app.post('/upload/image', {
  requestSchema: zodRequestSchema({
    body: ImageFileSchema,
  }),
  handler: async (ctx) => {
    const { file } = ctx.req.validatedBody();

    try {
      const result = await saveFile(file, './uploads/images');

      ctx.req.log().info('Image uploaded', {
        filename: result.filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
      });

      return ctx.res.status(HttpStatus.CREATED).json({
        message: 'Image uploaded successfully',
        file: {
          id: result.hash,
          filename: result.filename,
          originalName: file.name,
          size: file.size,
          type: file.type,
          url: `/files/images/${result.filename}`,
        },
      });
    } catch (error) {
      ctx.req.log().error('Image upload failed', { error });
      return ctx.res.internalError({ message: 'Failed to save image' });
    }
  },
});

// Single document upload
app.post('/upload/document', {
  requestSchema: zodRequestSchema({
    body: DocumentFileSchema,
  }),
  handler: async (ctx) => {
    const { file } = ctx.req.validatedBody();

    try {
      const result = await saveFile(file, './uploads/documents');

      return ctx.res.status(HttpStatus.CREATED).json({
        message: 'Document uploaded successfully',
        file: {
          id: result.hash,
          filename: result.filename,
          originalName: file.name,
          size: file.size,
          type: file.type,
          url: `/files/documents/${result.filename}`,
        },
      });
    } catch (error) {
      return ctx.res.internalError({ message: 'Failed to save document' });
    }
  },
});

// Multiple files upload
app.post('/upload/multiple', {
  requestSchema: zodRequestSchema({
    body: MultipleFilesSchema,
  }),
  handler: async (ctx) => {
    const { files, description } = ctx.req.validatedBody();

    const uploadResults = [];
    const errors = [];

    for (const file of files) {
      try {
        // Determine directory based on file type
        const directory = file.type.startsWith('image/') ? './uploads/images' : './uploads/documents';

        const result = await saveFile(file, directory);
        const category = file.type.startsWith('image/') ? 'images' : 'documents';

        uploadResults.push({
          id: result.hash,
          filename: result.filename,
          originalName: file.name,
          size: file.size,
          type: file.type,
          url: `/files/${category}/${result.filename}`,
        });
      } catch (error) {
        errors.push({
          filename: file.name,
          error: 'Upload failed',
        });
      }
    }

    const status = errors.length === 0 ? HttpStatus.CREATED : HttpStatus.PARTIAL_CONTENT;

    return ctx.res.status(status).json({
      message: `${uploadResults.length} files uploaded successfully`,
      description,
      files: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
    });
  },
});

// Upload with form data (traditional form upload)
app.post('/upload/form', {
  handler: async (ctx) => {
    try {
      const formData = await ctx.req.bodyFormData();
      const file = formData.get('file') as File;
      const title = formData.get('title') as string;
      const category = formData.get('category') as string;

      if (!file) {
        return ctx.res.badRequest({ message: 'No file provided' });
      }

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        return ctx.res.badRequest({ message: 'File too large (max 10MB)' });
      }

      // Determine upload directory
      const directory = category === 'image' ? './uploads/images' : './uploads/documents';
      const result = await saveFile(file, directory);

      return ctx.res.status(HttpStatus.CREATED).json({
        message: 'File uploaded via form',
        file: {
          id: result.hash,
          filename: result.filename,
          originalName: file.name,
          title,
          category,
          size: file.size,
          type: file.type,
          url: `/files/${category === 'image' ? 'images' : 'documents'}/${result.filename}`,
        },
      });
    } catch (error) {
      return ctx.res.badRequest({ message: 'Invalid form data' });
    }
  },
});

// Chunked upload (for large files)
const uploadSessions = new Map<
  string,
  {
    filename: string;
    totalSize: number;
    uploadedSize: number;
    chunks: Buffer[];
  }
>();

app.post('/upload/chunked/start', {
  requestSchema: zodRequestSchema({
    body: z.object({
      filename: z.string(),
      totalSize: z.number().positive(),
      chunkSize: z.number().positive(),
    }),
  }),
  handler: (ctx) => {
    const { filename, totalSize, chunkSize } = ctx.req.validatedBody();

    // Validate total size
    if (totalSize > 100 * 1024 * 1024) {
      // 100MB max
      return ctx.res.badRequest({ message: 'File too large (max 100MB)' });
    }

    const sessionId = createHash('md5')
      .update(filename + Date.now().toString())
      .digest('hex');

    uploadSessions.set(sessionId, {
      filename,
      totalSize,
      uploadedSize: 0,
      chunks: [],
    });

    // Clean up session after 1 hour
    setTimeout(
      () => {
        uploadSessions.delete(sessionId);
      },
      60 * 60 * 1000,
    );

    return ctx.res.json({
      sessionId,
      chunkSize,
      message: 'Upload session started',
    });
  },
});

app.post('/upload/chunked/:sessionId/:chunkIndex', {
  handler: async (ctx) => {
    const { sessionId, chunkIndex } = ctx.req.pathParams();
    const session = uploadSessions.get(sessionId);

    if (!session) {
      return ctx.res.notFound({ message: 'Upload session not found' });
    }

    try {
      const chunkBuffer = Buffer.from(await ctx.req.bodyArrayBuffer());
      const index = parseInt(chunkIndex);

      // Store chunk
      session.chunks[index] = chunkBuffer;
      session.uploadedSize += chunkBuffer.length;

      const progress = (session.uploadedSize / session.totalSize) * 100;

      return ctx.res.json({
        message: 'Chunk uploaded',
        progress: Math.round(progress),
        uploadedSize: session.uploadedSize,
        totalSize: session.totalSize,
      });
    } catch (error) {
      return ctx.res.badRequest({ message: 'Failed to process chunk' });
    }
  },
});

app.post('/upload/chunked/:sessionId/complete', {
  handler: async (ctx) => {
    const { sessionId } = ctx.req.pathParams();
    const session = uploadSessions.get(sessionId);

    if (!session) {
      return ctx.res.notFound({ message: 'Upload session not found' });
    }

    try {
      // Combine all chunks
      const completeFile = Buffer.concat(session.chunks);
      const filename = generateFileName(session.filename);
      const filePath = join('./uploads/documents', filename);

      await writeFile(filePath, completeFile);

      // Clean up session
      uploadSessions.delete(sessionId);

      return ctx.res.json({
        message: 'File upload completed',
        file: {
          filename,
          originalName: session.filename,
          size: completeFile.length,
          url: `/files/documents/${filename}`,
        },
      });
    } catch (error) {
      return ctx.res.internalError({ message: 'Failed to complete upload' });
    }
  },
});

// Get file information
app.get('/files/info/:category/:filename', {
  handler: async (ctx) => {
    const { category, filename } = ctx.req.pathParams();
    const filePath = join('./uploads', category, filename);

    try {
      await access(filePath);
      const stats = await stat(filePath);

      return ctx.res.json({
        filename,
        category,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/files/${category}/${filename}`,
      });
    } catch (error) {
      return ctx.res.notFound({ message: 'File not found' });
    }
  },
});

// Delete file
app.delete('/files/:category/:filename', {
  handler: async (ctx) => {
    const { category, filename } = ctx.req.pathParams();
    const filePath = join('./uploads', category, filename);

    try {
      await access(filePath);
      await unlink(filePath);

      return ctx.res.json({
        message: 'File deleted successfully',
        filename,
      });
    } catch (error) {
      return ctx.res.notFound({ message: 'File not found' });
    }
  },
});

// List files
app.get('/files/:category', {
  handler: async (ctx) => {
    const { category } = ctx.req.pathParams();
    const { readdir } = await import('fs/promises');

    try {
      const files = await readdir(join('./uploads', category));
      const fileInfos = await Promise.all(
        files.map(async (filename) => {
          const filePath = join('./uploads', category, filename);
          const stats = await stat(filePath);
          return {
            filename,
            size: stats.size,
            created: stats.birthtime,
            url: `/files/${category}/${filename}`,
          };
        }),
      );

      return ctx.res.json({
        category,
        files: fileInfos,
        count: fileInfos.length,
      });
    } catch (error) {
      return ctx.res.badRequest({ message: 'Invalid category' });
    }
  },
});

// Health check
app.get('/health', {
  handler: (ctx) => {
    return ctx.res.json({
      status: 'healthy',
      uploadSessions: uploadSessions.size,
      timestamp: new Date().toISOString(),
    });
  },
});

// Start server
await startNodeServer(app, {
  port: 3000,
  hostname: 'localhost',
});

console.log('🚀 File Upload Server running on http://localhost:3000');
console.log('📁 Files served at http://localhost:3000/files/');
```

## Usage Examples

### Single File Upload

```typescript
// Client-side JavaScript
async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/upload/image', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

// Usage
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  const result = await uploadImage(file);
  console.log('Upload result:', result);
}
```

### Multiple Files Upload

```typescript
async function uploadMultipleFiles(files: FileList, description?: string) {
  const formData = new FormData();

  Array.from(files).forEach((file) => {
    formData.append('files', file);
  });

  if (description) {
    formData.append('description', description);
  }

  const response = await fetch('/upload/multiple', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}
```

### Chunked Upload (Large Files)

```typescript
class ChunkedUploader {
  private chunkSize = 1024 * 1024; // 1MB chunks

  async uploadFile(file: File, onProgress?: (progress: number) => void) {
    // Start upload session
    const sessionResponse = await fetch('/upload/chunked/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        totalSize: file.size,
        chunkSize: this.chunkSize,
      }),
    });

    const { sessionId } = await sessionResponse.json();

    // Upload chunks
    const totalChunks = Math.ceil(file.size / this.chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunk = file.slice(start, end);

      const chunkResponse = await fetch(`/upload/chunked/${sessionId}/${i}`, {
        method: 'POST',
        body: chunk,
      });

      const result = await chunkResponse.json();
      onProgress?.(result.progress);
    }

    // Complete upload
    const completeResponse = await fetch(`/upload/chunked/${sessionId}/complete`, {
      method: 'POST',
    });

    return completeResponse.json();
  }
}

// Usage
const uploader = new ChunkedUploader();
const result = await uploader.uploadFile(largeFile, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});
```

### HTML Form Upload

```html
<!DOCTYPE html>
<html>
  <head>
    <title>File Upload</title>
  </head>
  <body>
    <!-- Single file upload -->
    <form action="/upload/image" method="POST" enctype="multipart/form-data">
      <input type="file" name="file" accept="image/*" required />
      <button type="submit">Upload Image</button>
    </form>

    <!-- Multiple files upload -->
    <form action="/upload/multiple" method="POST" enctype="multipart/form-data">
      <input type="file" name="files" multiple required />
      <input type="text" name="description" placeholder="Description" />
      <button type="submit">Upload Files</button>
    </form>

    <!-- Form upload with metadata -->
    <form action="/upload/form" method="POST" enctype="multipart/form-data">
      <input type="file" name="file" required />
      <input type="text" name="title" placeholder="Title" required />
      <select name="category">
        <option value="image">Image</option>
        <option value="document">Document</option>
      </select>
      <button type="submit">Upload</button>
    </form>
  </body>
</html>
```

## Testing with curl

```bash
# Upload single image
curl -X POST -F "file=@image.jpg" http://localhost:3000/upload/image

# Upload document
curl -X POST -F "file=@document.pdf" http://localhost:3000/upload/document

# Upload multiple files
curl -X POST \
  -F "files=@file1.jpg" \
  -F "files=@file2.png" \
  -F "description=My photos" \
  http://localhost:3000/upload/multiple

# Upload with form data
curl -X POST \
  -F "file=@document.pdf" \
  -F "title=Important Document" \
  -F "category=document" \
  http://localhost:3000/upload/form

# Get file info
curl http://localhost:3000/files/info/images/filename.jpg

# List files
curl http://localhost:3000/files/images

# Delete file
curl -X DELETE http://localhost:3000/files/images/filename.jpg
```

## Security Considerations

### File Validation

```typescript
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File too large' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const fileExtension = extname(file.name).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return { valid: false, error: 'File extension not allowed' };
  }

  return { valid: true };
}
```

### Virus Scanning

```typescript
// Example with ClamAV (requires clamscan package)
import { NodeClam } from 'clamscan';

const clamscan = await new NodeClam().init({
  clamdscan: {
    socket: '/var/run/clamd.scan/clamd.sock',
    host: '127.0.0.1',
    port: 3310,
  },
});

app.post('/upload/secure', {
  handler: async (ctx) => {
    const formData = await ctx.req.bodyFormData();
    const file = formData.get('file') as File;

    if (!file) {
      return ctx.res.badRequest({ message: 'No file provided' });
    }

    // Save to temporary location
    const tempPath = join('./uploads/temp', generateFileName(file.name));
    await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

    try {
      // Scan for viruses
      const { isInfected, viruses } = await clamscan.scanFile(tempPath);

      if (isInfected) {
        await unlink(tempPath); // Delete infected file
        return ctx.res.badRequest({
          message: 'File infected',
          viruses,
        });
      }

      // Move to final location if clean
      const finalPath = join('./uploads/documents', basename(tempPath));
      await rename(tempPath, finalPath);

      return ctx.res.json({ message: 'File uploaded and scanned' });
    } catch (error) {
      await unlink(tempPath); // Clean up on error
      throw error;
    }
  },
});
```

### Rate Limiting

```typescript
// File upload rate limiting
const uploadLimiter = new Map<string, { uploads: number; resetTime: number }>();

app = app.onRequest((ctx) => {
  if (ctx.req.url().pathname.startsWith('/upload/')) {
    const clientId = ctx.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxUploads = 10;

    const record = uploadLimiter.get(clientId);

    if (!record || now > record.resetTime) {
      uploadLimiter.set(clientId, { uploads: 1, resetTime: now + windowMs });
      return ctx;
    }

    if (record.uploads >= maxUploads) {
      throw new Error('Upload rate limit exceeded');
    }

    record.uploads++;
  }

  return ctx;
});
```

## Production Considerations

### Cloud Storage Integration

```typescript
// Example with AWS S3
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });

app.post('/upload/s3', {
  handler: async (ctx) => {
    const formData = await ctx.req.bodyFormData();
    const file = formData.get('file') as File;

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `uploads/${Date.now()}-${file.name}`;

    const command = new PutObjectCommand({
      Bucket: 'my-upload-bucket',
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    return ctx.res.json({
      message: 'File uploaded to S3',
      url: `https://my-upload-bucket.s3.amazonaws.com/${key}`,
    });
  },
});
```

### Database Integration

```typescript
// Store file metadata in database
app.post('/upload/tracked', {
  handler: async (ctx) => {
    const formData = await ctx.req.bodyFormData();
    const file = formData.get('file') as File;

    const result = await saveFile(file, './uploads/documents');

    // Save to database
    const fileRecord = await db.files.create({
      filename: result.filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      hash: result.hash,
      uploadedAt: new Date(),
      uploadedBy: ctx.req.currentUser?.id,
    });

    return ctx.res.json({
      message: 'File uploaded and tracked',
      file: fileRecord,
    });
  },
});
```

## Next Steps

- [Basic Server Example](/en/examples/basic-server) - Learn the fundamentals
- [REST API Example](/en/examples/rest-api) - Build complete APIs
- [File Plugin Documentation](/en/extensions/file-plugin) - Detailed file handling
- [Security Headers Plugin](/en/extensions/security-headers-plugin) - Secure file serving
