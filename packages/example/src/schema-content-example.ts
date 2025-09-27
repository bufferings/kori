import { createKori, HttpStatus } from '@korix/kori';
import {
  enableZodRequestValidation,
  enableZodResponseValidation,
  zodRequestSchema,
  zodResponseSchema,
} from '@korix/zod-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableZodRequestValidation({
    onRequestValidationFailure: (ctx, _reason) => {
      return ctx.res.badRequest({ message: 'Validation failed' });
    },
  }),
  ...enableZodResponseValidation(),
});

// 1) Single media type (application/json)
const UserJsonZod = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserJsonZod }),
  handler: (ctx) => {
    const user = ctx.req.validatedBody();
    return ctx.res.status(HttpStatus.CREATED).json({ message: `User created: name=${user.name} age=${user.age}` });
  },
});

// 2) Multiple media types (same Provider: Zod)
const UserJson = z.object({ name: z.string().min(1), age: z.number().int().min(0) });

const UserForm = z.object({ name: z.string().min(1), avatar: z.any() });

app.post('/users/:content', {
  requestSchema: zodRequestSchema({
    body: {
      content: {
        'application/json': UserJson,
        'multipart/form-data': { schema: UserForm, examples: { sample: { name: 'Alice', avatar: '<binary>' } } },
      },
    },
  }),
  handler: (ctx) => {
    const body = ctx.req.validatedBody();
    if (body.mediaType === 'application/json') {
      const v = body.value;
      return ctx.res.status(HttpStatus.CREATED).json(v);
    }
    if (body.mediaType === 'multipart/form-data') {
      const v = body.value;
      return ctx.res.status(HttpStatus.CREATED).json(v);
    }
    return ctx.res.badRequest({ message: 'unsupported media type' });
  },
});

// 3) Response with multiple media types
const UserXml = z.object({ user: z.object({ name: z.string(), age: z.number().int() }) });

app.get('/users/:id', {
  responseSchema: zodResponseSchema({
    '200': {
      description: 'User detail',
      content: {
        'application/json': UserJson,
        'application/xml': UserXml,
      },
    },
    '4XX': {
      description: 'Client error',
      content: { 'application/json': z.object({ message: z.string() }) },
    },
  }),
  handler: (ctx) => {
    const { id } = ctx.req.pathParams();
    return ctx.res.json({ id, name: 'Alice', age: 20 });
  },
});

export default app;
