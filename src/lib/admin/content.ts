import type { ContentType, CreateContentInput, Lang } from "./types";
import { assertSafeSlug, normalizeSlug } from "./slug";
import { buildFrontmatter } from "./frontmatter";

const DEFAULT_BODY = `# New note

Write your content here.

Inline math: $a^2 + b^2 = c^2$

Display math:

$$
\\pi_1(S^1) \\cong \\mathbb{Z}
$$
`;

function required(value: string | undefined, field: string): string {
  if (!value || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function toNumber(value: FormDataEntryValue | null, fallback: number): number {
  if (value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error("Expected a number.");
  }

  return parsed;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function inputFromFormData(formData: FormData): CreateContentInput {
  const type = required(readString(formData, "type"), "type") as ContentType;
  const lang = required(readString(formData, "lang"), "lang") as Lang;

  if (!["ru", "en"].includes(lang)) {
    throw new Error("Unsupported language.");
  }

  const title = required(readString(formData, "title"), "title");
  const description = required(readString(formData, "description"), "description");

  const rawSlug = readString(formData, "slug") || title;
  const slug = normalizeSlug(rawSlug);
  assertSafeSlug(slug);

  const date = readString(formData, "date") || new Date().toISOString().slice(0, 10);
  const body = readString(formData, "body") || DEFAULT_BODY;

  return {
    type,
    lang,
    title,
    description,
    slug,
    date,
    tags: readString(formData, "tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    body,

    course: readString(formData, "course"),
    sheetNumber: toNumber(formData.get("sheetNumber"), 1),
    status: readString(formData, "status") || "in-progress",
    solved: toNumber(formData.get("solved"), 0),
    total: toNumber(formData.get("total"), 1),

    topic: readString(formData, "topic"),
    level: readString(formData, "level") || "basic",
    version: readString(formData, "version"),
  };
}

function fileName(lang: Lang, slug: string): string {
  return `${lang}-${slug}.mdx`;
}

export function getContentPath(input: CreateContentInput): string {
  switch (input.type) {
    case "math-ium":
      return `src/content/math-ium/${fileName(input.lang, input.slug)}`;

    case "math-note":
      return `src/content/math-notes/${fileName(input.lang, input.slug)}`;

    case "programming-note":
      return `src/content/programming/${fileName(input.lang, input.slug)}`;

    case "game-devlog":
      return `src/content/game-devlog/${fileName(input.lang, input.slug)}`;

    case "blog-post":
      return `src/content/blog/${fileName(input.lang, input.slug)}`;

    default:
      throw new Error("Unsupported content type.");
  }
}

export function buildMdx(input: CreateContentInput): string {
  const common = {
    title: input.title,
    description: input.description,
    lang: input.lang,
    slug: input.slug,
    date: input.date,
    tags: input.tags,
  };

  if (input.type === "math-ium") {
    const frontmatter = buildFrontmatter({
      ...common,
      course: input.course || (input.lang === "ru" ? "НМУ" : "IUM"),
      sheetNumber: input.sheetNumber ?? 1,
      status: input.status || "in-progress",
      solved: input.solved ?? 0,
      total: input.total ?? 1,
    });

    return `${frontmatter}\n\n${input.body.trim()}\n`;
  }

  if (input.type === "math-note") {
    const frontmatter = buildFrontmatter({
      ...common,
      topic: input.topic || "general",
      level: input.level || "basic",
    });

    return `${frontmatter}\n\n${input.body.trim()}\n`;
  }

  if (input.type === "programming-note") {
    const frontmatter = buildFrontmatter({
      ...common,
      topic: input.topic || "cpp",
      level: input.level || "basic",
    });

    return `${frontmatter}\n\n${input.body.trim()}\n`;
  }

  if (input.type === "game-devlog") {
    const frontmatter = buildFrontmatter({
      ...common,
      version: input.version,
    });

    return `${frontmatter}\n\n${input.body.trim()}\n`;
  }

  if (input.type === "blog-post") {
    const frontmatter = buildFrontmatter({
      ...common,
      draft: false,
    });

    return `${frontmatter}\n\n${input.body.trim()}\n`;
  }

  throw new Error("Unsupported content type.");
}
