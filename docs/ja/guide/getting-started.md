# はじめる

最初の型安全なAPIを構築する準備はできましたか？さっそく始めましょう！

## クイックセットアップ（準備中！）

```bash
npm create kori-app my-api  # 🚧 準備中！
cd my-api
npm run dev
```

APIが`http://localhost:3000`で動作しています

## 基本的なAPI

最初のエンドポイントを作成して実行：

```typescript
import { createKori } from '@korix/kori';
import { startNodejsServer } from '@korix/nodejs-server';

const app = createKori();

app.get('/hello', (ctx) => {
  return ctx.res.text('Hello, Kori!');
});

await startNodejsServer(app, { port: 3000 });
```

APIが`http://localhost:3000/hello`で動作しています

## リクエスト＆レスポンス

さまざまなタイプのリクエストとレスポンスの処理：

```typescript
import { createKori } from '@korix/kori';

const app = createKori();

app.get('/users/:id', (ctx) => {
  // パスパラメータ
  const id = ctx.req.param('id');
  return ctx.res.json({
    id,
    name: `User ${id}`,
    active: true,
  });
});

app.get('/info', (ctx) => {
  // リクエスト/レスポンスヘッダー
  const userAgent = ctx.req.header('user-agent');
  return ctx.res.setHeader('x-custom', 'value').status(200).json({ userAgent });
});

export { app };
```

## ログ

組み込まれた構造化ログでアプリケーションを監視：

```typescript
import { createKori } from '@korix/kori';

const app = createKori().onStart((ctx) => {
  // インスタンスレベルのログ（フック内）
  ctx.log().info('Application initializing');
});

app.get('/hello', (ctx) => {
  // リクエストレベルのログ（ハンドラー内）
  ctx.log().info('Processing hello request');

  return ctx.res.text('Hello, Kori!');
});

// アプリケーションレベルのログ（Koriコンテキスト外）
app.log().info('Application will start');

export { app };
```

- `app.log()` - アプリケーションレベルのロガー（Koriコンテキスト外）
- `ctx.log()` - コンテキスト対応ロガー（Koriコンテキスト内：フックとハンドラー）

サンプルログ出力：

```log
2025-10-13T17:52:18.186Z INFO  [app:instance] Application will start
2025-10-13T17:52:18.187Z INFO  [app:instance] Application initializing
2025-10-13T17:52:18.193Z INFO  [sys:instance] Kori server started at http://localhost:3000
2025-10-13T17:52:26.795Z INFO  [app:request] Processing hello request
```

Koriは素早い開発のためにデフォルトでシンプルなコンソールロガーを提供します。実際のアプリケーションには、Pinoなどの高性能ロガーの使用を推奨します（公式アダプターは準備中です）。

## フック

初期化とリクエストライフサイクル処理を追加：

```typescript
import { createKori } from '@korix/kori';

const app = createKori()
  .onStart((ctx) => {
    // アプリケーション開始時に一度実行
    return ctx.withEnv({ applicationStartTime: new Date() });
  })
  .onRequest((ctx) => {
    // 各リクエストハンドラーの前に実行
    ctx.log().info(`${ctx.req.method()} ${ctx.req.url().pathname}`);

    // ハンドラー完了後までレスポンスログを遅延
    ctx.defer(() => {
      ctx.log().info(`Response: ${ctx.res.getStatus()}`);
    });
  });

app.get('/hello', (ctx) => {
  // 環境拡張への型安全なアクセス
  const uptime = Date.now() - ctx.env.applicationStartTime.getTime();
  return ctx.res.text(`Hello, Kori! Uptime: ${uptime}ms`);
});

export { app };
```

## プラグイン

再利用可能なプラグインで機能を拡張：

```typescript
import { createKori, defineKoriPlugin } from '@korix/kori';

// シンプルなリクエストログプラグインを作成
const requestLoggerPlugin = () =>
  defineKoriPlugin({
    name: 'requestLogger',
    apply: (k) =>
      k.onRequest((ctx) => {
        const startTime = Date.now();

        ctx.log().info(`→ ${ctx.req.method()} ${ctx.req.url().pathname}`);

        ctx.defer(() => {
          const duration = Date.now() - startTime;
          ctx.log().info(`← ${ctx.res.getStatus()} (${duration}ms)`);
        });
      }),
  });

const app = createKori().applyPlugin(requestLoggerPlugin());

app.get('/api/data', (ctx) => {
  return ctx.res.json({ message: 'Hello!' });
});

export { app };
```

## バリデーション

ファーストクラスZodサポートによる型安全なバリデーション：

```typescript
import { createKori } from '@korix/kori';
import {
  zodRequestSchema,
  enableZodRequestValidation,
} from '@korix/zod-schema-adapter';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

const app = createKori({
  ...enableZodRequestValidation(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  handler: (ctx) => {
    // 型安全なバリデーション済みボディアクセス
    const { name, age } = ctx.req.validatedBody();

    // ビジネスロジック（データベースへの保存など）

    return ctx.res.status(201).json({
      id: '42',
      name,
      age,
      createdAt: new Date().toISOString(),
    });
  },
});

export { app };
```

## OpenAPI

バリデーションスキーマからインタラクティブなAPIドキュメントを生成：

```typescript
import { createKori } from '@korix/kori';
import { startNodejsServer } from '@korix/nodejs-server';
import {
  zodRequestSchema,
  zodResponseSchema,
  enableZodRequestAndResponseValidation,
} from '@korix/zod-schema-adapter';
import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().optional(),
  createdAt: z.string(),
});

const app = createKori({
  ...enableZodRequestAndResponseValidation(),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: { title: 'My API', version: '1.0.0' },
    }),
  )
  .applyPlugin(swaggerUiPlugin());

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  responseSchema: zodResponseSchema({ '201': UserResponseSchema }),
  handler: (ctx) => {
    const { name, age } = ctx.req.validatedBody();

    return ctx.res.status(201).json({
      id: '42',
      name,
      age,
      createdAt: new Date().toISOString(),
    });
  },
});

await startNodejsServer(app, { port: 3000 });
```

`http://localhost:3000/docs`でインタラクティブなドキュメントをご覧ください！
