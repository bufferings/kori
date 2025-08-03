# プラグイン

Koriのプラグインは、アプリケーションの機能を拡張する再利用可能な機能片です。型安全な拡張、ライフサイクルフック、エンドポイントを提供します。これにより、認証、ログ、CORSなどの横断的関心事を実現できます。

## プラグインの使用

`applyPlugin()`メソッドを使用して、Koriアプリケーションにプラグインを適用します。これにより、プラグインの機能がアプリケーションに統合されます：

```typescript
import { createKori } from '@korix/kori';
import { corsPlugin } from '@korix/cors-plugin';
import { bodyLimitPlugin } from '@korix/body-limit-plugin';

const app = createKori()
  .applyPlugin(
    corsPlugin({
      origin: ['https://myapp.com'],
      credentials: true,
    }),
  )
  .applyPlugin(
    bodyLimitPlugin({
      maxSize: 10 * 1024 * 1024, // 10MB in bytes
    }),
  );
```

## プラグインの動作原理

プラグインは、フックとエンドポイントをまとめたコレクションです。プラグインを適用すると、そのフック（onRequest、onErrorなど）と定義されたエンドポイントをアプリケーションに登録することになります。

例えば、ログプラグインは複数のフックを使用する場合があります：

```typescript
import {
  defineKoriPlugin,
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriPlugin,
} from '@korix/kori';

// シンプルなログプラグインの構造
export function loggingPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(): KoriPlugin<Env, Req, Res, unknown, { startTime: number }, unknown> {
  return defineKoriPlugin({
    name: 'simple-logging',
    apply: (kori) =>
      kori.onRequest((ctx) => {
        // リクエスト開始時にログ
        ctx.log().info('Request started', {
          method: ctx.req.method(),
          path: ctx.req.url().pathname,
        });

        // レスポンスログを遅延
        ctx.defer(() => {
          const duration = Date.now() - ctx.req.startTime;
          ctx.log().info('Request completed', {
            status: ctx.res.getStatus(),
            duration: `${duration}ms`,
          });
        });

        return ctx.withReq({ startTime: Date.now() });
      }),
  });
}
```

## プラグインの順序

プラグインは登録された順序で適用されます。各プラグインはそのフックをアプリケーションに登録します：

```typescript
// 一般的な順序の例：
const app = createKori()
  // 1番目：CORSプリフライト用のフックを登録
  .applyPlugin(corsPlugin({ origin: true }))
  // 2番目：ボディサイズチェック用のフックを登録
  .applyPlugin(bodyLimitPlugin())
  // 3番目：セキュリティヘッダー用のフックを登録
  .applyPlugin(securityHeadersPlugin());
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

## 公式プラグイン

Koriは一般的な使用ケースのための公式プラグインを提供しています。詳細なドキュメントについては拡張セクションをご覧ください。
