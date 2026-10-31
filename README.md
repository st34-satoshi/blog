# blog
blog.stu345.comに公開するブログ

Astroで構築する静的ブログです。

## 開発

Node.js 24とnpmを使用します。nvmを利用する場合:

```sh
nvm install
nvm use
npm ci
npm run dev
```

http://localhost:4321/ を開くとブログのトップページが表示されます。
ページは `src/pages/index.astro` で編集できます。

## ビルド・プレビュー

```sh
npm run build
npm run preview
```

静的ファイルは `dist/` に出力されます。

## 記事の追加

`src/content/posts/YYYY/slug/index.md`を追加すると、`/<slug>/` が自動生成されます。YYYYは初回公開年（UTC）です。記事ごとのAstroルート作成は不要です。

```markdown
---
title: "記事タイトル"
slug: new-post
publishedAt: 2026-10-31T09:00:00+09:00
description: "記事の概要"
categories: [日記]
tags: []
draft: false
---

ここにMarkdownで本文を書きます。
```

この例は `src/content/posts/2026/new-post/index.md` に保存します。新しい画像は `public/images/2026/new-post/` に置き、本文から `/images/2026/new-post/image.webp` として参照します。

HTML形式の記事では `format: html` を指定し、同じフォルダの `body.html` に本文を書きます。通常の記事はMarkdownを使用します。

## ディレクトリ構成

```text
src/
├── content.config.ts
├── content/
│   ├── pages/home/
│   └── posts/YYYY/slug/
│       └── index.md
├── components/
├── layouts/
│   ├── SiteLayout.astro
│   └── PostLayout.astro
└── pages/
    ├── index.astro
    └── [...slug].astro
```

詳細な追加・更新・検証ルールは [AGENTS.md](AGENTS.md) を参照してください。
