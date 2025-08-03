---
layout: home

hero:
  name: 'Kori'
  text: 'Type-Safe TypeScript Web Framework'
  tagline: '⚠️ Work in Progress - Built for type safety, validation, and developer experience'
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/what-is-kori
    - theme: alt
      text: View on GitHub
      link: https://github.com/bufferings/kori

features:
  - title: Zero Runtime Casting
    details: Write `ctx.req.validatedBody()` and get perfectly typed data. No manual casting, no type assertions, no runtime surprises.
  - title: Schema-Driven Development
    details: One Zod schema powers validation, TypeScript types, and OpenAPI documentation. Change once, update everywhere automatically.
  - title: Type-Safe Context Evolution
    details: Each plugin and hook adds precisely typed properties through method chaining. Your handler context grows safely as you add features.
  - title: Always-Sync Documentation
    details: Interactive API documentation generated from your validation schemas. Impossible to get out of sync because it's the same source of truth.
---
