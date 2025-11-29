# プラグイン

Koriのプラグインは、アプリケーションの機能を拡張する再利用可能な機能片です。型安全な拡張、ライフサイクルフック、エンドポイントを提供します。これにより、認証、ログ、CORSなどの横断的関心事を実現できます。

## プラグインの使用

`applyPlugin()`メソッドを使用して、Koriアプリケーションにプラグインを適用します。これにより、プラグインの機能がアプリケーションに統合されます：

```typescript
import { createKori } from '@korix/kori';
import { enableZodRequestValidation } from '@korix/zod-schema-adapter';
import { zodOpenApiPlugin } from '@korix/zod-openapi-plugin';
import { swaggerUiPlugin } from '@korix/openapi-swagger-ui-plugin';

const app = createKori({
  ...enableZodRequestValidation(),
})
  .applyPlugin(
    zodOpenApiPlugin({
      info: {
        title: 'My API',
        version: '1.0.0',
      },
    }),
  )
  .applyPlugin(swaggerUiPlugin());
```

## プラグインの動作原理

プラグインは、フックとエンドポイントをまとめたコレクションです。プラグインを適用すると、そのフック（onRequest、onErrorなど）と定義されたエンドポイントをアプリケーションに登録することになります。

例えば、ログプラグインは複数のフックを使用する場合があります：

```typescript
import {
  defineKoriPlugin,
  createKoriPluginLogger,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriPlugin,
} from '@korix/kori';

// 専用ロガーを使ったより良いログプラグイン
export function loggingPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res, unknown, { startTime: number }, unknown> {
  return defineKoriPlugin({
    name: 'request-logging',
    apply: (kori) => {
      const log = createKoriPluginLogger({
        baseLogger: kori.log(),
        pluginName: 'request-logging',
      });

      log.info('Request logging plugin initialized');

      return kori.onRequest((ctx) => {
        const requestLog = createKoriPluginLogger({
          baseLogger: ctx.log(),
          pluginName: 'request-logging',
        });

        // リクエスト開始時にログ
        requestLog.info('Request started', {
          method: ctx.req.method(),
          path: ctx.req.url().pathname,
        });

        // レスポンスログを遅延
        ctx.defer(() => {
          const duration = Date.now() - ctx.req.startTime;
          requestLog.info('Request completed', {
            status: ctx.res.getStatus(),
            duration: `${duration}ms`,
          });
        });

        return ctx.withReq({ startTime: Date.now() });
      });
    },
  });
}
```

## プラグインの順序

プラグインは登録された順序で適用されます。各プラグインはそのフックをアプリケーションに登録します：

```typescript
import { createKori } from '@korix/kori';
import { requestIdPlugin, timingPlugin, loggingPlugin } from './my-plugins';

const app = createKori()
  // 1番目：すべてのリクエストにリクエストIDを追加
  .applyPlugin(requestIdPlugin())
  // 2番目：タイミングを追跡（timingがrequestIdを使用する場合はrequestIdの後に）
  .applyPlugin(timingPlugin())
  // 3番目：リクエストをログ（完全なコンテキストをログするため最後に）
  .applyPlugin(loggingPlugin());
```

## 型拡張

プラグインはコンテキスト（環境、リクエスト、レスポンス）に新しいプロパティを追加できます：

```typescript
import { createKori } from '@korix/kori';
import { requestIdPlugin } from './my-plugins';

// プラグイン前：ctx.reqはベースKoriRequest型
const baseApp = createKori();
// ctx.req: KoriRequest

// プラグイン後：ctx.req型が拡張される
const app = baseApp.applyPlugin(requestIdPlugin());
// ctx.req: KoriRequest & { requestId: string }

app.get('/test', {
  handler: (ctx) => {
    // TypeScriptはrequestIdプロパティを認識
    const id: string = ctx.req.requestId; // ✅ 完全に型付け
    return ctx.res.json({ requestId: id });
  },
});
```

### チェーンと型のマージ

型拡張を持つ複数のプラグインをチェーンすると、その型は自動的にマージされます：

✅ 良い例：チェーン呼び出しは型情報を保持

```typescript
import { createKori } from '@korix/kori';
import { requestIdPlugin, timingPlugin } from './my-plugins';

const app = createKori()
  // { requestId: string }を追加
  .applyPlugin(requestIdPlugin())
  // { startTime: number }を追加
  .applyPlugin(timingPlugin());
// 最終型: KoriRequest & { requestId: string } & { startTime: number }

app.get('/test', {
  handler: (ctx) => {
    // TypeScriptは両方の拡張を認識
    const id: string = ctx.req.requestId; // ✅ requestIdPluginから
    const time: number = ctx.req.startTime; // ✅ timingPluginから

    return ctx.res.json({
      requestId: id,
      processingTime: Date.now() - time,
    });
  },
});
```

❌ 避けるべき：個別の呼び出しは型情報を失う

```typescript
import { createKori } from '@korix/kori';
import { requestIdPlugin, timingPlugin } from './my-plugins';

const app2 = createKori();

const withRequestId = app2.applyPlugin(requestIdPlugin());
// 変数に保存すると型拡張が失われる

const withTiming = withRequestId.applyPlugin(timingPlugin());
// TypeScriptはもうrequestIdについて知らない

withTiming.get('/broken', {
  handler: (ctx) => {
    const id = ctx.req.requestId; // ❌ TypeScriptエラー！
  },
});
```

## カスタムプラグインの作成

`defineKoriPlugin()`を使用して独自のプラグインを定義します。

TypeScriptはコンテキスト拡張から型を自動的に推論できますが、明示的な型定義は以下の場合に有用です：

- 他のファイルがインポートする再利用可能なプラグインの作成
- コンテキストオブジェクトに関数やメソッドを追加する場合
- プラグインのインターフェースを明確に文書化する場合

### 基本的なプラグイン

```typescript
import {
  defineKoriPlugin,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriPlugin,
} from '@korix/kori';

const timestampPlugin = <
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res> =>
  defineKoriPlugin({
    name: 'timestamp',
    apply: (kori) =>
      kori.onRequest((ctx) => {
        // レスポンスが準備できるまでヘッダー設定を遅延
        ctx.defer(() => {
          ctx.res.setHeader('x-timestamp', new Date().toISOString());
        });
      }),
  });
```

### 型拡張を持つプラグイン

コンテキストを新しいプロパティで拡張するプラグインを作成：

```typescript
import {
  defineKoriPlugin,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriPlugin,
} from '@korix/kori';

type RequestIdExtension = { requestId: string };

const requestIdPlugin = <
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res, unknown, RequestIdExtension, unknown> =>
  defineKoriPlugin({
    name: 'request-id',
    apply: (kori) =>
      kori.onRequest((ctx) => {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // レスポンスが準備できるまでヘッダー設定を遅延
        ctx.defer(() => {
          ctx.res.setHeader('x-request-id', ctx.req.requestId);
        });

        return ctx.withReq({ requestId });
      }),
  });
```

## プラグインログ

プラグインは、より良い整理とデバッグ機能を提供するために専用のロガーを使用すべきです。`createKoriPluginLogger()`を使用して、自動的に名前空間が付けられたプラグイン専用ロガーを作成します。

### プラグイン専用ロガー

```typescript
import {
  defineKoriPlugin,
  createKoriPluginLogger,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriPlugin,
} from '@korix/kori';

export function authPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res> {
  return defineKoriPlugin({
    name: 'auth',
    apply: (kori) => {
      // インスタンスレベルのプラグインロガー
      const log = createKoriPluginLogger({
        baseLogger: kori.log(),
        pluginName: 'auth',
      });

      log.info('Auth plugin initialized');

      return kori.onRequest((ctx) => {
        // リクエストレベルのプラグインロガー
        const requestLog = createKoriPluginLogger({
          baseLogger: ctx.log(),
          pluginName: 'auth',
        });

        requestLog.info('Checking authentication', {
          path: ctx.req.url().pathname,
        });

        // 認証ロジック...
      });
    },
  });
}
```

### プラグインロガーの利点

プラグイン専用ロガーはいくつかの利点を提供します：

- 名前空間の分離：ログは自動的に`plugin.{pluginName}`でプレフィックスされる
- デバッグの改善：特定のプラグインでログをフィルタリングしやすい
- 一貫したフォーマット：ベースロガーからすべてのバインディングを継承
- チャネルの分離：プラグインログは整理のために専用チャネルを使用

### ロガー出力

プラグインロガーは自動的に名前空間を付けて出力します：

```json
{
  "time": 1754201824386,
  "level": "info",
  "channel": "plugin.auth",
  "name": "request",
  "message": "Checking authentication",
  "meta": {
    "path": "/api/users"
  }
}
```

通常のコンテキストログと比較：

```json
{
  "time": 1754201824386,
  "level": "info",
  "channel": "app",
  "name": "request",
  "message": "Processing request",
  "meta": {}
}
```

## 公式プラグイン

Koriは一般的な使用ケースのための公式プラグインを提供しています。詳細なドキュメントについては拡張セクションをご覧ください。
