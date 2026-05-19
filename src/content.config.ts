import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const mathNotes = defineCollection({
  loader: glob({
    base: "./src/content/math-notes",
    pattern: "**/*.{md,mdx}",
  }),

  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang: z.enum(["ru", "en"]),
    topic: z.string(),
    level: z.enum(["basic", "intermediate", "advanced"]).default("basic"),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
});

const programming = defineCollection({
  loader: glob({
    base: "./src/content/programming",
    pattern: "**/*.{md,mdx}",
  }),

  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang: z.enum(["ru", "en"]),
    category: z.enum(["cpp", "stl", "algorithms", "cs", "tools", "project"]),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const gameDevlog = defineCollection({
  loader: glob({
    base: "./src/content/game-devlog",
    pattern: "**/*.{md,mdx}",
  }),

  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang: z.enum(["ru", "en"]),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({
    base: "./src/content/blog",
    pattern: "**/*.{md,mdx}",
  }),

  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang: z.enum(["ru", "en"]),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  "math-notes": mathNotes,
  programming,
  "game-devlog": gameDevlog,
  blog,
};
