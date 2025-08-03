# ログ

構造化JSON出力、コンテキスト対応ログ、設定オプションを含むKoriのログ機能の使用方法を学びます。

## 概要

Koriは設定可能なレポーターを持つ構造化ログシステムを提供します。ロガーは構造化ログエントリを生成し、デフォルトのコンソールレポーターは学習と素早い開始のためのシンプルなJSON出力を提供します。

実際のアプリケーション開発では、より良いパフォーマンスと機能のためにPino（Node.js用）、LogTape（ユニバーサル）、または他のプロダクションレベルのログソリューション専用レポーターの使用を検討してください。

## ログの種類

Koriは、Koriコンテキストの内外に応じてロガーを提供します：

### Koriコンテキスト外

アプリケーションセットアップとシステム全体のイベントには`app.log()`を使用：

```typescript
const app = createKori();

// アプリケーション開始前に使用
app.log().info('Setting up application', { port: 3000 });
```

### Koriコンテキスト内

フックとハンドラー内では`ctx.log()`を使用：

```typescript
const app = createKori()
  .onStart(async (ctx) => {
    // ライフサイクルフック内で使用
    ctx.log().info('Initializing database connection');

    const db = await connectDatabase();
    return ctx.withEnv({ db });
  })
  .get('/users', (ctx) => {
    // リクエストハンドラー内で使用（リクエストメタデータを自動的に含む）
    ctx.log().info('Processing user request');
    return ctx.res.json({ users: [] });
  });
```

## ログレベル

Koriは重要度順に5つのログレベルをサポートします：

```typescript
app.get('/example', (ctx) => {
  const logger = ctx.log();

  logger.debug('Processing data', { userId: '123' }); // 最も詳細
  logger.info('Request completed successfully');
  logger.warn('Rate limit approaching', { remaining: 5 });
  logger.error('Database connection failed', { err: error });
  logger.fatal('Critical system failure'); // 最も重要

  return ctx.res.json({ result: 'ok' });
});
```

最小ログレベルを設定：

```typescript
const app = createKori({
  loggerOptions: {
    level: 'info', // info以上のみログ（warn、error、fatal）
  },
});
```

## 構造化ログ

Koriは構造化ログエントリを生成します。デフォルトのコンソールレポーターは、一貫したフィールドとタイムスタンプを持つJSONとしてこれらを出力します。すべてのメタデータは`meta`オブジェクトに配置されます。

```typescript
app.get('/users/:id', (ctx) => {
  const logger = ctx.log();

  logger.info('Fetching user', { userId: ctx.req.pathParams().id });

  return ctx.res.json({ user: { id: '123', name: 'John' } });
});
```

出力（読みやすさのためにフォーマット、実際の出力は1行）：

```json
{
  "time": 1754201824386,
  "level": "info",
  "channel": "app",
  "name": "request",
  "message": "Fetching user",
  "meta": {
    "userId": "1"
  }
}
```

## ロガー設定

アプリケーション起動時にログ動作を設定：

```typescript
const app = createKori({
  loggerOptions: {
    level: 'debug',
    bindings: {
      service: 'user-api',
      version: '1.2.0',
    },
  },
});
```

- `level`：最小ログレベルを設定（このレベル以下のログは無視される）
- `bindings`：すべてのログエントリに自動的に追加されるキー値ペア

## パフォーマンス最適化

### レベルチェック

ログが無効な場合の高コスト操作を回避：

```typescript
app.get('/debug', (ctx) => {
  const logger = ctx.log();

  // 高コストな計算の前にデバッグレベルが有効かチェック
  if (logger.isLevelEnabled('debug')) {
    const expensiveData = computeSystemMetrics(); // 必要な場合のみ実行
    logger.debug('System metrics', { metrics: expensiveData });
  }

  return ctx.res.json({ status: 'ok' });
});
```

### 遅延メタデータ生成

ログが有効な場合のみ実行される高コストなメタデータ計算には関数を使用：

```typescript
app.get('/profile', (ctx) => {
  const logger = ctx.log();

  // infoレベルが有効な場合のみ関数が呼ばれる
  logger.info('User profile accessed', () => {
    return {
      userStats: calculateUserStatistics(ctx.req.pathParams().id),
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
    };
  });

  return ctx.res.json({ profile: getUserProfile() });
});
```

メタデータ関数は遅延実行されます - ログレベルが有効な場合のみ実行され、不要な計算を回避します。
