import { defineConfig } from 'astro/config';
import markdownWithToc from './src/lib/markdown-toc.mjs';

export default defineConfig({
  output: 'static',
  markdown: { processor: markdownWithToc() },
  trailingSlash: 'always',
});
