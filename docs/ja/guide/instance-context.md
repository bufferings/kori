# インスタンスコンテキスト

インスタンスコンテキストはアプリケーションのライフサイクルを管理します - 初期化、設定、シャットダウンを行います。共有リソースのセットアップとアプリケーション環境の設定を行う場所です。

## インスタンスコンテキストとは？

KoriInstanceContextは、アプリケーション起動時やシャットダウン時に一度実行されるアプリケーション全体の関心事を処理します：

```typescript
type KoriInstanceContext<Env extends KoriEnvironment> = {
  env: Env;

  withEnv<EnvExt>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;

  defer(
    callback: (ctx: KoriInstanceContext<Env>) => Promise<void> | void,
  ): void;

  log(): KoriLogger;
};
```

データベース接続のセットアップ、設定の読み込み、共有サービスの初期化に使用します。

## コンテキストの拡張

インスタンスコンテキストは`onStart()`フックを通じて環境拡張をサポートします。`ctx.withEnv()`を使用して、アプリケーションのライフサイクル全体で利用可能な共有リソースを追加できます。

## アプリケーション初期化

`app.onStart()`を使用してアプリケーション環境をセットアップし、インスタンスコンテキストが渡されます：

```typescript
const app = createKori()
  // データベースと共有サービスを初期化
  .onStart(async (ctx) => {
    ctx.log().info('Initializing application...');

    // データベース接続をセットアップ
    const db = await connectDatabase({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
    });

    // Redisキャッシュを初期化
    const cache = await connectRedis({
      url: process.env.REDIS_URL,
    });

    // 設定を読み込み
    const config = {
      apiVersion: 'v1',
      rateLimit: 1000,
      environment: process.env.NODE_ENV,
    };

    // 拡張された環境を返却
    return ctx.withEnv({
      db,
      cache,
      config,
    });
  });
```

## アプリケーションシャットダウン

`defer`を使用してアプリケーション終了時にリソースをクリーンアップ：

```typescript
const app = createKori().onStart(async (ctx) => {
  ctx.log().info('Initializing application...');

  // データベース、キャッシュ、設定をセットアップ
  const db = await connectDatabase();
  const cache = await connectRedis();
  const config = {
    /* ... */
  };

  // シャットダウンクリーンアップをスケジュール
  ctx.defer(async (ctx) => {
    ctx.log().info('Shutting down application...');

    // データベース接続を閉じる
    await ctx.env.db.close();

    // キャッシュ接続を閉じる
    await ctx.env.cache.disconnect();

    ctx.log().info('Application shutdown complete');
  });

  return ctx.withEnv({ db, cache, config });
});
```

## 環境の型安全性

環境はアプリケーション全体で完全に型付けされます：

```typescript
// 初期化後、環境はハンドラーで完全に型付けされます
app.get('/users', async (ctx) => {
  // TypeScriptはctx.env.dbの存在と型を知っています
  const users = await ctx.env.db.query('SELECT * FROM users');
  return ctx.res.json({ users });
});
```
