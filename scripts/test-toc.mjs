import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment, serialize } from 'parse5';
import markdownWithToc, { addTableOfContents } from '../src/lib/markdown-toc.mjs';
const renderer = await markdownWithToc().createRenderer({ syntaxHighlight: false });
const render = async (source, path = 'posts/2026/example', frontmatter = {}) => (await renderer.render(source, { fileURL: new URL(`file:///repo/src/content/${path}/index.md`), frontmatter })).code;
const attr = (n, name) => n.attrs?.find((a) => a.name === name)?.value;
function nodes(html) {
  const result = [];
  const visit = (n) => { result.push(n); for (const c of n.childNodes || []) visit(c); };
  visit(parseFragment(html));
  return result;
}
test('intro remains before TOC; repeated headings and old anchors link correctly', async () => {
  const html = await render('導入文\n\n<span id="toc1"></span>\n\n## 10月\n\n### お金\n\n## 9月\n\n### お金');
  const all = nodes(html);
  assert.ok(html.indexOf('導入文') < html.indexOf('<nav'));
  assert.ok(html.indexOf('<nav') < html.indexOf('<h2'));
  const ids = all.map((n) => attr(n, 'id')).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('toc1'));
  const links = all.filter((n) => n.tagName === 'a');
  assert.equal(links.length, 4);
  for (const link of links) assert.ok(ids.includes(decodeURIComponent(attr(link, 'href').slice(1))));
  const list = all.find((n) => attr(n, 'class') === 'toc-list open');
  assert.equal(list.childNodes.length, 2);
  assert.equal(list.childNodes[0].childNodes[1].tagName, 'ol');
  assert.equal(addTableOfContents(html), html);
});
test('no headings, HTML articles, fixed pages, and existing TOCs are unchanged', async () => {
  assert.ok(!(await render('本文のみ')).includes('<nav'));
  assert.ok(!(await render('## 見出し', 'pages/example')).includes('<nav'));
  assert.ok(!(await render('## 見出し', undefined, { format: 'html' })).includes('<nav'));
  const existing = '<div class="toc">既存目次</div><h2 id="a">A</h2>';
  assert.equal(addTableOfContents(existing), existing);
});
test('skipped levels, formatted headings and escaping work without nested links', async () => {
  const html = await render('## [A & B](https://example.com)\n\n#### **深い見出し**\n\n### 戻る\n\n> ## 引用内の見出し');
  const all = nodes(html);
  const nav = all.find((n) => n.tagName === 'nav');
  const tocNodes = nodes(serialize(nav));
  assert.equal(tocNodes.filter((n) => n.tagName === 'a').length, 3);
  assert.ok(html.includes('A &amp; B</a>'));
  assert.ok(!tocNodes.some((n) => n.tagName === 'strong'));
});
test('checkbox IDs avoid collisions', () => {
  const html = addTableOfContents('<span id="markdown-toc-toggle"></span><h2 id="a">A</h2>');
  const all = nodes(html);
  const input = all.find((n) => n.tagName === 'input');
  assert.equal(attr(input, 'id'), 'markdown-toc-toggle-1');
  assert.equal(attr(all.find((n) => n.tagName === 'label'), 'for'), attr(input, 'id'));
});
