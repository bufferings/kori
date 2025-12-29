# Koriとは？

Kori - 日本語で氷🧊を意味する - は、クールで型安全性ファーストの開発を実現するTypeScript Webフレームワークです。

シンプルに始めて、必要に応じて型安全な機能を使用できます。

## シンプルに始める

```typescript
import { createKori } from '@korix/kori';

const app = createKori();

app.get('/', (ctx) => {
  return ctx.res.json({ message: 'Hello Kori!' });
});
```

## 型安全なコンテキスト

完全な型安全性でアプリケーション環境を拡張：

```typescript
import { createKori } from '@korix/kori';

const app = createKori().onStart(async (ctx) => {
  const config = { apiVersion: 'v1' };

  // 型安全な環境拡張
  return ctx.withEnv({ config });
});

app.get('/status', (ctx) => {
  // 完全に型付けされた環境アクセス
  const version = ctx.env.config.apiVersion;
  return ctx.res.json({ version, status: 'healthy' });
});
```

## 型安全なバリデーション

スキーマを一度定義すれば、バリデーションと型が自動的に取得：

```typescript
import { createKori } from '@korix/kori';
import { stdRequestSchema, enableStdRequestValidation } from '@korix/std-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableStdRequestValidation(),
});

app.post('/users', {
  requestSchema: stdRequestSchema({
    body: z.object({
      name: z.string().min(1),
      age: z.number().int().min(0),
    }),
  }),
  handler: (ctx) => {
    // 完全に型付けされバリデーション済み - キャストは不要！
    const { name, age } = ctx.req.validatedBody();
    return ctx.res.json({ id: '123', name, age });
  },
});
```

## 同じスキーマ、OpenAPIドキュメント

OpenAPIプラグインを使用すると、バリデーションスキーマがOpenAPIドキュメントになります：

```typescript
import { createKori } from '@korix/kori';
import { stdRequestSchema, stdResponseSchema, enableStdRequestAndResponseValidation } from '@korix/std-schema-adapter';
import { stdSchemaOpenApiPlugin } from '@korix/std-schema-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { z } from 'zod';

const app = createKori({
  ...enableStdRequestAndResponseValidation(),
})
  .applyPlugin(
    stdSchemaOpenApiPlugin({ info: { title: 'My API', version: '1.0.0' } }),
  )
  .applyPlugin(swaggerUiPlugin());

app.post('/users', {
  requestSchema: stdRequestSchema({
    body: z.object({
      name: z.string(),
      age: z.number(),
    }),
  }),
  responseSchema: stdResponseSchema({
    '201': z.object({
      id: z.number(),
      name: z.string(),
      age: z.number(),
    }),
  }),
  handler: (ctx) => {
    const { name, age } = ctx.req.validatedBody();
    return ctx.res.status(201).json({ id: 1, name, age });
  },
});
```

http://localhost:3000/docs にアクセスすると、インタラクティブなAPIドキュメントが表示されます。

![Swagger UI](/swagger-ui.png)

## Honoルーターによる実装

最後に、KoriはHonoの実戦でテストされたルーターを統合しています。これにより、高速なルーティングパフォーマンスと信頼性を実現しています。
