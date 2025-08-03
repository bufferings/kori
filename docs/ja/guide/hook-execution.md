# フック実行

フックの実行方法を理解することで、予測可能な動作を持つアプリケーションを構築できます。

## インスタンスフック

インスタンスフックはアプリケーションライフサイクル中に一度実行されます。

### 実行順序

`onStart`（アプリ起動）→ ... → `defer`コールバック（アプリシャットダウン）

インスタンスフックは登録順序で実行され、deferコールバックは逆順で実行されます：

```typescript
const app = createKori()
  .onStart(async (ctx) => {
    console.log('Start 1: Database setup');

    // このリソースのクリーンアップを遅延
    ctx.defer(() => {
      console.log('Defer 1: Database cleanup');
    });

    return ctx.withEnv({ db: 'connected' });
  })
  .onStart(async (ctx) => {
    console.log('Start 2: Cache setup');

    // このリソースのクリーンアップを遅延
    ctx.defer(() => {
      console.log('Defer 2: Cache cleanup');
    });

    return ctx.withEnv({ cache: 'connected' });
  });

// 起動時の出力：
// Start 1: Database setup
// Start 2: Cache setup

// シャットダウン時の出力（LIFO順序）：
// Defer 2: Cache cleanup
// Defer 1: Database cleanup
```

## リクエストフック

リクエストフックは一致するすべてのリクエストに対して実行されます。

主要な動作：

- `defer`コールバックは**逆順**（LIFO）で実行
- `onRequest`はレスポンスを返すことで処理を停止可能
- フックはリクエスト到着時ではなく、ルート定義時にキャプチャされる

### 実行順序

`onRequest` → ルートハンドラー → `defer`コールバック（逆順）

```typescript
const app = createKori()
  .onRequest((ctx) => {
    console.log('Request 1: Auth check');

    // クリーンアップ操作を遅延
    ctx.defer(() => {
      console.log('Defer 1: Auth cleanup');
    });

    return ctx.withReq({ authenticated: true });
  })
  .onRequest((ctx) => {
    console.log('Request 2: Logging');

    // メトリクス収集を遅延
    ctx.defer(() => {
      console.log('Defer 2: Metrics');
    });

    return ctx.withReq({ requestId: 'abc123' });
  });

app.get('/example', (ctx) => {
  console.log('Handler: Processing request');

  // レスポンスログを遅延
  ctx.defer(() => {
    console.log('Defer 3: Response logged');
  });

  return ctx.res.json({ message: 'Hello' });
});

// 出力：
// Request 1: Auth check
// Request 2: Logging
// Handler: Processing request
// Defer 3: Response logged      ← 逆順（LIFO）！
// Defer 2: Metrics              ← 逆順（LIFO）！
// Defer 1: Auth cleanup         ← 逆順（LIFO）！
```

### onRequestでの早期レスポンス

`onRequest`フックはレスポンスを返すことで実行フローを停止できます。フックがレスポンスを返すと、残りのフックとルートハンドラーはスキップされます。

認証、レート制限、バリデーションにこのパターンを使用：

```typescript
const app = createKori().onRequest((ctx) => {
  const token = ctx.req.header('authorization');
  if (!token) {
    // ここで停止 - ハンドラーは実行されない
    return ctx.res.unauthorized({ message: 'Token required' });
  }
  return ctx.withReq({ authenticated: true });
});

app.get('/protected', (ctx) => {
  // トークンが存在する場合のみ実行
  return ctx.res.json({ message: 'Protected resource' });
});
```

### onError実行

エラーが発生すると、`onError`フックが通常の実行フローを置き換えます：

**通常フロー**：`onRequest` → ルートハンドラー → `defer`コールバック
**エラーフロー**：`onRequest` → エラー発生 → `onError`フック → `defer`コールバック

```typescript
const app = createKori()
  .onRequest((ctx) => {
    console.log('Request: Starting');

    ctx.defer(() => {
      console.log('Defer: Always runs, even on error');
    });

    return ctx.withReq({ authenticated: true });
  })
  .onError((ctx, error) => {
    console.log('Error: Handling error');
    return ctx.res.internalError({ message: 'Something went wrong' });
  });

app.get('/error-demo', (ctx) => {
  console.log('Handler: This will throw');
  throw new Error('Demo error');
});

// エラー発生時の出力：
// Request: Starting
// Handler: This will throw
// Error: Handling error
// Defer: Always runs, even on error
```

#### 複数のonErrorフック

複数の`onError`フックが登録されている場合、いずれかがレスポンスを返すまで順番に実行されます：

```typescript
const app = createKori()
  .onError((ctx, error) => {
    // エラーをログするが処理はしない（次のフックに続く）
    console.log('Error logger:', error.message);
  })
  .onError((ctx, error) => {
    // 特定のエラータイプを処理
    if (error instanceof ValidationError) {
      return ctx.res.badRequest({ message: error.message });
    }
    // 処理されない場合は次のフックに続く
  })
  .onError((ctx, error) => {
    // 最終的なフォールバック
    return ctx.res.internalError({ message: 'Internal error' });
  });
```

### よくある落とし穴：フックのタイミング

重要：フックはリクエスト到着時ではなく、ルート定義時にキャプチャされます。

```typescript
const app = createKori();

// ルートを最初に定義
app.get('/route1', (ctx) => ctx.res.json({ hooks: 'none' }));

// ルート定義後にフックを追加
app.onRequest((ctx) => {
  console.log('This hook will NOT apply to route1');
});

// このルートはフックを持つ
app.get('/route2', (ctx) => ctx.res.json({ hooks: 'yes' }));

// /route1 - フックは適用されない
// /route2 - フックが適用される
```

### ベストプラクティス

ルートを定義する前にすべてのフックを定義：

```typescript
const app = createKori()
  .onRequest((ctx) => {
    console.log('Processing request');

    // 完了ログを遅延
    ctx.defer(() => {
      console.log('Request completed');
    });

    // クリーンアップ操作を遅延
    ctx.defer(() => {
      console.log('Cleaning up');
    });

    return ctx.withReq({ timestamp: Date.now() });
  })
  .onError((ctx, error) => {
    console.error('Request failed:', error.message);
  });

// この時点以降に定義されたすべてのルートは上記のフックを使用
app.get('/users', (ctx) => ctx.res.json({ users: [] }));

app.get('/posts', (ctx) => ctx.res.json({ posts: [] }));
```
