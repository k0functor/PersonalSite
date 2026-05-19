import type { IumSection, IumSheet, IumSheetStatus } from "../ium/types";
import { assertSafeSlug, normalizeSlug, parseTags } from "./slug";
import {
  readJsonFileFromGitHub,
  uploadBinaryFileToGitHub,
  writeJsonFileToGitHub,
} from "./github";

const SECTIONS_PATH = "src/data/ium/sections.json";
const SHEETS_PATH = "src/data/ium/sheets.json";

const statuses: IumSheetStatus[] = [
  "not-started",
  "in-progress",
  "partly-solved",
  "solved",
  "submitted",
  "needs-rewrite",
];

export function parseRequiredString(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

export function parseOptionalString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseStatus(value: string): IumSheetStatus {
  if (!statuses.includes(value as IumSheetStatus)) {
    throw new Error("Unsupported sheet status.");
  }

  return value as IumSheetStatus;
}

export function parsePdfFile(formData: FormData, name: string, required: boolean): File | null {
  const value = formData.get(name);

  if (!(value instanceof File) || value.size === 0) {
    if (required) {
      throw new Error(`${name} PDF is required.`);
    }

    return null;
  }

  if (!value.name.toLowerCase().endsWith(".pdf")) {
    throw new Error(`${name} must be a PDF file.`);
  }

  if (value.size > 10 * 1024 * 1024) {
    throw new Error(`${name} is too large. Keep PDF files under 10 MB.`);
  }

  return value;
}

export function buildPdfPaths(sectionId: string, sheetId: string) {
  return {
    sheetRepoPath: `public/files/ium/${sectionId}/${sheetId}.pdf`,
    solutionRepoPath: `public/files/ium/${sectionId}/${sheetId}-solution.pdf`,
    sheetPublicPath: `/files/ium/${sectionId}/${sheetId}.pdf`,
    solutionPublicPath: `/files/ium/${sectionId}/${sheetId}-solution.pdf`,
  };
}

export async function readIumSectionsFromRepo() {
  return readJsonFileFromGitHub<IumSection[]>(SECTIONS_PATH, []);
}

export async function readIumSheetsFromRepo() {
  return readJsonFileFromGitHub<IumSheet[]>(SHEETS_PATH, []);
}

export async function addIumSection(formData: FormData) {
  const title = parseRequiredString(formData, "title");
  const rawId = parseOptionalString(formData, "id") || title;
  const id = normalizeSlug(rawId);
  assertSafeSlug(id);

  const description = parseRequiredString(formData, "description");
  const orderValue = parseOptionalString(formData, "order");
  const order = orderValue ? Number(orderValue) : 100;

  if (!Number.isFinite(order)) {
    throw new Error("Order must be a number.");
  }

  const { data: sections, sha } = await readIumSectionsFromRepo();

  if (sections.some((section) => section.id === id)) {
    throw new Error(`Section ${id} already exists.`);
  }

  const nextSections = [
    ...sections,
    {
      id,
      title,
      description,
      order,
      lang: "ru" as const,
    },
  ].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "ru"));

  await writeJsonFileToGitHub(SECTIONS_PATH, nextSections, `Add IUM section: ${title}`, sha);

  return { id };
}

export async function addIumSheet(formData: FormData) {
  const sectionId = parseRequiredString(formData, "sectionId");
  assertSafeSlug(sectionId);

  const title = parseRequiredString(formData, "title");
  const rawId = parseOptionalString(formData, "id") || title;
  const id = normalizeSlug(rawId);
  assertSafeSlug(id);

  const description = parseRequiredString(formData, "description");
  const topics = parseTags(parseOptionalString(formData, "topics"));
  const status = parseStatus(parseRequiredString(formData, "status"));
  const date = parseRequiredString(formData, "date");
  const today = new Date().toISOString().slice(0, 10);

  const sheetPdf = parsePdfFile(formData, "sheetPdf", true);
  const solutionPdf = parsePdfFile(formData, "solutionPdf", false);

  const { data: sections } = await readIumSectionsFromRepo();

  if (!sections.some((section) => section.id === sectionId)) {
    throw new Error(`Section ${sectionId} does not exist.`);
  }

  const { data: sheets, sha } = await readIumSheetsFromRepo();

  if (sheets.some((sheet) => sheet.sectionId === sectionId && sheet.id === id)) {
    throw new Error(`Sheet ${sectionId}/${id} already exists.`);
  }

  const paths = buildPdfPaths(sectionId, id);

  if (sheetPdf) {
    await uploadBinaryFileToGitHub(paths.sheetRepoPath, sheetPdf, `Upload IUM sheet PDF: ${sectionId}/${id}`);
  }

  if (solutionPdf) {
    await uploadBinaryFileToGitHub(paths.solutionRepoPath, solutionPdf, `Upload IUM solution PDF: ${sectionId}/${id}`);
  }

  const nextSheets: IumSheet[] = [
    ...sheets,
    {
      id,
      sectionId,
      title,
      description,
      topics,
      status,
      sheetPdf: paths.sheetPublicPath,
      solutionPdf: solutionPdf ? paths.solutionPublicPath : "",
      date,
      updatedAt: today,
    },
  ];

  await writeJsonFileToGitHub(SHEETS_PATH, nextSheets, `Add IUM sheet: ${sectionId}/${id}`, sha);

  return { sectionId, id };
}

export async function updateIumSheet(formData: FormData) {
  const sectionId = parseRequiredString(formData, "sectionId");
  const id = parseRequiredString(formData, "id");
  assertSafeSlug(sectionId);
  assertSafeSlug(id);

  const title = parseRequiredString(formData, "title");
  const description = parseRequiredString(formData, "description");
  const topics = parseTags(parseOptionalString(formData, "topics"));
  const status = parseStatus(parseRequiredString(formData, "status"));
  const date = parseRequiredString(formData, "date");
  const today = new Date().toISOString().slice(0, 10);

  const sheetPdf = parsePdfFile(formData, "sheetPdf", false);
  const solutionPdf = parsePdfFile(formData, "solutionPdf", false);

  const { data: sheets, sha } = await readIumSheetsFromRepo();
  const index = sheets.findIndex((sheet) => sheet.sectionId === sectionId && sheet.id === id);

  if (index === -1) {
    throw new Error(`Sheet ${sectionId}/${id} does not exist.`);
  }

  const paths = buildPdfPaths(sectionId, id);
  const current = sheets[index];

  if (sheetPdf) {
    await uploadBinaryFileToGitHub(paths.sheetRepoPath, sheetPdf, `Update IUM sheet PDF: ${sectionId}/${id}`);
  }

  if (solutionPdf) {
    await uploadBinaryFileToGitHub(paths.solutionRepoPath, solutionPdf, `Update IUM solution PDF: ${sectionId}/${id}`);
  }

  const nextSheets = [...sheets];
  nextSheets[index] = {
    ...current,
    title,
    description,
    topics,
    status,
    date,
    updatedAt: today,
    sheetPdf: sheetPdf ? paths.sheetPublicPath : current.sheetPdf,
    solutionPdf: solutionPdf ? paths.solutionPublicPath : current.solutionPdf,
  };

  await writeJsonFileToGitHub(SHEETS_PATH, nextSheets, `Update IUM sheet: ${sectionId}/${id}`, sha);

  return { sectionId, id };
}
