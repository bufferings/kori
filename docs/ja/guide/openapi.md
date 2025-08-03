# OpenAPI統合

スキーマからインタラクティブなAPIドキュメントを自動生成します。Koriの拡張可能なOpenAPIシステムは、ドキュメントをバリデーションスキーマと完璧に同期させます。Koriのアーキテクチャは異なるスキーマライブラリをサポートするよう設計されていますが、公式にはファーストクラスのZod統合をすぐに提供しています。

## セットアップ

Zod OpenAPI統合プラグインをインストール：

```bash
npm install @korix/zod-openapi-plugin @korix/openapi-scalar-ui-plugin
```

Koriアプリケーションに2つのプラグインを追加：

```typescript
import { createKori } from '@korix/kori';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
})
  // ZodスキーマからOpenAPI仕様を生成
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'Koriで構築された美しいAPI',
      },
    }),
  )
  // インタラクティブなドキュメントUIを提供
  .applyPlugin(
    scalarUiPlugin({
      path: '/docs',
      title: 'My API Documentation',
    }),
  );
```

サーバーを起動して`http://localhost:3000/docs`にアクセスしてインタラクティブなドキュメントを確認してください！

## 基本例

バリデーションスキーマが自動的にドキュメントになります：

```typescript
import { z } from 'zod';

// OpenAPIメタデータを含むスキーマを定義
const UserSchema = z.object({
  name: z.string().min(1).meta({
    description: 'ユーザーフルネーム',
    example: 'John Doe',
  }),
  age: z.number().int().min(0).meta({
    description: 'ユーザー年齢',
    example: 30,
  }),
});

// ルートに追加
app.post('/users', {
  pluginMetadata: openApiMeta({
    summary: 'ユーザー作成',
    description: '新しいユーザーアカウントを作成',
    tags: ['Users'],
  }),
  requestSchema: zodRequestSchema({
    body: UserSchema,
  }),
  handler: (ctx) => {
    const user = ctx.req.validatedBody();
    return ctx.res.status(201).json({
      user,
      message: 'ユーザーが正常に作成されました！',
    });
  },
});
```

## スキーマドキュメント

### リクエストパラメータ

すべてのタイプのリクエストパラメータをドキュメント化：

```typescript
app.get('/products/:id', {
  pluginMetadata: openApiMeta({
    summary: 'IDで商品を取得',
    description: '詳細な商品情報を取得',
    tags: ['Products'],
  }),
  requestSchema: zodRequestSchema({
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number).meta({
        description: '商品ID',
        example: '123',
      }),
    }),
    queries: z.object({
      include: z
        .array(z.string())
        .optional()
        .meta({
          description: 'レスポンスに含めるフィールド',
          example: ['reviews', 'images'],
        }),
      sort: z.enum(['name', 'price', 'created']).default('name').meta({
        description: 'ソート順',
        example: 'price',
      }),
    }),
    headers: z.object({
      'x-api-version': z.enum(['1.0', '2.0']).optional().meta({
        description: '使用するAPIバージョン',
        example: '2.0',
      }),
    }),
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validatedParams();
    const queries = ctx.req.validatedQueries();
    const headers = ctx.req.validatedHeaders();

    // ロジックをここに...
  },
});
```

### レスポンスドキュメント

さまざまなレスポンスシナリオをドキュメント化：

```typescript
import { zodResponseSchema } from '@korix/zod-schema';

const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  category: z.enum(['electronics', 'books', 'clothing']),
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

app.get('/products/:id', {
  pluginMetadata: openApiMeta({
    summary: 'IDで商品を取得',
    tags: ['Products'],
  }),
  requestSchema: zodRequestSchema({
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
  }),
  responseSchema: zodResponseSchema({
    200: ProductSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  }),
  handler: (ctx) => {
    const { id } = ctx.req.validatedParams();

    if (id === 999) {
      return ctx.res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    return ctx.res.json({
      id,
      name: 'Sample Product',
      price: 99.99,
      category: 'electronics',
    });
  },
});
```

## 完全な統合例

バリデーションとドキュメントが連携する包括的な例：

```typescript
const ProductCreateSchema = z.object({
  name: z.string().min(1).max(100).meta({
    description: '商品名',
    example: 'ワイヤレスヘッドフォン',
  }),
  price: z.number().positive().meta({
    description: '米ドルでの商品価格',
    example: 99.99,
  }),
  category: z.enum(['electronics', 'books', 'clothing']).meta({
    description: '商品カテゴリ',
    example: 'electronics',
  }),
  tags: z
    .array(z.string())
    .optional()
    .meta({
      description: '商品タグ',
      example: ['wireless', 'audio', 'bluetooth'],
    }),
});

app.post('/products', {
  pluginMetadata: openApiMeta({
    summary: '商品作成',
    description: 'バリデーション付きで新しい商品を作成',
    tags: ['Products'],
    operationId: 'createProduct',
  }),
  requestSchema: zodRequestSchema({
    body: ProductCreateSchema,
    headers: z.object({
      'x-client-id': z.string().min(1).meta({
        description: 'クライアント識別子',
        example: 'mobile-app-v1.2',
      }),
    }),
  }),
  responseSchema: zodResponseSchema({
    201: z.object({
      id: z.number(),
      name: z.string(),
      price: z.number(),
      category: z.string(),
      createdAt: z.string(),
    }),
    400: z.object({
      error: z.string(),
      details: z.array(z.string()),
    }),
  }),
  handler: (ctx) => {
    const product = ctx.req.validatedBody();
    const headers = ctx.req.validatedHeaders();

    const newProduct = {
      id: Math.floor(Math.random() * 10000),
      ...product,
      createdAt: new Date().toISOString(),
    };

    return ctx.res.status(201).json(newProduct);
  },
});
```

## プラグイン設定

### Zod OpenAPIプラグイン

このガイドでは公式のZod統合に焦点を当てています。他のスキーマライブラリについては、基盤となる`@korix/openapi-plugin`を使用してカスタムスキーマコンバーターを実装できます。

OpenAPI仕様を設定：

```typescript
zodOpenApiPlugin({
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'APIドキュメント',
  },
  servers: [
    { url: 'https://api.example.com', description: 'プロダクション' },
    { url: 'http://localhost:3000', description: '開発' },
  ],
  // JSON仕様のデフォルトエンドポイント
  documentPath: '/openapi.json',
});
```

### Scalar UIプラグイン

ドキュメントインターフェースを設定：

```typescript
scalarUiPlugin({
  // UIエンドポイントパス
  path: '/docs',
  // ページタイトル
  title: 'APIドキュメント',
  // テーマ：'light', 'dark', または 'auto'
  theme: 'auto',
  // オプションのカスタムスタイリング
  customCss: 'body { font-family: "Custom Font"; }',
});
```

## バリデーションとの統合

OpenAPIドキュメントは既存のバリデーションとシームレスに連携：

- ランタイムバリデーションがリクエストがドキュメントと一致することを保証
- アプリケーション全体での型安全性
- スキーマが変更されると自動的にドキュメントが更新
- スキーマ定義は常にバリデーションルールと同期

同じスキーマがバリデーションとドキュメントの両方を提供するため、ドキュメントの漂流は不可能です。

## ドキュメント専用モード

ランタイムバリデーションなしでOpenAPIドキュメントを生成できます。これは、APIドキュメントが必要だが、バリデーションを異なって処理したい場合に有用です：

```typescript
import { createKori } from '@korix/kori';
import { zodOpenApiPlugin, openApiMeta } from '@korix/zod-openapi-plugin';
import { scalarUiPlugin } from '@korix/openapi-scalar-ui-plugin';
import { zodRequestSchema, zodResponseSchema } from '@korix/zod-schema';
import { z } from 'zod';

// requestValidatorまたはresponseValidatorなし
const app = createKori()
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'ドキュメント専用のAPI',
      },
    }),
  )
  .applyPlugin(
    scalarUiPlugin({
      path: '/docs',
    }),
  );

// スキーマはドキュメントのみに使用され、バリデーションには使用されない
app.post('/users', {
  pluginMetadata: openApiMeta({
    summary: 'ユーザー作成',
    tags: ['Users'],
  }),
  requestSchema: zodRequestSchema({
    body: z.object({
      name: z.string().meta({ description: 'ユーザー名' }),
      email: z.string().email().meta({ description: 'ユーザーメール' }),
    }),
  }),
  responseSchema: zodResponseSchema({
    201: z.object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
    }),
  }),
  handler: (ctx) => {
    // 自動バリデーションなしでリクエストを処理
    const body = ctx.req.bodyJson(); // unknownを返し、バリデーションされない

    // ここにカスタムバリデーションロジック

    return ctx.res.status(201).json({
      id: 123,
      name: 'John',
      email: 'john@example.com',
    });
  },
});
```

このモードでは：

- `ctx.req.validatedBody()`は利用できない
- 生データには`ctx.req.bodyJson()`、`ctx.req.pathParams()`などを使用
- 必要に応じて独自のバリデーションロジックを実装
- OpenAPIドキュメントはまだスキーマから生成される
- インタラクティブなドキュメントは`/docs`で利用可能
