import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
const schema = z.object({
  seoTitle: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().regex(/^[^\s/?#]+$/u),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  description: z.string().default(""),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  categoryIds: z.array(z.number()).optional(),
  tagIds: z.array(z.number()).optional(),
  draft: z.boolean().default(false),
  format: z.enum(["markdown", "html"]).default("markdown"),
  legacyId: z.number().optional(),
  bodyClass: z.string().optional(),
  thumbnail: z.string().optional(),
  image: z.string().default("/wp-content/uploads/2020/10/nothing-road.jpg"),
  imageAlt: z.string().default(""),
  mathjax: z.boolean().default(false),
  hasComments: z.boolean().default(false),
});
export const collections = {
  posts: defineCollection({
    loader: glob({
      base: "./src/content/posts",
      pattern: "????/*/index.md",
      generateId: ({ entry }) => entry.replace(/\/index\.md$/, ""),
    }),
    schema,
  }),
  pages: defineCollection({
    loader: glob({
      base: "./src/content/pages",
      pattern: "*/index.md",
      generateId: ({ entry }) => entry.replace(/\/index\.md$/, ""),
    }),
    schema,
  }),
};
