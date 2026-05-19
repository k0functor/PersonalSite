import { isAdminRequest } from "../../../../lib/admin/auth";
import {
  fileToBase64,
  getRepoFile,
  isRealUploadedFile,
  readRepoTextFile,
  putRepoFile,
  writeRepoTextFile,
} from "../../../../lib/admin/githubFiles";

type SheetStatus =
  | "not-started"
  | "in-progress"
  | "partly-solved"
  | "solved"
  | "submitted"
  | "needs-rewrite";

interface IumSheet {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  topics: string[];
  status: SheetStatus;
  sheetPdf: string;
  solutionPdf?: string;
  date: string;
  updatedAt: string;
}

export const prerender = false;

function getRequiredString(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Поле ${name} обязательно.`);
  }

  return value.trim();
}

function getOptionalString(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseTopics(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidSlug(value: string) {
  return /^[a-z0-9-]+$/.test(value);
}

function isValidStatus(value: string): value is SheetStatus {
  return [
    "not-started",
    "in-progress",
    "partly-solved",
    "solved",
    "submitted",
    "needs-rewrite",
  ].includes(value);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function uploadPdfIfNeeded(params: {
  file: FormDataEntryValue | null;
  repoPath: string;
  message: string;
}) {
  if (!isRealUploadedFile(params.file)) {
    return;
  }

  if (params.file.type !== "application/pdf") {
    throw new Error("Можно загружать только PDF-файлы.");
  }

  const existing = await getRepoFile(params.repoPath);
  const contentBase64 = await fileToBase64(params.file);

  await putRepoFile({
    path: params.repoPath,
    contentBase64,
    message: params.message,
    sha: existing?.sha,
  });
}

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const isAdmin = await isAdminRequest(cookies);

    if (!isAdmin) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();

    const originalSectionId = getRequiredString(formData, "originalSectionId");
    const originalSheetId = getRequiredString(formData, "originalSheetId");

    const sectionId = getRequiredString(formData, "sectionId");
    const sheetId = getRequiredString(formData, "sheetId");
    const title = getRequiredString(formData, "title");
    const description = getRequiredString(formData, "description");
    const topics = parseTopics(getOptionalString(formData, "topics"));
    const status = getRequiredString(formData, "status");
    const date = getRequiredString(formData, "date");

    if (!isValidSlug(sectionId) || !isValidSlug(sheetId)) {
      throw new Error("Slug может содержать только латиницу, цифры и дефисы.");
    }

    if (!isValidStatus(status)) {
      throw new Error("Некорректный статус листочка.");
    }

    const sheetsFilePath = "src/data/ium/sheets.json";
    const repoFile = await readRepoTextFile(sheetsFilePath);

    if (!repoFile) {
      throw new Error("Не найден src/data/ium/sheets.json в репозитории.");
    }

    const sheets = JSON.parse(repoFile.text) as IumSheet[];

    const sheetIndex = sheets.findIndex(
      (item) => item.sectionId === originalSectionId && item.id === originalSheetId
    );

    if (sheetIndex === -1) {
      throw new Error("Редактируемый листочек не найден в sheets.json.");
    }

    const duplicate = sheets.find(
      (item, index) =>
        index !== sheetIndex && item.sectionId === sectionId && item.id === sheetId
    );

    if (duplicate) {
      throw new Error("Листочек с таким slug уже есть в выбранном разделе.");
    }

    const currentSheet = sheets[sheetIndex];
    const currentSheetPdf = getOptionalString(formData, "currentSheetPdf") || currentSheet.sheetPdf;
    const currentSolutionPdf =
      getOptionalString(formData, "currentSolutionPdf") || currentSheet.solutionPdf || "";

    const sheetPdfFile = formData.get("sheetPdf");
    const solutionPdfFile = formData.get("solutionPdf");
    const removeSolutionPdf = formData.get("removeSolutionPdf") === "yes";

    let sheetPdfPath = currentSheetPdf;
    let solutionPdfPath = removeSolutionPdf ? "" : currentSolutionPdf;

    if (isRealUploadedFile(sheetPdfFile)) {
      sheetPdfPath = `/files/ium/${sectionId}/${sheetId}.pdf`;
      await uploadPdfIfNeeded({
        file: sheetPdfFile,
        repoPath: `public${sheetPdfPath}`,
        message: `Update IUM sheet PDF: ${sectionId}/${sheetId}`,
      });
    }

    if (isRealUploadedFile(solutionPdfFile)) {
      solutionPdfPath = `/files/ium/${sectionId}/${sheetId}-solution.pdf`;
      await uploadPdfIfNeeded({
        file: solutionPdfFile,
        repoPath: `public${solutionPdfPath}`,
        message: `Update IUM solution PDF: ${sectionId}/${sheetId}`,
      });
    }

    sheets[sheetIndex] = {
      ...currentSheet,
      id: sheetId,
      sectionId,
      title,
      description,
      topics,
      status,
      sheetPdf: sheetPdfPath,
      solutionPdf: solutionPdfPath || undefined,
      date,
      updatedAt: todayIsoDate(),
    };

    const nextJson = `${JSON.stringify(sheets, null, 2)}\n`;

    await writeRepoTextFile({
      path: sheetsFilePath,
      text: nextJson,
      message: `Update IUM sheet metadata: ${sectionId}/${sheetId}`,
      sha: repoFile.sha,
    });

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/admin/success?message=${encodeURIComponent("Листочек обновлён. Сделай git pull, чтобы увидеть изменения локально.")}`,
      },
    });
  } catch (error) {
    console.error("Update IUM sheet error:", error);

    const message = error instanceof Error ? error.message : "Неизвестная ошибка.";

    return new Response(message, {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
