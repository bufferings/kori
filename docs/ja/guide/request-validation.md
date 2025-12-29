# リクエストバリデーション

リクエストバリデーションはKoriの型安全な開発体験の中核です。Koriの拡張可能なバリデーションシステムは、自動型生成を伴う型安全なランタイムバリデーションを提供します - キャストは不要です。Standard Schemaを使用することで、KoriはZod、Valibot、ArkTypeなど複数のバリデーションライブラリをサポートします。

このガイドではZodを例として使用しますが、Standard Schemaに準拠する他のライブラリでも同様のパターンが使えます。

## 対応ライブラリ

| ライブラリ                     | バージョン |
| ------------------------------ | ---------- |
| [Zod](https://zod.dev)         | 4.0+       |
| [Valibot](https://valibot.dev) | 1.0+       |
| [ArkType](https://arktype.io)  | 2.0+       |

対応ライブラリの完全なリストは[Standard Schema](https://standardschema.dev/)を参照してください。

## セットアップ

Standard Schema統合パッケージをインストール：

```bash
npm install @korix/std-schema-adapter @standard-schema/spec zod
```

バリデーション付きのKoriアプリケーションをセットアップ：

```typescript
import { createKori } from '@korix/kori';
import {
  stdRequestSchema,
  enableStdRequestValidation,
} from '@korix/std-schema-adapter';
import { z } from 'zod';

const app = createKori({
  ...enableStdRequestValidation(),
});
```

## 基本例

KoriがAPI開発をどのように変革するか、シンプルなリクエストボディバリデーションから始めて見てみましょう：

```typescript
const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
});

app.post('/users', {
  requestSchema: stdRequestSchema({
    body: UserSchema,
  }),
  handler: (ctx) => {
    // 完全に型付けされバリデーション済み！
    const user = ctx.req.validatedBody();

    return ctx.res.status(201).json({
      message: 'User created',
      user,
    });
  },
});
```

Koriは自動的に処理します：

- リクエストボディの解析とバリデーション
- スキーマからのTypeScript型推論
- ハンドラーに到達する前の無効なリクエストの拒否

## すべてのリクエスト部分のバリデーション

Koriは、HTTPリクエストのすべての部分をバリデーションできます：パスパラメータ、クエリパラメータ、ヘッダー、リクエストボディ。

```typescript
app.put('/users/:id', {
  requestSchema: stdRequestSchema({
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
    queries: z.object({
      notify: z
        .enum(['true', 'false'])
        .transform((val) => val === 'true')
        .optional(),
      include: z.string().optional(),
    }),
    headers: z.object({
      authorization: z.string().startsWith('Bearer '),
    }),
    body: z.object({
      name: z.string().min(1).optional(),
      age: z.number().int().min(0).optional(),
    }),
  }),
  handler: (ctx) => {
    // すべてがバリデーション済みで適切に型付け
    const { id } = ctx.req.validatedParams();
    const { notify, include } = ctx.req.validatedQueries();
    const { authorization } = ctx.req.validatedHeaders();
    const updates = ctx.req.validatedBody();

    return ctx.res.json({
      userId: id,
      updates,
      willNotify: notify ?? false,
      token: authorization,
    });
  },
});
```

## リクエストボディのコンテンツタイプ

デフォルトでは、KoriはJSONとフォームエンコードされたボディをサポートします。異なるコンテンツタイプのスキーマを明示的に定義できます：

```typescript
const JsonUserSchema = z.object({
  name: z.string(),
  age: z.number().int().min(0),
});

const FormUserSchema = z.object({
  name: z.string(),
  // フォームデータの値は文字列なので、必要に応じて変換
  age: z.string().transform(Number),
});

app.post('/users', {
  requestSchema: stdRequestSchema({
    body: {
      content: {
        'application/json': JsonUserSchema,
        'application/x-www-form-urlencoded': FormUserSchema,
      },
    },
  }),
  handler: (ctx) => {
    const userData = ctx.req.validatedBody();

    // 判別可能なユニオンが型安全な処理を可能にする
    if (userData.mediaType === 'application/x-www-form-urlencoded') {
      // userData.valueはFormUser（number ageを持つ）として型付け
      const user = userData.value;
      return ctx.res.json({ source: 'form', user });
    } else {
      // userData.valueはJsonUser（オプションのageを持つ）として型付け
      const user = userData.value;
      return ctx.res.json({ source: 'json', user });
    }
  },
});
```

## エラーハンドリング

Koriは複数のレベルのカスタマイゼーションでバリデーション失敗の柔軟なエラーハンドリングを提供します。

### デフォルト動作

デフォルトでは、バリデーション失敗は`400 Bad Request`レスポンスを返します：

```json
{
  "error": {
    "type": "BAD_REQUEST",
    "message": "Request validation failed"
  }
}
```

コンテンツタイプエラーは、リクエストのコンテンツタイプが定義されたスキーマと一致しない場合に`415 Unsupported Media Type`レスポンスを返します：

```json
{
  "error": {
    "type": "UNSUPPORTED_MEDIA_TYPE",
    "message": "Unsupported Media Type"
  }
}
```

### カスタムエラーハンドラー

ルートレベルとインスタンスレベルの両方でカスタムエラーハンドラーを提供して、バリデーションエラーレスポンスをカスタマイズできます。

#### ルートレベルエラーハンドラー

特定のルートのバリデーションエラーを処理：

```typescript
app.post('/users', {
  requestSchema: stdRequestSchema({
    body: UserCreateSchema,
  }),
  onRequestValidationFailure: (ctx, error) => {
    // 詳細なバリデーションエラーにアクセス
    if (
      error.body &&
      error.body.stage === 'validation' &&
      error.body.reason.type === 'Validation'
    ) {
      const validationError = error.body.reason;
      return ctx.res.badRequest({
        message: 'Validation failed',
        details: validationError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }

    return ctx.res.badRequest({
      message: 'Validation failed',
    });
  },
  handler: (ctx) => {
    const user = ctx.req.validatedBody();
    // ユーザー作成ロジック...
    return ctx.res.json({ message: 'User created', user });
  },
});
```

#### インスタンスレベルエラーハンドラー

すべてのルートに対するグローバルエラーハンドラーを設定：

```typescript
const app = createKori({
  ...enableStdRequestValidation(),
  onRequestValidationFailure: (ctx, error) => {
    // グローバルバリデーションエラーハンドリング
    ctx.log().warn('Validation failed', { error });

    return ctx.res.status(400).json({
      error: 'Invalid request data',
      timestamp: new Date().toISOString(),
    });
  },
});
```

#### ハンドラーの優先順位

エラーハンドラーは以下の順序で呼ばれます：

1. ルートレベルハンドラー（提供されている場合）
2. インスタンスレベルハンドラー（提供されている場合）
3. デフォルト動作

各ハンドラーは、レスポンスを返さずに次のハンドラーに渡すことでエラーを処理するか渡すかを選択できます。これにより、特定のハンドラーが特定のエラータイプのみを処理することが可能になります。
