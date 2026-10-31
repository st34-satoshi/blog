const branch = import.meta.env.WORKERS_CI_BRANCH;
export const production =
  import.meta.env.SITE_ENV === "production" && (!branch || branch === "main");
export const siteOrigin = (import.meta.env.SITE_URL || "").replace(/\/$/, "");
if (production && !/^https:\/\/[^/]+$/.test(siteOrigin))
  throw new Error("Production requires an HTTPS SITE_URL origin");
export const absolute = (path: string) =>
  siteOrigin ? siteOrigin + path : path;
export const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const date = (value: Date) =>
  value.toISOString().slice(0, 10).replaceAll("-", ".");
