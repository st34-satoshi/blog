import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({
    base: './src/content/posts',
    pattern: '????/*/index.md',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),
  schema: z.object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    description: z.string().default(''),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    format: z.enum(['markdown', 'html']).default('markdown'),
    legacyLayout: z.string().regex(/^[a-z0-9-]+$/).optional(),
  }),
});

export const collections = { posts };
