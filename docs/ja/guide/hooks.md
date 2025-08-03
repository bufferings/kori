# フック

フックは、認証、ログ、キャッシュ、エラーハンドリングのために、Koriのアプリケーションとリクエストライフサイクルにおける割り込みポイントを提供します。

## フックの種類

Koriは2つのカテゴリのフックを提供します：

### ライフサイクルフック

アプリケーションライフサイクル中に一度実行：

- `onStart` - アプリケーションの初期化とシャットダウンクリーンアップ（データベースセットアップ、設定読み込み、クリーンアップの遅延）

### ハンドラーフック

一致するすべてのリクエストに対して実行：

- `onRequest` - リクエスト前処理とリクエスト後クリーンアップ（認証、ログ、バリデーション、クリーンアップの遅延）
- `onError` - エラーハンドリングとレスポンス生成（エラーハンドリング、ログ、レスポンス生成）

## onStartフック

```typescript
const app = createKori().onStart(async (ctx) => {
  ctx.log().info('Application starting...');

  // データベースを初期化
  const db = await connectDatabase(process.env.DATABASE_URL);

  // キャッシュを初期化
  const redis = await connectRedis(process.env.REDIS_URL);

  // 設定を読み込み
  const config = await loadConfiguration();

  // シャットダウン用のクリーンアップ操作を遅延
  ctx.defer(async () => {
    ctx.log().info('Application shutting down...');

    // データベース接続を閉じる（クロージャ変数を使用）
    await db.close();

    // Redis接続を閉じる（クロージャ変数を使用）
    await redis.quit();

    // 一時ファイルをクリーンアップ
    await cleanupTempFiles();

    ctx.log().info('Shutdown complete');
  });

  // 拡張された環境を返却
  return ctx.withEnv({
    db,
    redis,
    config,
    startTime: Date.now(),
  });
});
```

## onRequestフック

```typescript
const app = createKori().onRequest((ctx) => {
  // 追跡用のリクエストIDを追加
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // リクエスト開始をログ
  ctx.log().info('Request started', {
    requestId,
    method: ctx.req.method(),
    path: ctx.req.url().pathname,
  });

  // レスポンスログとクリーンアップを遅延
  ctx.defer(() => {
    const duration = Date.now() - startTime;

    // リクエスト完了をログ
    ctx.log().info('Request completed', {
      requestId,
      duration,
      status: ctx.res.getStatus(),
      method: ctx.req.method(),
      path: ctx.req.url().pathname,
    });

    // メトリクスを更新、リソースをクリーンアップなど
    // metrics.recordRequestDuration(duration);
  });

  // リクエストコンテキストに追加
  return ctx.withReq({ requestId, startTime });
});

app.get('/users', (ctx) => {
  // リクエストIDはすべてのルートハンドラーで利用可能
  const { requestId } = ctx.req;
  return ctx.res.json({ message: 'Hello', requestId });
});
```

## onErrorフック

リクエスト処理中に発生したエラーを処理：

```typescript
app.onError((ctx, error) => {
  ctx.log().error('Request error', {
    method: ctx.req.method(),
    path: ctx.req.url().pathname,
    error: error instanceof Error ? error.message : String(error),
  });

  if (error instanceof Error) {
    return ctx.res.internalError({ message: error.message });
  }
  return ctx.res.internalError({ message: 'An error occurred' });
});
```
