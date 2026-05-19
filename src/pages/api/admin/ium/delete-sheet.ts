import { isAdminRequest } from "../../../../lib/admin/auth";
import {
  deleteRepoFile,
  readRepoTextFile,
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

function isSafeSlug(value: string) {
  return /^[a-z0-9-]+$/.test(value);
}

function publicPdfPathToRepoPath(path?: string): string | null {
  if (!path) {
    return null;
  }

  if (!path.startsWith("/files/ium/") || !path.toLowerCase().endsWith(".pdf")) {
    return null;
  }

  return `public${path}`;
}

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const isAdmin = await isAdminRequest(cookies);

    if (!isAdmin) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const sectionId = getRequiredString(formData, "sectionId");
    const sheetId = getRequiredString(formData, "sheetId");
    const deletePdfFiles = formData.get("deletePdfFiles") === "yes";

    if (!isSafeSlug(sectionId) || !isSafeSlug(sheetId)) {
      throw new Error("Некорректный sectionId или sheetId.");
    }

    const sheetsFilePath = "src/data/ium/sheets.json";
    const repoFile = await readRepoTextFile(sheetsFilePath);

    if (!repoFile) {
      throw new Error("Не найден src/data/ium/sheets.json в репозитории.");
    }

    const sheets = JSON.parse(repoFile.text) as IumSheet[];
    const sheet = sheets.find(
      (item) => item.sectionId === sectionId && item.id === sheetId
    );

    if (!sheet) {
      throw new Error("Листочек не найден в sheets.json.");
    }

    const nextSheets = sheets.filter(
      (item) => !(item.sectionId === sectionId && item.id === sheetId)
    );

    await writeRepoTextFile({
      path: sheetsFilePath,
      text: `${JSON.stringify(nextSheets, null, 2)}\n`,
      message: `Delete IUM sheet metadata: ${sectionId}/${sheetId}`,
      sha: repoFile.sha,
    });

    if (deletePdfFiles) {
      const sheetRepoPath = publicPdfPathToRepoPath(sheet.sheetPdf);
      const solutionRepoPath = publicPdfPathToRepoPath(sheet.solutionPdf);

      if (sheetRepoPath) {
        await deleteRepoFile({
          path: sheetRepoPath,
          message: `Delete IUM sheet PDF: ${sectionId}/${sheetId}`,
          skipMissing: true,
        });
      }

      if (solutionRepoPath) {
        await deleteRepoFile({
          path: solutionRepoPath,
          message: `Delete IUM solution PDF: ${sectionId}/${sheetId}`,
          skipMissing: true,
        });
      }
    }

    const message = deletePdfFiles
      ? "Листочек удалён. PDF-файлы тоже удалены, если они были найдены. Сделай git pull."
      : "Листочек удалён из каталога. PDF-файлы оставлены в репозитории. Сделай git pull.";

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/admin/success?message=${encodeURIComponent(message)}`,
      },
    });
  } catch (error) {
    console.error("Delete IUM sheet error:", error);

    const message = error instanceof Error ? error.message : "Неизвестная ошибка.";

    return new Response(message, {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
