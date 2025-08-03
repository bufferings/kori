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

最初のエンドポイントを作成：

```typescript
import { createKori } from '@korix/kori';

const app = createKori();

app.get('/hello', (ctx) => {
  return ctx.res.text('Hello, Kori!');
});

export { app };
```

## リクエスト＆レスポンス

さまざまなタイプのリクエストとレスポンスの処理：

```typescript
import { createKori } from '@korix/kori';

const app = createKori();

app.get('/users/:id', (ctx) => {
  // パスパラメータ
  const { id } = ctx.req.pathParams();
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
app.log().info('Application ready');

export { app };
```

- **`app.log()`** - アプリケーションレベルのロガー（Koriコンテキスト外）
- **`ctx.log()`** - コンテキスト対応ロガー（Koriコンテキスト内：フックとハンドラー）

サンプルログ出力：

```json
{"time":1754198335875,"level":"info","channel":"app","name":"instance","message":"Application ready","meta":{}}
{"time":1754198335875,"level":"info","channel":"app","name":"instance","message":"Application initializing","meta":{}}
{"time":1754198335879,"level":"info","channel":"sys","name":"instance","message":"Kori server started at http://127.0.0.1:3000","meta":{}}
{"time":1754198349150,"level":"info","channel":"app","name":"request","message":"Processing hello request","meta":{}}
```

Koriは素早い開発のためにデフォルトでシンプルなコンソールロガーを提供します。実際のアプリケーションには、PinoやLogTapeなどの高性能ロガーを使用してください。簡単な統合のためのアダプターを提供しています。

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
import { createKori } from '@korix/kori';
import { securityHeadersPlugin } from '@korix/security-headers-plugin';

const app = createKori()
  // すべてのレスポンスにセキュリティヘッダーを追加
  .applyPlugin(securityHeadersPlugin());

app.get('/api/data', (ctx) => {
  return ctx.res.json({ message: 'Secure API!' });
});

export { app };
```

## バリデーション

ファーストクラスZodサポートによる型安全なバリデーション：

```typescript
import { createKori } from '@korix/kori';
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  handler: (ctx) => {
    // 型安全なバリデーション済みボディアクセス
    const { name, age } = ctx.req.validatedBody();

    // ビジネスロジック（データベースへの保存など）

    return ctx.res.status(201).json({
      id: Math.random().toString(36),
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
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { zodRequestSchema } from '@korix/zod-schema';
import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  // ZodスキーマからOpenAPI仕様を生成
  .applyPlugin(
    zodOpenApiPlugin({
      info: { title: 'My API', version: '1.0.0' },
    }),
  )
  // インタラクティブなドキュメントUIを提供
  .applyPlugin(scalarUiPlugin());

app.post('/users', {
  requestSchema: zodRequestSchema({ body: CreateUserSchema }),
  handler: (ctx) => {
    // 型安全なバリデーション済みボディアクセス
    const { name, age } = ctx.req.validatedBody();

    // ビジネスロジック（データベースへの保存など）

    return ctx.res.status(201).json({
      id: Math.random().toString(36),
      name,
      age,
      createdAt: new Date().toISOString(),
    });
  },
});

export { app };
```

`http://localhost:3000/docs`でインタラクティブなドキュメントをご覧ください！
