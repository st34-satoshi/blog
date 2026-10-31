export function navigation(markup: string, path: string) {
  return markup.replace(/<li\b[^>]*>[\s\S]*?<\/li>/g, (item) => {
    if (!item.includes(`href="${path}"`)) return item;
    return item
      .replace('class="', 'class="current-menu-item current_page_item ')
      .replace(`<a href="${path}"`, `<a aria-current="page" href="${path}"`);
  });
}
