import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Kori (WIP)',
  description: 'A TypeScript web framework for type-safety-first development',
  base: '/kori/',

  // Internationalization configuration
  locales: {
    en: {
      label: 'English',
      lang: 'en',
      title: 'Kori (WIP)',
      description: 'A TypeScript web framework for type-safety-first development',
    },
    ja: {
      label: '日本語',
      lang: 'ja',
      title: 'Kori (WIP)',
      description: '型安全性ファーストな開発のためのTypeScript Webフレームワーク',
    },
  },

  themeConfig: {
    logo: '/logo.svg',

    // Global sidebar configuration
    sidebar: {
      '/en/': [
        {
          text: 'Introduction',
          collapsed: false,
          items: [
            { text: 'What is Kori?', link: '/en/guide/what-is-kori' },
            { text: 'Getting Started', link: '/en/guide/getting-started' },
          ],
        },
        {
          text: 'Features',
          collapsed: false,
          items: [
            { text: 'Instance Context', link: '/en/guide/instance-context' },
            { text: 'Handler Context', link: '/en/guide/handler-context' },
            { text: 'Context Evolution', link: '/en/guide/context-evolution' },
            { text: 'Logging', link: '/en/guide/logging' },
            { text: 'Routing', link: '/en/guide/routing' },
            { text: 'Hooks', link: '/en/guide/hooks' },
            { text: 'Hook Execution', link: '/en/guide/hook-execution' },
            { text: 'Error Handling', link: '/en/guide/error-handling' },
            { text: 'Plugins', link: '/en/guide/plugins' },
            { text: 'Request Validation', link: '/en/guide/request-validation' },
            { text: 'Response Validation', link: '/en/guide/response-validation' },
            { text: 'OpenAPI Integration', link: '/en/guide/openapi' },
          ],
        },
        // {
        //   text: 'Core API',
        //   collapsed: true,
        //   items: [
        //     { text: 'Kori', link: '/en/core/kori' },
        //     { text: 'Instance Context', link: '/en/core/instance-context' },
        //     { text: 'Handler Context', link: '/en/core/handler-context' },
        //     { text: 'Request', link: '/en/core/request' },
        //     { text: 'Response', link: '/en/core/response' },
        //   ],
        // },
        // {
        //   text: 'Extensions',
        //   collapsed: true,
        //   items: [
        //     { text: 'Zod Schema', link: '/en/extensions/zod-schema' },
        //     { text: 'Zod Validation', link: '/en/extensions/zod-validation' },
        //     { text: 'Zod OpenAPI Plugin', link: '/en/extensions/zod-openapi-plugin' },
        //     { text: 'CORS Plugin', link: '/en/extensions/cors-plugin' },
        //     { text: 'Body Limit Plugin', link: '/en/extensions/body-limit-plugin' },
        //     { text: 'Security Headers Plugin', link: '/en/extensions/security-headers-plugin' },
        //     { text: 'File Plugin', link: '/en/extensions/file-plugin' },
        //   ],
        // },
        // {
        //   text: 'Examples',
        //   collapsed: true,
        //   items: [
        //     { text: 'Basic Server', link: '/en/examples/basic-server' },
        //     { text: 'REST API', link: '/en/examples/rest-api' },
        //     { text: 'File Upload', link: '/en/examples/file-upload' },
        //     { text: 'WebSocket', link: '/en/examples/websocket' },
        //   ],
        // },
      ],
      '/ja/': [
        {
          text: '紹介',
          collapsed: false,
          items: [
            { text: 'Koriとは？', link: '/ja/guide/what-is-kori' },
            { text: 'はじめる', link: '/ja/guide/getting-started' },
          ],
        },
        {
          text: '機能',
          collapsed: false,
          items: [
            { text: 'インスタンスコンテキスト', link: '/ja/guide/instance-context' },
            { text: 'ハンドラーコンテキスト', link: '/ja/guide/handler-context' },
            { text: 'コンテキストの進化', link: '/ja/guide/context-evolution' },
            { text: 'ログ', link: '/ja/guide/logging' },
            { text: 'ルーティング', link: '/ja/guide/routing' },
            { text: 'フック', link: '/ja/guide/hooks' },
            { text: 'フック実行', link: '/ja/guide/hook-execution' },
            { text: 'エラーハンドリング', link: '/ja/guide/error-handling' },
            { text: 'プラグイン', link: '/ja/guide/plugins' },
            { text: 'リクエストバリデーション', link: '/ja/guide/request-validation' },
            { text: 'レスポンスバリデーション', link: '/ja/guide/response-validation' },
            { text: 'OpenAPI統合', link: '/ja/guide/openapi' },
          ],
        },
        // {
        //   text: 'コアAPI',
        //   collapsed: true,
        //   items: [
        //     { text: 'Kori', link: '/ja/core/kori' },
        //     { text: 'インスタンスコンテキスト', link: '/ja/core/instance-context' },
        //     { text: 'ハンドラーコンテキスト', link: '/ja/core/handler-context' },
        //     { text: 'リクエスト', link: '/ja/core/request' },
        //     { text: 'レスポンス', link: '/ja/core/response' },
        //   ],
        // },
        // {
        //   text: '拡張機能',
        //   collapsed: true,
        //   items: [
        //     { text: 'Zodスキーマ', link: '/ja/extensions/zod-schema' },
        //     { text: 'Zodバリデーション', link: '/ja/extensions/zod-validation' },
        //     { text: 'Zod OpenAPIプラグイン', link: '/ja/extensions/zod-openapi-plugin' },
        //     { text: 'CORSプラグイン', link: '/ja/extensions/cors-plugin' },
        //     { text: 'ボディ制限プラグイン', link: '/ja/extensions/body-limit-plugin' },
        //     { text: 'セキュリティヘッダープラグイン', link: '/ja/extensions/security-headers-plugin' },
        //     { text: 'ファイルプラグイン', link: '/ja/extensions/file-plugin' },
        //   ],
        // },
        // {
        //   text: '例',
        //   collapsed: true,
        //   items: [
        //     { text: '基本的なサーバー', link: '/ja/examples/basic-server' },
        //     { text: 'REST API', link: '/ja/examples/rest-api' },
        //     { text: 'ファイルアップロード', link: '/ja/examples/file-upload' },
        //     { text: 'WebSocket', link: '/ja/examples/websocket' },
        //   ],
        // },
      ],
    },

    // Internationalization theme configuration
    locales: {
      en: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Guide', link: '/en/guide/what-is-kori' },
          // { text: 'Core', link: '/en/core/' },
          // { text: 'Extensions', link: '/en/extensions/' },
          // { text: 'Examples', link: '/en/examples/' },
        ],
      },
      ja: {
        nav: [
          { text: 'ホーム', link: '/ja/' },
          { text: 'ガイド', link: '/ja/guide/what-is-kori' },
          // { text: 'コア', link: '/ja/core/' },
          // { text: '拡張機能', link: '/ja/extensions/' },
          // { text: '例', link: '/ja/examples/' },
        ],
      },
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/bufferings/kori' }],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/bufferings/kori/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Kori',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },

  ignoreDeadLinks: true,
});
