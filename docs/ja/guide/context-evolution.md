# 型安全なコンテキストの進化

このガイドでは、Koriがメソッドチェーンを通じてコンテキスト型を進化させ、複雑なリクエスト処理パイプラインを構築する際にTypeScriptの型情報を自動的に保持・拡張する方法を説明します。

## 型安全性のためのフックチェーン

メソッドチェーンを使用して、型拡張が適切に継承されることを確認：

```typescript
// ✅ 良い例：チェーンされたフックは型拡張を保持
const app = createKori()
  .onStart(async (ctx) => {
    const db = await connectDatabase();
    return ctx.withEnv({ db });
  })
  .onRequest((ctx) => {
    // ctx.env.dbは完全に型付けされ利用可能
    const user = authenticateUser(ctx.req);
    return ctx.withReq({ user });
  })
  .onRequest((ctx) => {
    // ctx.env.dbとctx.req.userの両方が型付け済み
    ctx.log().info('Request', { userId: ctx.req.user?.id });
  });

// ❌ 避けるべき：個別の呼び出しは型情報を失う
const app = createKori();

app.onStart(async (ctx) => {
  const db = await connectDatabase();
  return ctx.withEnv({ db });
}); // 型拡張が失われる

app.onRequest(async (ctx) => {
  // TypeScriptはctx.env.dbについて知らない
  const users = await ctx.env.db.getUsers(); // ❌ 型エラー
});
```

## 多段階拡張

メソッドチェーンを使用した複雑なリクエスト処理パイプラインの構築：

```typescript
const app = createKori()
  // 1. 認証
  .onRequest((ctx) => {
    const user = authenticateRequest(ctx.req);
    return ctx.withReq({ user });
  })
  // 2. リクエストID追跡
  .onRequest((ctx) => {
    const requestId = crypto.randomUUID();
    ctx.log().info('Request started', { requestId });
    return ctx.withReq({ requestId });
  })
  // 3. タイミング
  .onRequest((ctx) => {
    const startTime = Date.now();
    return ctx.withReq({ startTime });
  })
  // 4. レスポンスタイミングヘッダー
  .onRequest((ctx) => {
    return ctx.withRes({
      withTiming: () => {
        const duration = Date.now() - ctx.req.startTime;
        return ctx.res.setHeader('x-response-time', `${duration}ms`);
      },
    });
  });

// すべての拡張が利用可能
app.get('/api/data', (ctx) => {
  ctx.log().info('Processing request', {
    requestId: ctx.req.requestId,
    user: ctx.req.user?.id,
  });

  return ctx.res.withTiming().json({
    message: 'Success',
    requestId: ctx.req.requestId,
  });
});
```
