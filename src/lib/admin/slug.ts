export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export function assertSafeSlug(slug: string): void {
  if (!slug) {
    throw new Error("Slug is required.");
  }

  if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
    throw new Error("Slug must not contain path separators.");
  }

  if (!/^[a-z0-9а-яё-]+$/i.test(slug)) {
    throw new Error("Slug contains unsupported characters.");
  }
}

export function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
