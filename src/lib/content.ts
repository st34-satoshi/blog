import { getCollection, type CollectionEntry } from "astro:content";
import taxonomy from "../data/taxonomies.json";
export type Entry = CollectionEntry<"posts"> | CollectionEntry<"pages">;
export const postPath = (p: Entry) =>
  p.collection === "pages" && p.data.slug === "home" ? "/" : `/${p.data.slug}/`;
export async function content() {
  const allPosts = await getCollection("posts");
  const allPages = await getCollection("pages");
  const paths = new Set<string>([
    "/search/",
    "/feed/",
    "/404/",
    "/robots.txt/",
    "/sitemap.xml/",
    "/assets/",
    "/images/",
    "/wp-content/",
  ]);
  for (const post of [...allPosts, ...allPages]) {
    if (post.collection === "posts") {
      const [year, slug] = post.id.split("/");
      if (
        year !== String(post.data.publishedAt.getUTCFullYear()) ||
        slug !== post.data.slug
      )
        throw new Error(`Directory mismatch: ${post.id}`);
    }
    for (const kind of ["categories", "tags"] as const) {
      const ids =
        kind === "categories" ? post.data.categoryIds : post.data.tagIds;
      if (ids) {
        const matched = terms(kind, post.data[kind], ids);
        if (
          matched.length !== ids.length ||
          matched.length !== post.data[kind].length ||
          matched.some((t) => !post.data[kind].includes(t.name))
        )
          throw new Error(`Taxonomy metadata mismatch: ${post.id}`);
      }
    }
    const path = postPath(post);
    if (paths.has(path)) throw new Error(`Duplicate/reserved path: ${path}`);
    paths.add(path);
  }
  return {
    posts: allPosts
      .filter((p) => !p.data.draft)
      .sort(
        (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
      ),
    pages: allPages.filter((p) => !p.data.draft),
  };
}
export function terms(
  kind: "categories" | "tags",
  names: string[],
  ids?: number[],
) {
  if (ids) return taxonomy[kind].filter((t) => ids.includes(t.id));
  return names.map(
    (name) =>
      taxonomy[kind].find((t) => t.name === name) || {
        name,
        path: `/${kind === "tags" ? "tag" : "category"}/${encodeURIComponent(name)}/`,
        id: 0,
        parent: 0,
        description: "",
      },
  );
}
export type Archive = {
  path: string;
  title: string;
  posts: CollectionEntry<"posts">[];
  page: number;
  total: number;
  base: string;
  description: string;
};
export function archives(posts: CollectionEntry<"posts">[]): Archive[] {
  const groups = new Map<
    string,
    { title: string; posts: CollectionEntry<"posts">[]; description?: string }
  >();
  groups.set("/author/satoshi-admin/", { title: "Satoshi", posts });
  groups.set("/posts/", { title: "記事一覧", posts });
  for (const kind of ["categories", "tags"] as const) {
    const existing = [
      ...taxonomy[kind],
      ...terms(kind, [...new Set(posts.flatMap((p) => p.data[kind]))]).filter(
        (t) => !t.id,
      ),
    ];
    for (const t of existing) {
      const descendants = new Set([t.id]);
      if (kind === "categories" && t.id !== 0) {
        let changed = true;
        while (changed) {
          changed = false;
          for (const child of taxonomy.categories)
            if (descendants.has(child.parent) && !descendants.has(child.id)) {
              descendants.add(child.id);
              changed = true;
            }
        }
      }
      const names = new Set([
        t.name,
        ...taxonomy[kind]
          .filter((x) => descendants.has(x.id))
          .map((x) => x.name),
      ]);
      groups.set(t.path, {
        title: t.name,
        description: t.description,
        posts: posts.filter((p) => {
          const ids =
            kind === "categories" ? p.data.categoryIds : p.data.tagIds;
          return ids
            ? ids.some((id) => descendants.has(id))
            : p.data[kind].some((n) => names.has(n));
        }),
      });
    }
  }
  for (const post of posts) {
    const day = post.data.publishedAt
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "/");
    for (const key of [day.slice(0, 4), day.slice(0, 7), day]) {
      const path = `/${key}/`;
      const group = groups.get(path) || { title: key, posts: [] };
      group.posts.push(post);
      groups.set(path, group);
    }
  }
  const result: Archive[] = [];
  for (const [base, group] of groups) {
    const total = Math.max(1, Math.ceil(group.posts.length / 10));
    for (let page = 1; page <= total; page++)
      result.push({
        base,
        path: page === 1 ? base : `${base}page/${page}/`,
        title: group.title,
        posts: group.posts.slice((page - 1) * 10, page * 10),
        page,
        total,
        description: group.description || "",
      });
  }
  // WordPress's index pagination is available even with a fixed front page.
  const total = Math.ceil(posts.length / 10);
  for (let page = 1; page <= total; page++)
    result.push({
      base: "/",
      path: `/page/${page}/`,
      title: "記事一覧",
      posts: posts.slice((page - 1) * 10, page * 10),
      page,
      total,
      description: "",
    });
  return result;
}
