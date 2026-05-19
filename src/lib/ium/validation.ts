export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/[^a-z0-9а-я-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isSafeSlug(value: string) {
  return /^[a-z0-9-]+$/.test(value);
}

export function parseTopics(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function assertPdfFile(file: File, label: string) {
  if (!file || file.size === 0) {
    throw new Error(`${label}: файл не выбран.`);
  }

  const fileName = file.name.toLowerCase();

  if (file.type !== "application/pdf" && !fileName.endsWith(".pdf")) {
    throw new Error(`${label}: нужен PDF-файл.`);
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(`${label}: PDF должен быть меньше 10 MB.`);
  }
}

export function isNonEmptyFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
