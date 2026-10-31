import { content, postPath } from "../../lib/content";
export async function getStaticPaths() {
  const { posts } = await content();
  return [
    ...new Set(posts.map((p) => p.data.publishedAt.getUTCFullYear())),
  ].map((year) => ({
    params: { year: String(year) },
    props: {
      posts: posts.filter((p) => p.data.publishedAt.getUTCFullYear() === year),
    },
  }));
}
export async function GET({ props }: any) {
  const files = import.meta.glob("../../content/posts/**/body.html", {
    query: "?raw",
    import: "default",
  });
  const records = await Promise.all(
    props.posts.map(async (p: any) => ({
      path: postPath(p),
      title: p.data.title,
      text: String(
        p.data.format === "html"
          ? await files[`../../content/posts/${p.id}/body.html`]?.()
          : p.body || "",
      )
        .replace(/<script\b[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    })),
  );
  return new Response(JSON.stringify(records));
}
