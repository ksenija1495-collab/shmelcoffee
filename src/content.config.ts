import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cluster: z.enum(['C1', 'C2', 'C3', 'C5']),
    type: z.enum(['pillar', 'cluster']),
    keywords: z.array(z.string()),
    tags: z.array(z.string()).optional(),
    readAlso: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
