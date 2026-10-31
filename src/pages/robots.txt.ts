import { production, absolute } from "../lib/site";
export function GET() {
  return new Response(
    production
      ? `User-agent: *\nAllow: /\nSitemap: ${absolute("/sitemap.xml")}\n`
      : "User-agent: *\nDisallow: /\n",
  );
}
