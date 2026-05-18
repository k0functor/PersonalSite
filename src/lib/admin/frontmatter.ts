type FrontmatterValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | undefined
  | null;

function escapeYamlString(value: string): string {
  return JSON.stringify(value);
}

function serializeValue(value: FrontmatterValue): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return escapeYamlString(value.toISOString().slice(0, 10));
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return `\n${value.map((item) => `  - ${escapeYamlString(String(item))}`).join("\n")}`;
  }

  if (typeof value === "string") {
    return escapeYamlString(value);
  }

  return String(value);
}

export function buildFrontmatter(fields: Record<string, FrontmatterValue>): string {
  const lines = ["---"];

  for (const [key, value] of Object.entries(fields)) {
    const serialized = serializeValue(value);

    if (serialized === null) {
      continue;
    }

    if (serialized.startsWith("\n")) {
      lines.push(`${key}:${serialized}`);
    } else {
      lines.push(`${key}: ${serialized}`);
    }
  }

  lines.push("---");

  return lines.join("\n");
}
