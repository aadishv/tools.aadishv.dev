import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  loader: glob({ pattern: "*.*", base: ".src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    categories: z.array(z.string()),
    description: z.string().optional(),
    hidden: z.boolean().optional(),
    image: z.string().optional(),
  }),
});
