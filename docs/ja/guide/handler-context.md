# ハンドラーコンテキスト

ハンドラーコンテキストはリクエスト処理を管理します - リクエストデータへのアクセス、レスポンスの構築、リクエストごとの機能拡張を行います。すべてのルートハンドラーに渡され、HTTPリクエストの処理に必要なすべてが含まれています。

## ハンドラーコンテキストとは？

KoriHandlerContextはすべてのルートハンドラーに渡され、リクエストデータ、レスポンスビルダー、アプリケーション環境へのアクセスを提供します：

```typescript
type KoriHandlerContext<Env, Req, Res> = {
  env: Env; // アプリケーション環境
  req: Req; // リクエストオブジェクト
  res: Res; // レスポンスビルダー

  withReq<ReqExt>(reqExt: ReqExt): KoriHandlerContext<Env, Req & ReqExt, Res>;
  withRes<ResExt>(resExt: ResExt): KoriHandlerContext<Env, Req, Res & ResExt>;

  defer(
    callback: (ctx: KoriHandlerContext<Env, Req, Res>) => Promise<void> | void,
  ): void;

  log(): KoriLogger;
};
```

HTTPリクエストの処理、リクエストデータへのアクセス、レスポンスの構築、リクエストごとのロジックに使用します。ハンドラーコンテキストは、カスタム機能を追加するためのリクエストとレスポンスの拡張をサポートしています。

## 基本的な使用方法

すべてのルートハンドラーは、環境、リクエスト、レスポンスを含む`ctx`パラメータを受け取ります：

```typescript
app.get('/api/users/:id', async (ctx) => {
  // ctx.env - アプリケーション環境
  // ctx.req - リクエストデータとメソッド
  // ctx.res - レスポンス構築メソッド

  const id = ctx.req.param('id');
  const user = await ctx.env.db.findUser(id);

  return ctx.res.json({ user });
});
```

## アプリケーション環境（`ctx.env`）

アプリケーション初期化時に設定された共有リソースへのアクセス：

```typescript
app.get('/users', async (ctx) => {
  // データベース接続へのアクセス
  const users = await ctx.env.db.query('SELECT * FROM users');

  // 設定へのアクセス
  const version = ctx.env.config.apiVersion;

  return ctx.res.json({ users, version });
});
```

## リクエストオブジェクト（`ctx.req`）

すべての受信リクエストデータへのアクセス：

```typescript
app.get('/users/:id/posts', async (ctx) => {
  // パスパラメータ
  const id = ctx.req.param('id');

  // クエリパラメータ（undefinedの可能性あり）
  const queries = ctx.req.queries();
  const limit = queries.limit ?? '10';
  const offset = queries.offset ?? '0';

  // ヘッダー
  const authorization = ctx.req.header('authorization');

  // URLとメソッド
  const url = ctx.req.url();
  const method = ctx.req.method();

  // リクエストボディ（複数の形式）
  const jsonData = await ctx.req.bodyJson();
  const textData = await ctx.req.bodyText();
  const formData = await ctx.req.bodyFormData();

  return ctx.res.json({
    userId: id,
    query: { limit, offset },
    hasAuth: !!authorization,
  });
});
```

## レスポンスオブジェクト（`ctx.res`）

流暢なAPIでHTTPレスポンスを構築：

```typescript
app.post('/users', async (ctx) => {
  const userData = await ctx.req.bodyJson();

  try {
    const user = await ctx.env.db.createUser(userData);

    return (
      ctx.res
        // ステータスコード
        .status(201)
        // レスポンスヘッダー
        .setHeader('location', `/users/${user.id}`)
        // レスポンスボディ
        .json({ user })
    );
  } catch (error) {
    // 組み込みヘルパーによるエラーレスポンス
    return ctx.res.badRequest({
      message: 'Invalid user data',
      details: error.message,
    });
  }
});

// さまざまなレスポンスタイプ
app.get('/health', (ctx) => {
  return ctx.res.text('OK');
});

app.get('/page', (ctx) => {
  return ctx.res.html('<h1>Welcome</h1>');
});

app.delete('/users/:id', async (ctx) => {
  await ctx.env.db.deleteUser(ctx.req.param('id'));
  return ctx.res.status(204).empty();
});
```

## コンテキストの拡張

ハンドラーコンテキストは`onRequest()`フックを通じてリクエストとレスポンスの拡張をサポートします。`ctx.withReq()`と`ctx.withRes()`を使用して、リクエストごとにカスタム機能を追加できます。

### リクエストの拡張

リクエストオブジェクトにカスタムプロパティを追加：

```typescript
const app = createKori()
  // 認証ミドルウェア
  .onRequest((ctx) => {
    const token = ctx.req.header('authorization');

    if (token) {
      const user = authenticateToken(token.replace('Bearer ', ''));
      return ctx.withReq({ currentUser: user });
    }

    return ctx.withReq({ currentUser: null });
  });

// ハンドラーで使用
app.get('/profile', (ctx) => {
  // currentUserが利用可能で型付け済み
  if (!ctx.req.currentUser) {
    return ctx.res.unauthorized({ message: 'Authentication required' });
  }

  return ctx.res.json({ user: ctx.req.currentUser });
});
```

### レスポンスの拡張

カスタムレスポンスヘルパーを追加：

```typescript
const app = createKori()
  // カスタムレスポンスヘルパー
  .onRequest((ctx) => {
    return ctx.withRes({
      // 成功ラッパー
      success: (data: unknown) =>
        ctx.res.json({
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }),

      // APIエラーラッパー
      apiError: (code: string, message: string) =>
        ctx.res.status(400).json({
          success: false,
          error: { code, message },
          timestamp: new Date().toISOString(),
        }),
    });
  });

// カスタムヘルパーを使用
app.get('/users', async (ctx) => {
  try {
    const users = await ctx.env.db.getUsers();
    return ctx.res.success(users); // カスタムメソッド
  } catch (error) {
    return ctx.res.apiError('FETCH_FAILED', 'Could not fetch users');
  }
});
```

## 遅延処理（`ctx.defer()`）

ハンドラー完了後、レスポンス返却前に実行するタスクをスケジュール。`onRequest`フックでよく使用されますが、ハンドラーでも利用可能です。

### onRequestフック内（推奨）

```typescript
const app = createKori().onRequest((ctx) => {
  // 追跡用のリクエストIDを追加
  const requestId = crypto.randomUUID();

  // レスポンス後のクリーンアップをスケジュール
  ctx.defer(() => {
    // リクエスト固有のリソースをクリーンアップ
    // メトリクスの更新、接続の終了など
  });

  return ctx.withReq({ requestId });
});
```

### ハンドラー内（必要な場合）

```typescript
app.post('/api/process', async (ctx) => {
  // レスポンス後のクリーンアップをスケジュール
  ctx.defer(() => {
    // 一時リソースのクリーンアップ、メトリクスの更新など
  });

  const result = await processData();
  return ctx.res.json({ result });
});
```
