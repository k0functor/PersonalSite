import { isAdminRequest } from "../../../../lib/admin/auth";
import {
  arrayBufferToBase64,
  createOrUpdateRepoFile,
  readJsonFile,
  textToBase64,
} from "../../../../lib/admin/github";
import type { IumSection, IumSheet, IumSheetStatus } from "../../../../lib/ium/types";
import { assertPdfFile, isNonEmptyFile, isSafeSlug, parseTopics, slugify } from "../../../../lib/ium/validation";

export const prerender = false;

const SECTIONS_PATH = "src/data/ium/sections.json";
const SHEETS_PATH = "src/data/ium/sheets.json";

const allowedStatuses = new Set<IumSheetStatus>([
  "not-started",
  "in-progress",
  "partly-solved",
  "solved",
  "submitted",
  "needs-rewrite",
]);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(message: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/admin/ium/new-sheet/?error=${encodeURIComponent(message)}`,
    },
  });
}

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const isAdmin = await isAdminRequest(cookies);

    if (!isAdmin) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/admin/login" },
      });
    }

    const formData = await request.formData();

    const sectionId = getString(formData, "sectionId");
    const rawSheetId = getString(formData, "sheetId");
    const sheetId = rawSheetId ? slugify(rawSheetId) : "";
    const title = getString(formData, "title");
    const description = getString(formData, "description");
    const topics = parseTopics(getString(formData, "topics"));
    const status = getString(formData, "status") as IumSheetStatus;
    const date = getString(formData, "date") || new Date().toISOString().slice(0, 10);

    const sheetPdf = formData.get("sheetPdf");
    const solutionPdf = formData.get("solutionPdf");

    if (!sectionId) return fail("Выбери раздел.");
    if (!sheetId || !isSafeSlug(sheetId)) return fail("Slug листочка должен содержать только a-z, 0-9 и дефисы.");
    if (!title) return fail("Укажи название листочка.");
    if (!description) return fail("Укажи описание листочка.");
    if (!allowedStatuses.has(status)) return fail("Некорректный статус.");
    if (!isNonEmptyFile(sheetPdf)) return fail("Загрузи PDF условия.");

    assertPdfFile(sheetPdf, "PDF условия");

    if (isNonEmptyFile(solutionPdf)) {
      assertPdfFile(solutionPdf, "PDF решения");
    }

    const { data: sections } = await readJsonFile<IumSection[]>(SECTIONS_PATH, []);
    const section = sections.find((item) => item.id === sectionId);

    if (!section) {
      return fail("Раздел не найден в sections.json.");
    }

    const { data: sheets, sha: sheetsSha } = await readJsonFile<IumSheet[]>(SHEETS_PATH, []);
    const duplicate = sheets.find((item) => item.sectionId === sectionId && item.id === sheetId);

    if (duplicate) {
      return fail("Листочек с таким slug уже существует. Редактирование добавим отдельным шагом.");
    }

    const sheetRepoPath = `public/files/ium/${sectionId}/${sheetId}.pdf`;
    const solutionRepoPath = `public/files/ium/${sectionId}/${sheetId}-solution.pdf`;

    await createOrUpdateRepoFile({
      path: sheetRepoPath,
      contentBase64: arrayBufferToBase64(await sheetPdf.arrayBuffer()),
      message: `Add IUM sheet PDF: ${sectionId}/${sheetId}`,
    });

    let solutionPdfUrl = "";

    if (isNonEmptyFile(solutionPdf)) {
      await createOrUpdateRepoFile({
        path: solutionRepoPath,
        contentBase64: arrayBufferToBase64(await solutionPdf.arrayBuffer()),
        message: `Add IUM solution PDF: ${sectionId}/${sheetId}`,
      });

      solutionPdfUrl = `/files/ium/${sectionId}/${sheetId}-solution.pdf`;
    }

    const now = new Date().toISOString().slice(0, 10);

    const nextSheet: IumSheet = {
      id: sheetId,
      sectionId,
      title,
      description,
      topics,
      status,
      sheetPdf: `/files/ium/${sectionId}/${sheetId}.pdf`,
      solutionPdf: solutionPdfUrl,
      date,
      updatedAt: now,
    };

    const nextSheets = [...sheets, nextSheet].sort((a, b) => {
      if (a.sectionId !== b.sectionId) return a.sectionId.localeCompare(b.sectionId);
      return a.id.localeCompare(b.id);
    });

    await createOrUpdateRepoFile({
      path: SHEETS_PATH,
      contentBase64: textToBase64(`${JSON.stringify(nextSheets, null, 2)}\n`),
      message: `Register IUM PDF sheet: ${sectionId}/${sheetId}`,
      sha: sheetsSha,
    });

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/admin/success?message=${encodeURIComponent("PDF-листочек добавлен. GitHub получил commit, теперь дождись redeploy.")}`,
      },
    });
  } catch (error) {
    console.error("Create IUM PDF sheet error:", error);

    return fail(error instanceof Error ? error.message : "Неизвестная ошибка.");
  }
}
