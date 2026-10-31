import { content, postPath } from "../../lib/content";
import { absolute, escape } from "../../lib/site";
export async function GET() {
  const { posts } = await content();
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Notes to Forget</title><link>${escape(absolute("/"))}</link><description>忘れたときに，すぐ思い出すためのメモ</description>${posts
      .slice(0, 20)
      .map(
        (p) =>
          `<item><title>${escape(p.data.title)}</title><link>${escape(absolute(postPath(p)))}</link><guid>${escape(absolute(postPath(p)))}</guid><pubDate>${p.data.publishedAt.toUTCString()}</pubDate><description>${escape(p.data.description)}</description></item>`,
      )
      .join("")}</channel></rss>`,
    { headers: { "Content-Type": "application/rss+xml" } },
  );
}
