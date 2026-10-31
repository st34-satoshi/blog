---
title: "6年使ったWordPressのブログをAstroとCloudflareに移行した"
slug: wordpress-to-astro
publishedAt: 2026-10-31T17:00:00+09:00
description: "GCPで運用していたWordPressのブログを、Astro・GitHub・Cloudflare Workersへ移行した。移行のきっかけと、既存のURLやデザインを残しながら静的サイトにするまでの手順をまとめる。"
categories: [blog]
tags: [blog, WordPress, Astro, Cloudflare, GitHub]
draft: false
---

気づいたら、ブログを作成してから6年も経過していた。

[ブログを始めたときの記事](/hello-blog/)を読み返すと、当時はGoogle Domainsでドメインを取得し、GCPにWordPressをインストールしていた。ほぼ無料で始められて、その後も月に100円くらいで運用できていたので、個人のブログには十分だった。

今回は、このブログをAstroとCloudflareに移行した。見た目と記事のURLはほぼそのままで、中身の管理方法を変えている。移行のきっかけと、実際に行ったことをまとめておく。

コードと記事は[GitHubのリポジトリ](https://github.com/st34-satoshi/blog)で公開している。

## WordPressから移行した理由

最近は、書きたいことをAIに渡して文章を清書してもらい、そのまま投稿作業まで進めてもらうことが多くなった。そうなると、ブラウザーの管理画面から記事を書くことを前提にしたWordPressが、今の自分にとって最適なのか少し疑問になっていた。

そんな中、PHPの脆弱性が見つかったこともあり、今後は自分でメンテナンスしやすい環境にしてみることにした。静的サイトにすれば、公開用のサーバーでWordPressやPHP、データベースを動かす必要がなくなる。もちろん依存ライブラリなどの更新は必要だが、面倒を見る範囲は減らせる。

本質的には、AIのおかげでHTMLを作成・編集するコストが、自分の感覚ではほぼゼロになってきたことが大きい。何千ページあっても、AIと一緒に編集できるなら、ブログを静的なHTMLで管理するだけでも十分なのではないかと思った。

ただ、今回はHTMLを一枚ずつ直接書く構成にはしていない。Astroが便利そうだったので、新しい記事はMarkdownで書き、本番に公開するときにHTMLへビルドする形にした。記事の本文と共通のレイアウトを分けられるので、見た目を変えるときも扱いやすい。

## 今の構成

役割は次のように分けた。

| 役割 | 使用するもの |
| --- | --- |
| 記事の作成 | Markdown |
| HTMLの生成 | Astro |
| 記事・コード・画像の管理 | GitHub |
| ビルドと自動デプロイ | Cloudflare Workers Builds |
| 静的ファイルの配信 | Cloudflare Workers Static Assets |
| DNS・独自ドメインの接続 | Cloudflare |

GitHubのmainブランチが更新されると、Cloudflareがビルドして本番へ反映する。記事を書く作業も、ブランチを作って編集し、PRで確認してからマージする流れになった。

## 移行の手順

最初からすべてを移そうとすると確認する範囲が広いので、数ページで試してから全体を移した。

### 1. ローカルでトップページと記事を再現する

まずはGitHubにリポジトリを作り、Astroの基本的な環境を用意した。その後、元のブログのトップページと記事を1つ再現した。

今回優先したのは、今までと同じURLで、ほぼ同じデザインのページを表示すること。本文だけでなく、画像やCSS、フォントなども保存して、旧サーバーに依存せず表示できるようにした。

既存の記事はHTMLの本文を残している。無理にすべてをMarkdownへ変換するより、まず表示を維持する方を優先した。新しく追加する記事は、この記事も含めてMarkdownで書いている。

このリポジトリをローカルで動かす場合は、Node.js 24を用意して次を実行する。

```sh
git clone https://github.com/st34-satoshi/blog.git
cd blog
npm ci
npm run dev
```

表示されたローカルURLを開くと確認できる。ビルドは `npm run build` で行い、生成されたファイルは `dist/` に出力される。

### 2. Cloudflareの仮URLで公開する

CloudflareのWorkers & PagesからGitHubのリポジトリを接続した。主なビルド設定は次のとおり。

| 設定 | 値 |
| --- | --- |
| 本番ブランチ | `main` |
| ビルドコマンド | `npm run build` |
| 本番デプロイコマンド | `npx wrangler deploy` |
| 本番以外のデプロイコマンド | `npx wrangler preview` |

配信対象は `dist/`。まずはworkers.devの仮URLで公開し、mainを更新すると自動で反映されることを確認した。

移行中のページが検索に登録されたり、本番のアクセス数に混ざったりしないように、仮環境ではnoindexにして、GAと広告を停止する設定も入れた。

### 3. ファイル管理のルールを決める

記事は `src/content/posts/YYYY/slug/index.md` に置く。タイトル、初回公開日、更新日、カテゴリーなどはファイル先頭のメタ情報で管理する。公開URLは年を含めず、`/slug/` にしている。

新しい画像は `public/images/YYYY/slug/` に置き、Gitに含める。既存画像はリンクを壊さないように元のパスを維持した。

画像に限らず、Gitに追加・変更するファイルは1ファイル1 MiBまでにした。大きい画像は圧縮・縮小してから追加する。サイズの検査は差分ファイルを対象にして、GitHub Actionsでも実行するようにした。

記事の置き方や更新時のルールは `AGENTS.md` に書いた。AIに記事を追加してもらうときにも、毎回同じ説明をせずに済む。

### 4. 全ページを移行する

数ページで表示とデプロイを確認してから、全記事と固定ページを移した。移行時点で記事は276件、固定ページは4件。カテゴリーやタグ、日付別の一覧、ページ送りなどを含めると、生成されるHTMLは1,150ページになった。

トップページやサイドバーの新着記事は、記事データから生成するようにした。これで記事を追加するたびに、一覧のHTMLを手で直す必要がなくなる。

静的サイト内で使える検索も用意した。既存のコメントは残し、新しいコメントの受付は停止した。お問い合わせは、もともとのGoogleフォームを引き続き使っている。

移行後はビルドだけでなく、内部リンクや画像、見出しへのリンクが切れていないかも検査した。

```sh
npm run check:files
npm run build
npm run check:site
```

ローカルでは表示できても、Gitに入っていないファイルはCloudflareに届かない。実際に、`.gitignore` の `dist/` がライブラリの配布ファイルまで除外してしまい、CIで参照切れが見つかった。ビルド出力だけを除外する `/dist/` に変更して修正した。ローカルと公開先の両方で確認するのは大事だった。

### 5. 本番の設定を入れてドメインを切り替える

切り替え前に、旧WordPressのバックアップと、元のDNSレコードを保存しておく。問題があったときに元へ戻せる状態にしてから進める。

今回のコードでは、Cloudflareのビルド用環境変数に次を設定する。

| 変数 | 内容 |
| --- | --- |
| `SITE_ENV` | 本番では `production` |
| `SITE_URL` | 本番サイトのHTTPS URL。末尾のスラッシュは不要 |
| `GA_MEASUREMENT_ID` | 既存のGA4測定ID |
| `GOOGLE_SITE_VERIFICATION` | Search ConsoleでHTMLタグ認証を使う場合の確認コード |

これらはこのリポジトリで使う設定名。Astroがビルド時に読み取るので、Cloudflareの **Settings → Build → Build Variables and Secrets** に設定し、mainを再ビルドする。通常の実行時変数に追加するだけでは反映されない。

ドメインは、Workerの **Settings → Domains & Routes → Add → Custom Domain** から追加した。Cloudflareが必要なDNSレコードと証明書を管理してくれる。既存レコードとの競合がある場合は、保存しておいた値を確認しながら対象のレコードを置き換える。

本番ドメインへの切り替え後は、仮URLの公開も整理する。今回の構成では `wrangler.jsonc` の `workers_dev` を `false` にして、本番Workerのworkers.dev URLを無効にする。PR用のプレビュー設定は残しておく。

### 6. 公開後に確認する

ページが表示されることに加えて、次の項目も確認する。

- トップページ・記事・画像がHTTPSで表示されること。
- 通常ページからnoindexが外れていること。
- `robots.txt` がクロールを許可し、`sitemap.xml` に本番URLが出力されていること。
- `ads.txt` に既存の広告パブリッシャーIDがあること。
- GAでアクセスが計測され、AdSenseでも広告表示や警告の有無を確認できること。
- Search Consoleで所有権、サイトマップ、公開URLの取得可否を確認すること。
- mainへの更新が本番へ自動反映されること。

画面に広告が表示されていても、管理画面での確認は別に必要。検索への反映やレポートの更新には時間がかかるので、移行直後だけでなく、少し時間を置いて確認する。

## 終わりに

6年前はGoogle DomainsとGCPで作ったブログが、今はCloudflareで配信し、GitHubでコンテンツを管理する形になった。

当時はWordPressが使いやすかったし、今はAIと一緒にファイルを編集して、PRで確認する方が自分には合っている。道具の変化だけでなく、自分の作業の仕方も変わったのだと思う。

また5年後には、今は知らないサービスを使っているかもしれない。そのときに使いやすいものを取り入れながら、より良い環境で、より良いサービスを開発していきたい。

## 参考

- [ブログの始め方（2020年に書いた記事）](/hello-blog/)
- [このブログのGitHubリポジトリ](https://github.com/st34-satoshi/blog)
- [Cloudflare Workers Buildsの設定](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare WorkersのCustom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
