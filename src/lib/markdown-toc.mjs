import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { parseFragment } from 'parse5';

const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const text = (node) => node.nodeName === '#text' ? node.value : node.tagName === 'img' ? attr(node, 'alt') || '' : (node.childNodes || []).map(text).join('');

export function addTableOfContents(html) {
  const tree = parseFragment(html, { sourceCodeLocationInfo: true });
  const ids = new Set();
  let hasToc = false;
  function scan(node) {
    if (attr(node, 'id')) ids.add(attr(node, 'id'));
    if (attr(node, 'id') === 'toc' || (attr(node, 'class') || '').split(/\s+/).includes('toc')) hasToc = true;
    for (const child of node.childNodes || []) scan(child);
  }
  scan(tree);
  if (hasToc) return html;
  // Only article-level headings: quoted examples and nested widgets are not sections.
  const headings = tree.childNodes.filter((node) => /^h[2-6]$/.test(node.tagName) && attr(node, 'id'));
  if (!headings.length) return html;
  const roots = [];
  const stack = [];
  for (const heading of headings) {
    const item = { depth: Number(heading.tagName[1]), id: attr(heading, 'id'), title: text(heading), children: [] };
    while (stack.length && stack.at(-1).depth >= item.depth) stack.pop();
    (stack.at(-1)?.children || roots).push(item);
    stack.push(item);
  }
  const list = (items, root = false) => `<ol${root ? ' class="toc-list open"' : ''}>${items.map((item) => `<li><a href="#${escape(encodeURIComponent(item.id))}">${escape(item.title)}</a>${item.children.length ? list(item.children) : ''}</li>`).join('')}</ol>`;
  let checkboxId = 'markdown-toc-toggle';
  for (let suffix = 1; ids.has(checkboxId); suffix++) checkboxId = `markdown-toc-toggle-${suffix}`;
  const toc = `<nav id="toc" class="toc tnt-number toc-center border-element markdown-toc" aria-label="目次"><input checked class="toc-checkbox" id="${checkboxId}" type="checkbox" aria-label="目次の表示切り替え"><label class="toc-title" for="${checkboxId}">目次</label><div class="toc-content">${list(roots, true)}</div></nav>\n`;
  const offset = headings[0].sourceCodeLocation.startOffset;
  return html.slice(0, offset) + toc + html.slice(offset);
}

export default function markdownWithToc() {
  return {
    name: 'satteri-with-toc',
    async createRenderer(options) {
      const renderer = await createSatteriMarkdownProcessor(options);
      return {
        async render(content, renderOptions) {
          const result = await renderer.render(content, renderOptions);
          const path = renderOptions?.fileURL?.pathname || '';
          if (/\/src\/content\/posts\/.+\/index\.md$/.test(path) && renderOptions?.frontmatter?.format !== 'html') {
            result.code = addTableOfContents(result.code);
          }
          return result;
        },
      };
    },
  };
}
