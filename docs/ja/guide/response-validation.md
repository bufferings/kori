# レスポンスバリデーション

レスポンスバリデーションは、APIが定義されたスキーマに一致するデータを返すことを保証します。これにより、API利用者への型安全性を提供し、開発の早期段階でバグを発見できます。

## セットアップ

Zod統合パッケージをインストール：

```bash
npm install @korix/zod-validator @korix/zod-schema zod
```

レスポンスバリデーション付きのKoriアプリケーションをセットアップ：

```typescript
import { createKori } from '@korix/kori';
import { createKoriZodResponseValidator } from '@korix/zod-validator';
import { zodResponseSchema } from '@korix/zod-schema';
import { z } from 'zod';

const app = createKori({
  responseValidator: createKoriZodResponseValidator(),
});
```

## 基本例

異なるステータスコードに対するレスポンススキーマを定義：

```typescript
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  age: z.number().int().min(0),
  createdAt: z.string(),
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

app.get('/users/:id', {
  responseSchema: zodResponseSchema({
    200: UserSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  }),
  handler: (ctx) => {
    const id = Number(ctx.req.pathParam('id'));

    if (id === 999) {
      // この404レスポンスはErrorSchemaに対してバリデーションされる
      return ctx.res.notFound({
        message: 'User not found',
      });
    }

    // この200レスポンスはUserSchemaに対してバリデーションされる
    return ctx.res.status(200).json({
      id,
      name: 'John Doe',
      age: 30,
      createdAt: new Date().toISOString(),
    });
  },
});
```

> 注意：レスポンスバリデーションは、ランタイムでデータのみをチェックします。`ctx.res.json()`とスキーマの不一致はTypeScriptでは検出されません。これらはハンドラー完了後に検出されます。

## レスポンススキーマパターン

### ステータスコードマッチング

レスポンススキーマは複数のステータスコードパターンをサポートします：

```typescript
app.post('/users', {
  responseSchema: zodResponseSchema({
    // 正確なステータスコード
    201: UserSchema,
    400: ErrorSchema,
    409: ErrorSchema,

    // ワイルドカードパターン（5で始まるステータスコードにマッチ）
    '5XX': ErrorSchema,

    // 指定されていないステータスコードのデフォルトフォールバック
    default: ErrorSchema,
  }),
  handler: (ctx) => {
    // ハンドラーロジック
  },
});
```

### コンテンツタイプサポート

異なるコンテンツタイプに対して異なるスキーマを定義：

```typescript
const HtmlErrorSchema = z.string();
const JsonErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.string()).optional(),
});

app.get('/data', {
  responseSchema: zodResponseSchema({
    200: UserSchema,
    400: {
      content: {
        'application/json': JsonErrorSchema,
        'text/html': HtmlErrorSchema,
      },
    },
  }),
  handler: (ctx) => {
    // ハンドラーロジック
  },
});
```

## エラーハンドリング

レスポンスバリデーションエラーは、リクエストバリデーションエラーとは異なって処理されます。デフォルトでは、バリデーション失敗はログに記録されますが、クライアントに送信されるレスポンスには影響しません。

### デフォルト動作

レスポンスバリデーションが失敗した場合：

- アプリケーションログに警告が記録される
- 元のレスポンスがクライアントに変更なしで送信される
- クライアントにエラーは投げられない

これにより、レスポンスバリデーションの問題がエンドユーザーにとってAPIを壊すことがないよう保証されます。

### カスタムエラーハンドラー

カスタムレスポンスバリデーションエラーハンドラーを提供できます：

#### ルートレベルエラーハンドラー

```typescript
app.get('/users/:id', {
  responseSchema: zodResponseSchema({
    200: UserSchema,
  }),
  onResponseValidationError: (ctx, error) => {
    // より多くのコンテキストでバリデーションエラーをログ
    ctx.log().error('Response validation failed', {
      path: ctx.req.path(),
      status: ctx.res.getStatus(),
      error,
    });

    // 任意で異なるレスポンスを返却
    return ctx.res.internalError({
      message: 'Invalid response format',
    });
  },
  handler: (ctx) => {
    // ハンドラーロジック
  },
});
```

#### インスタンスレベルエラーハンドラー

```typescript
const app = createKori({
  responseValidator: createKoriZodResponseValidator(),
  onResponseValidationError: (ctx, error) => {
    // グローバルレスポンスバリデーションエラーハンドリング
    ctx.log().error('Response validation failed globally', { error });

    // 元のレスポンスを使用するためにundefinedを返却
    return undefined;
  },
});
```

### ハンドラーの優先順位

レスポンスバリデーションエラーハンドラーは、リクエストバリデーションと同じ優先順位に従います：

1. ルートレベルハンドラー（提供されている場合）
2. インスタンスレベルハンドラー（提供されている場合）
3. デフォルト動作（警告をログ、元のレスポンスを送信）

各ハンドラーは、レスポンスを返さずに次のハンドラーに渡すことでエラーを処理するか渡すかを選択できます。これにより、特定のハンドラーが特定のエラータイプのみを処理することが可能になります。

## ストリームレスポンスの処理

レスポンスバリデーションは、クライアントに送信される前にバリデーションできないため、ストリーミングレスポンスのバリデーションを自動的にスキップします。

```typescript
app.get('/download', {
  responseSchema: zodResponseSchema({
    200: z.string(), // これはストリームに対してバリデーションされない
  }),
  handler: (ctx) => {
    // ストリーミングレスポンスはバリデーションされない
    return ctx.res.stream(someReadableStream);
  },
});
```
