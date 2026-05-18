import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const lang = z.enum(["ru", "en"]);

const mathIum = defineCollection({
  loader: glob({
    base: "./src/content/math-ium",
    pattern: "**/*.{md,mdx}",
  }),

  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang,
    slug: z.string().optional(),
    course: z.string(),
    sheetNumber: z.number(),
    status: z.enum([
      "not-started",
      "in-progress",
      "partly-solved",
      "solved",
      "submitted",
      "needs-rewrite",
    ]),
    solved: z.number(),
    total: z.number(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
});

const mathNotes = defineCollection({
  loader: glob({
    base: "./src/content/math-notes",
    pattern: "**/*.{md,mdx}",
  }),

  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang,
    slug: z.string().optional(),
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
    lang,
    slug: z.string().optional(),
    topic: z.enum(["cpp", "stl", "algorithms", "cs", "tools", "projects"]),
    level: z.enum(["basic", "intermediate", "advanced"]).default("basic"),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
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
    lang,
    slug: z.string().optional(),
    date: z.coerce.date(),
    version: z.string().optional(),
    tags: z.array(z.string()).default([]),
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
    lang,
    slug: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  "math-ium": mathIum,
  "math-notes": mathNotes,
  programming,
  "game-devlog": gameDevlog,
  blog,
};
