# Koriとは？

Kori - 日本語で氷🧊（氷）を意味する - は、クールで型安全性ファーストの開発を実現するTypeScript Webフレームワークです。

シンプルに始めて、必要に応じて型安全な機能を使用できます。

## シンプルに始める

```typescript
app.get('/', (ctx) => {
  return ctx.res.json({ message: 'Hello Kori!' });
});
```

## 型安全なコンテキスト

完全な型安全性でアプリケーション環境を拡張：

```typescript
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
const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
});

app.post('/users', {
  requestSchema: zodRequestSchema({ body: UserSchema }),
  handler: (ctx) => {
    // 完全に型付けされバリデーション済み - キャストは不要！
    const { name, age } = ctx.req.validatedBody();
    return ctx.res.json({ id: '123', name, age });
  },
});
```

## 同じスキーマ、OpenAPIドキュメント

OpenAPIプラグインを使用すると、バリデーションスキーマがOpenAPIドキュメントになります：

[画像プレースホルダー: UserSchemaから生成されたインタラクティブなOpenAPIドキュメント]

## Honoルーターによる実装

最後に、KoriはHonoの実戦でテストされたルーターを統合しています。これにより、高速なルーティングパフォーマンスと信頼性を実現しています。
