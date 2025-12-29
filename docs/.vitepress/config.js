import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Kori',
  description: 'Type safety in your flow - From schemas to types, validation, and docs',
  base: '/kori/',

  // Internationalization configuration
  locales: {
    en: {
      label: 'English',
      lang: 'en',
      title: 'Kori',
      description: 'Type safety in your flow - From schemas to types, validation, and docs',
    },
    ja: {
      label: '日本語',
      lang: 'ja',
      title: 'Kori',
      description: '流れるような型安全性 - スキーマから型、バリデーション、ドキュメントへ',
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
      ],
    },

    // Internationalization theme configuration
    locales: {
      en: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Guide', link: '/en/guide/what-is-kori' },
        ],
      },
      ja: {
        nav: [
          { text: 'ホーム', link: '/ja/' },
          { text: 'ガイド', link: '/ja/guide/what-is-kori' },
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
