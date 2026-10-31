# blog
blog.stu345.comに公開するブログ

Astroの最小構成の静的サイトです。

## 開発

Node.js 24とnpmを使用します。nvmを利用する場合:

```sh
nvm install
nvm use
npm ci
npm run dev
```

http://localhost:4321/ を開くと「Hello world」が表示されます。
ページは `src/pages/index.astro` で編集できます。

## ビルド・プレビュー

```sh
npm run build
npm run preview
```

静的ファイルは `dist/` に出力されます。
