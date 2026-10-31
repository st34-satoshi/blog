// Preserve old search URLs while serving search entirely from this site.
const query = new URLSearchParams(location.search);
if (query.has("s") && location.pathname !== "/search/")
  location.replace(`/search/?${query}`);
for (const link of document.querySelectorAll<HTMLAnchorElement>(
  "[data-share]",
)) {
  const url = location.origin + location.pathname;
  const title = document.querySelector("h1")?.textContent || document.title;
  const destinations: Record<string, string> = {
    x: `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    hatena: `https://b.hatena.ne.jp/entry/panel/?url=${encodeURIComponent(url)}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
  };
  link.href = destinations[link.dataset.share!] || url;
}
const copy = document.querySelector<HTMLElement>("[data-copy-url]");
copy?.addEventListener("click", async () => {
  await navigator.clipboard.writeText(
    `${document.querySelector("h1")?.textContent || document.title} ${location.origin}${location.pathname}`,
  );
  copy.textContent = "コピーしました";
});
