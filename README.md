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

## トップページの移行

- `src/content/home.html`: 2026-10-31に取得した既存トップページのHTML。CocoonのDOM・クラス・インラインCSSを保持しています。
- `src/pages/index.astro`: 保存したHTMLを静的出力するAstroページ。
- `public/wp-content/`・`public/wp-includes/`: 元のパスを保持した画像・CSS・フォント・JavaScript。
- `docs/home-assets.json`: ダウンロード元・保存先・ファイルサイズの一覧。

現時点ではトップページのみ移行しています。記事・About・Sitemap・Contact・検索は既存WordPressを参照します。人気記事と新着記事は取得時点の固定内容です。

ローカル検証用に `noindex, nofollow` を追加し、広告配信スクリプトと不要なWordPressプラグインのスクリプトを除外しています。広告枠のHTML・既存canonicalは保持しています。GA・広告の本番設定は公開準備時に対応します。

取得したファイルは合計約2.3 MB、最大約445 KBです。恒久的なサイズ上限とCIチェックは別タスクで追加します。配布元のCSS内のライセンス表記は保持しています。
