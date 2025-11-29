# エラーハンドリング

Koriは、組み込まれたエラーレスポンスと柔軟なエラー回復パターンによる包括的なエラーハンドリングを提供します。

## 組み込まれたエラーレスポンス

Koriには、適切なHTTPステータスコードを設定してJSONボディを返すすぐに使えるエラーレスポンスメソッドが含まれています：

```typescript
app.get('/users/:id', async (ctx) => {
  const id = ctx.req.param('id');

  const user = await getUser(Number(id));

  if (!user) {
    return ctx.res.notFound({
      message: `User with ID ${id} not found`,
      code: 'USER_NOT_FOUND',
    });
  }

  return ctx.res.json({ user });
});
```

### 利用可能なエラーメソッド

```typescript
// 400 Bad Request
ctx.res.badRequest();

// 401 Unauthorized
ctx.res.unauthorized();

// 403 Forbidden
ctx.res.forbidden();

// 404 Not Found
ctx.res.notFound();

// 405 Method Not Allowed
ctx.res.methodNotAllowed();

// 415 Unsupported Media Type
ctx.res.unsupportedMediaType();

// 408 Request Timeout
ctx.res.timeout();

// 500 Internal Server Error
ctx.res.internalError();
```

### エラーレスポンス形式

すべてのエラーレスポンスは一貫した構造でJSON形式を返します。

#### デフォルトレスポンス

カスタムオプションなしでは、各メソッドは標準メッセージを返します：

```typescript
// デフォルト使用
ctx.res.notFound();
```

```json
{
  "error": {
    "type": "NOT_FOUND",
    "message": "Not Found"
  }
}
```

#### カスタムレスポンス

エラーレスポンスに追加フィールドを含めることができます：

```typescript
// カスタム使用
ctx.res.notFound({
  message: 'User with ID 123 not found',
  code: 'USER_NOT_FOUND',
  details: { userId: 123, searchedAt: new Date().toISOString() },
});
```

```json
{
  "error": {
    "type": "NOT_FOUND",
    "message": "User with ID 123 not found",
    "code": "USER_NOT_FOUND",
    "details": {
      "userId": 123,
      "searchedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## グローバルエラーハンドリング

`onError`フックでアプリケーション全体のエラーハンドリングを設定：

```typescript
const app = createKori().onError((ctx, error) => {
  // エラーをログ
  ctx.log().error('Request failed', {
    error: error.message,
    stack: error.stack,
    url: ctx.req.url().pathname,
  });

  // 適切なレスポンスを返却
  return ctx.res.internalError({ message: 'Internal Server Error' });
});
```
