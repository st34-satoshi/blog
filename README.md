# blog

個人ブログ「Notes to Forget」のリポジトリです。Astroで構築し、Cloudflare Workersで配信しています。

サイト：[Notes to Forget](https://blog.stu345.com/)

## 開発

Node.js 24とnpmを使用します。nvmを利用する場合:

```sh
nvm install
nvm use
npm ci
npm run dev
```

http://localhost:4321/ を開くとブログのトップページが表示されます。
トップページの本文は `src/content/pages/home/body.html`、タイトル・日時などは同じフォルダの `index.md` で編集できます。

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

## 記事の更新

対象記事の `index.md`（HTML形式なら本文は `body.html`）を編集し、必要に応じて `updatedAt` をタイムゾーン付き日時で設定します。初回公開日・保存先の年・公開済みslugは維持します。更新後は `npm run check:files` と `npm run build` を実行し、ローカルで本文・画像・リンクを確認してPRを作成します。

## ファイルサイズのルール

画像・フォント・PDF・ソースなど、Gitに含める全ファイルを **1ファイル1 MiB（1,048,576バイト）以下** にします。1 MiBちょうどは許可します。画像は表示に必要な解像度へ縮小し、圧縮やWebP化で上限内に収めてください。その他のファイルも不要な内容の削除などで小さくします。検査を回避するために `.gitignore` に追加しないでください。

```sh
npm run check:files
```

ローカルではHEADとの差分（ステージ済み・未ステージの追加・変更・リネーム）と、無視されていない未追跡ファイルの現在のサイズを検査します。変更していないファイルと削除したファイルは検査しません。`node_modules/` や `dist/` などGit対象外のファイルは除外されます。超過がある場合はファイル名・バイト数を表示して失敗します。

PRとmainへのpush時にはGitHub Actionsの `File sizes` が差分を検査します。PRではベースコミットから、mainへのpushではpush前のコミットからの差分が対象です。複数コミットのpushもまとめて検査します。ビルド成功は既存のCloudflare Buildsで確認します。マージ前に両方のチェックが成功していることを確認してください。

## ディレクトリ構成

```text
src/
├── content.config.ts
├── content/
│   ├── pages/slug/
│   │   ├── index.md
│   │   └── body.html
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

## Cloudflareへのデプロイ

Cloudflare WorkersのStatic Assetsで `dist/` を配信します。設定は `wrangler.jsonc` で管理します。記事URLは末尾スラッシュ付きで配信され、存在しないURLは404を返します。

Cloudflare Workers BuildsでGitHubリポジトリを接続し、以下を設定します。

| 設定 | 値 |
| --- | --- |
| Worker名 | `blog`（wrangler.jsoncと一致させる） |
| リポジトリ | `st34-satoshi/blog` |
| Production branch | `main` |
| Root directory | リポジトリのルート |
| Build command | `npm run build` |
| Deploy command（main） | `npx wrangler deploy` |
| Non-production deploy command | `npx wrangler preview` |
| Node.js | `.nvmrc` の24を使用 |

依存パッケージはCloudflareがインストールします。接続後はmain更新時に自動デプロイされ、`https://blog.<アカウントのサブドメイン>.workers.dev` で閲覧できます。GitHub連携の認証はCloudflare側で設定します。

`main` 以外のブランチはPreviewに公開します。`wrangler preview` に必要な `previews: {}` を `wrangler.jsonc` に設定し、アセットや互換性設定はトップレベルで共用します。

Cloudflareと同じ配信環境でローカル確認するには:

```sh
npm run preview:cloudflare
```

CLIから手動で公開する場合はCloudflareへログインしてから実行します。

```sh
npx wrangler login
npm run deploy
```

[Workers Buildsの公式設定ガイド](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)


記事一覧・カテゴリー・タグ・日付別一覧・ページ送り・新着記事は記事メタ情報から生成します。検索はこのサイト内の検索データを使います。既存コメントは表示のみで、新規コメントとお問い合わせフォームの受付は停止しています。

`npm run check:site` でビルド済みHTMLの内部リンク・見出しアンカー・画像・CSS参照を確認します。`FORBIDDEN_ORIGIN` に禁止するオリジンを指定すると、そのホスト名が生成物に残っていないかも検査できます。
