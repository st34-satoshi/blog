import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { parse } from "parse5";
const root = resolve("dist");
if (!existsSync(root)) throw new Error("Run npm run build first");
const files = [];
function walk(path) {
  for (const d of readdirSync(path, { withFileTypes: true })) {
    const p = resolve(path, d.name);
    if (d.isDirectory()) walk(p);
    else files.push(p);
  }
}
walk(root);
const documents = new Map();
const failures = new Set();
const redirects = new Map();
if (existsSync(resolve(root, "_redirects")))
  for (const line of readFileSync(resolve(root, "_redirects"), "utf8").split(
    "\n",
  )) {
    const [from, to] = line.trim().split(/\s+/);
    if (from && to) redirects.set(from, to);
  }
function visit(node, fn) {
  fn(node);
  for (const child of node.childNodes || []) visit(child, fn);
  if (node.content) visit(node.content, fn);
}
for (const file of files.filter((f) => f.endsWith(".html"))) {
  const source = readFileSync(file, "utf8");
  const tree = parse(source);
  const ids = new Set();
  const refs = [];
  visit(tree, (node) => {
    const attrs = Object.fromEntries(
      (node.attrs || []).map((a) => [a.name, a.value]),
    );
    if (attrs.id) ids.add(attrs.id);
    if (node.nodeName === "a" && attrs.name) ids.add(attrs.name);
    for (const attr of ["href", "src", "poster", "action"])
      if (attrs[attr])
        refs.push({ url: attrs[attr], fragment: node.nodeName === "a" });
    if (attrs.srcset && !attrs.srcset.startsWith("data:"))
      for (const item of attrs.srcset.split(","))
        refs.push({ url: item.trim().split(/\s+/)[0], fragment: false });
  });
  documents.set(file, { ids, refs });
}
function check(raw, file, fragment = false) {
  const path = "/" + relative(root, file).replaceAll("\\", "/");
  const base = path.endsWith("/index.html") ? path.slice(0, -10) : path;
  let url;
  try {
    url = new URL(raw, "https://local.invalid" + base);
  } catch {
    failures.add(`${path}: invalid URL ${raw}`);
    return;
  }
  if (url.origin !== "https://local.invalid") return;
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    failures.add(`${path}: invalid encoding ${raw}`);
    return;
  }
  pathname = redirects.get(pathname) || pathname;
  let target = resolve(root, "." + pathname);
  if (!target.startsWith(root + "/")) target = resolve(root, "index.html");
  if (existsSync(target) && statSync(target).isDirectory())
    target = resolve(target, "index.html");
  if (!existsSync(target)) {
    failures.add(`${path}: missing ${pathname}`);
    return;
  }
  if (fragment && url.hash && url.hash !== "#" && documents.has(target)) {
    let id;
    try {
      id = decodeURIComponent(url.hash.slice(1));
    } catch {
      return;
    }
    if (!documents.get(target).ids.has(id))
      failures.add(`${path}: missing fragment ${pathname}#${id}`);
  }
}
for (const [file, { refs }] of documents)
  for (const ref of refs) check(ref.url, file, ref.fragment);
for (const file of files.filter((f) => f.endsWith(".css")))
  for (const match of readFileSync(file, "utf8").matchAll(
    /url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g,
  ))
    check(match[1], file);
// Optional audit against a former origin, without embedding it in site source.
if (process.env.FORBIDDEN_ORIGIN) {
  const host = new URL(process.env.FORBIDDEN_ORIGIN).hostname.toLowerCase();
  for (const file of files.filter((f) =>
    /\.(html|css|js|json|xml|txt)$/.test(f),
  ))
    if (readFileSync(file, "utf8").toLowerCase().includes(host))
      failures.add(`${relative(root, file)}: forbidden origin`);
}
if (failures.size) {
  console.error([...failures].join("\n"));
  console.error(`${failures.size} reference errors`);
  process.exitCode = 1;
} else
  console.log(
    `Site audit passed: ${documents.size} HTML pages, internal links, fragments and CSS assets.`,
  );
