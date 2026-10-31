# blog
blog.stu345.comに公開するブログ

Astroで既存WordPressブログを移行する静的サイトです。

## 開発

Node.js 24とnpmを使用します。nvmを利用する場合:

```sh
nvm install
nvm use
npm ci
npm run dev
```

http://localhost:4321/ を開くと既存ブログのトップページが表示されます。
ページは `src/pages/index.astro` で編集できます。

## ビルド・プレビュー

```sh
npm run build
npm run preview
```

静的ファイルは `dist/` に出力されます。

## 移行済みページ

- `/`: トップページ
- `/powerpoint-font-noto-sans-jp/`: Powerpoint でNoto Sans JP フォントを使用する

## ファイル構成

- `src/layouts/SiteLayout.astro`: 共通のHTML骨格とヘッダー・フッターの配置。
- `src/components/`: 共通ヘッダーとフッター。元のDOMとクラス名を維持。
- `src/content/home/`: トップページの表示データ。
- `src/content/powerpoint-font-noto-sans-jp/body.html`: 記事本文。既存のHTML表現を保持して編集できます。
- 同ディレクトリの `content.html`: 記事の枠・サイドバー・関連記事。`ARTICLE_BODY`の位置に本文を挿入します。
- 各ページの `head.html`・`page.json`・`tail.html`: ページ固有のメタ情報・body属性・モバイルメニューとスクリプト。
- `public/assets/`: 共通CSS・JavaScript・フォント。WordPressの実行環境は不要です。
- `public/wp-content/uploads/`: 過去の画像。既存の画像URLを維持するため、この配置を保持します。
- `docs/*-assets.json`: 取得ファイルの出所・保存先・サイズ。

ページは2026-10-31に取得したHTMLを基にしています。移行済みページ同士はローカルで遷移し、それ以外の記事・カテゴリー・検索などは既存ブログへリンクします。人気記事・関連記事・新着記事は取得時点の固定内容です。

ローカル検証用に `noindex, nofollow` を追加し、広告配信とWordPressアクセス集計・不要なプラグインスクリプトを除外しています。広告枠・canonical・構造化データは保持し、GA・広告の有効化は公開準備時に対応します。

コメント投稿は静的サイト内では処理せず、既存記事のコメント欄へリンクします。本番移行時には別途扱いを決めます。

恒久的なファイルサイズ上限とCIは別タスクで追加します。配布元のCSS・JavaScript内のライセンス表記は保持しています。
