# ルーティング

Koriアプリケーションでルートを定義し、さまざまなURLパターンを処理する方法を学びます。Koriは[HonoのSmartRouter](https://hono.dev/docs/concepts/routers#smartrouter)をラップしているため、ルーティング動作は基本的にHonoと同じです。

## 基本的なルーティング

Koriは一般的なHTTP動詞のための直感的なメソッドを提供します：

```typescript
const app = createKori();

// GETルート
app.get('/users', (ctx) => {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
  return ctx.res.json({ users });
});

// POSTルート
app.post('/users', async (ctx) => {
  const body = await ctx.req.bodyJson();
  const newUser = createUser(body);
  return ctx.res.json({ user: newUser });
});

// PUTルート
app.put('/users/:id', async (ctx) => {
  const { id } = ctx.req.pathParams();
  const body = await ctx.req.bodyJson();
  const user = await updateUser(id, body);
  return ctx.res.json({ user });
});

// DELETEルート
app.delete('/users/:id', async (ctx) => {
  const { id } = ctx.req.pathParams();
  await deleteUser(id);
  return ctx.res.empty();
});

// PATCHルート
app.patch('/users/:id', async (ctx) => {
  const { id } = ctx.req.pathParams();
  const body = await ctx.req.bodyJson();
  const user = await partialUpdateUser(id, body);
  return ctx.res.json({ user });
});
```

Koriは`.head()`と`.options()`メソッドもサポートしており、HEADとOPTIONSリクエストを処理できます。

## パスパラメータ

Koriは、より良いIDE支援のためにコンパイル時にパスパラメータ名を自動的に推論します：

```typescript
// 単一パラメータ - TypeScriptは{ id: string }を推論
app.get('/users/:id', (ctx) => {
  // ctx.req.pathParams()は{ id: string }として型付け
  const { id } = ctx.req.pathParams(); // idはstring
  return ctx.res.json({ userId: id });
});

// 複数パラメータ - 自動的に推論
app.get('/users/:userId/posts/:postId', (ctx) => {
  // ctx.req.pathParams()は{ userId: string, postId: string }として型付け
  const { userId, postId } = ctx.req.pathParams();
  return ctx.res.json({
    userId, // string
    postId, // string
    message: `Post ${postId} by user ${userId}`,
  });
});

// オプションパラメータ（?を使用）
app.get('/search/:query/:page?', (ctx) => {
  // ctx.req.pathParams()は{ query: string, page?: string }として型付け
  const { query, page } = ctx.req.pathParams();
  const pageNumber = page ? parseInt(page) : 1;
  return ctx.res.json({ query, page: pageNumber });
});

// カスタム正規表現パターン
app.get('/files/:id{[0-9]+}', (ctx) => {
  // ctx.req.pathParams()は{ id: string }として型付け
  const { id } = ctx.req.pathParams(); // idは数字のみにマッチ
  return ctx.res.json({ fileId: id });
});
```

型推論は、コンパイル時にルート文字列を解析してパラメータ名を抽出することで動作し、タイプミスを防ぎ、IDE自動補完を改善します。

**重要：** 型推論は、ルートパスを文字列リテラルとしてルートメソッドに直接渡す場合にのみ機能します。以下の場合は機能**しません**：

- 変数で定義されたルート：`const path = '/users/:id'; app.get(path, ...)` - 推論なし
- 親ルートからのパスパラメータ（`createChild`プレフィックスで定義）- これらは推論される型に含まれません

ルートメソッド自体の文字列リテラルで直接定義されたパラメータのみが型安全になります。

## ルートグループと子ルート

`createChild()`を使用してモジュラーなルートグループを作成：

```typescript
// API v1ルートを作成
const apiV1 = app.createChild({
  prefix: '/api/v1',
  configure: (k) =>
    k
      .get('/status', (ctx) => {
        return ctx.res.json({ version: 'v1', status: 'stable' });
      })
      .get('/users', (ctx) => {
        return ctx.res.json({ users: getUsersV1() });
      }),
});

// 異なる動作を持つAPI v2ルートを作成
const apiV2 = app.createChild({
  prefix: '/api/v2',
  configure: (k) =>
    k
      .onRequest((ctx) => {
        // v2のみのリクエストログ
        ctx.log().info('API v2 request', { path: ctx.req.url().pathname });
      })
      .get('/status', (ctx) => {
        return ctx.res.json({
          version: 'v2',
          status: 'beta',
          features: ['enhanced-validation', 'better-errors'],
        });
      })
      .get('/users', (ctx) => {
        return ctx.res.json({ users: getUsersV2() });
      }),
});

// 認証付きの管理者ルート
const adminRoutes = app.createChild({
  prefix: '/admin',
  configure: (k) =>
    k
      .onRequest((ctx) => {
        const token = ctx.req.header('authorization')?.replace('Bearer ', '');
        if (!token || !isValidAdminToken(token)) {
          return ctx.res.unauthorized({ message: 'Admin access required' });
        }
        return ctx.withReq({ isAdmin: true });
      })
      .get('/dashboard', (ctx) => {
        return ctx.res.json({ dashboard: 'admin data' });
      }),
});
```

## ルート登録順序

ルートは登録された順序でマッチします。より具体的なルートは、より一般的なものよりも前に定義する必要があります：

```typescript
// ✅ 正しい：具体的なルートを最初に
app.get('/users/me', (ctx) => {
  return ctx.res.json({ user: getCurrentUser(ctx) });
});

app.get('/users/:id', (ctx) => {
  const { id } = ctx.req.pathParams();
  return ctx.res.json({ user: getUserById(id) });
});

// ❌ 不正：これは決してマッチしない
// app.get('/users/:id', handler);
// app.get('/users/me', handler); // 決してマッチしない！
```
