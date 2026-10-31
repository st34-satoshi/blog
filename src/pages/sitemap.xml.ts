import { content, postPath, archives } from "../lib/content";
import { absolute, escape } from "../lib/site";
export async function GET() {
  const { posts, pages } = await content();
  const paths = [...posts, ...pages].map((p) => ({
    path: postPath(p),
    lastmod: (p.data.updatedAt || p.data.publishedAt).toISOString(),
  }));
  for (const a of archives(posts)) paths.push({ path: a.path, lastmod: "" });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${escape(absolute(p.path))}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ""}</url>`).join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
