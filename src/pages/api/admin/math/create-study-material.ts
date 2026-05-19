import { isAdminRequest } from "../../../../lib/admin/auth";
import {
  getJsonFile,
  updateJsonFile,
  putBinaryFile,
  slugify,
} from "../../../../lib/admin/mathRepo";

type StudyMaterial = {
  id: string;
  sectionId: string;
  kind: "theory" | "problems" | "exam";
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  pdf: string;
  date: string;
  updatedAt: string;
};

type StudySection = {
  id: string;
};

export const prerender = false;

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const isAdmin = await isAdminRequest(cookies);
    if (!isAdmin) return new Response("Unauthorized", { status: 401 });

    const form = await request.formData();

    const sectionId = slugify(String(form.get("sectionId") || ""));
    const id = slugify(String(form.get("id") || ""));
    const kind = String(form.get("kind") || "theory") as StudyMaterial["kind"];
    const pdf = form.get("pdf");

    if (!sectionId || !id) {
      return Response.redirect(new URL("/admin/math/study/new-material/?error=bad-id", request.url), 303);
    }

    if (!(pdf instanceof File) || pdf.size === 0) {
      return Response.redirect(new URL("/admin/math/study/new-material/?error=no-pdf", request.url), 303);
    }

    if (pdf.type && pdf.type !== "application/pdf") {
      return Response.redirect(new URL("/admin/math/study/new-material/?error=not-pdf", request.url), 303);
    }

    const sections = await getJsonFile<StudySection[]>("src/data/math/studySections.json", []);
    if (!sections.some((section) => section.id === sectionId)) {
      return Response.redirect(new URL("/admin/math/study/new-material/?error=unknown-section", request.url), 303);
    }

    const materialsPath = "src/data/math/studyMaterials.json";
    const materials = await getJsonFile<StudyMaterial[]>(materialsPath, []);

    if (materials.some((item) => item.sectionId === sectionId && item.id === id && item.kind === kind)) {
      return Response.redirect(new URL("/admin/math/study/new-material/?error=material-exists", request.url), 303);
    }

    const pdfRepoPath = `public/files/math/study/${sectionId}/${kind}/${id}.pdf`;
    const pdfPublicPath = `/files/math/study/${sectionId}/${kind}/${id}.pdf`;

    await putBinaryFile(
      pdfRepoPath,
      await pdf.arrayBuffer(),
      `Add study PDF: ${sectionId}/${kind}/${id}`
    );

    const date = String(form.get("date") || new Date().toISOString().slice(0, 10));
    const now = new Date().toISOString().slice(0, 10);

    materials.push({
      id,
      sectionId,
      kind,
      titleRu: String(form.get("titleRu") || "").trim(),
      titleEn: String(form.get("titleEn") || "").trim(),
      descriptionRu: String(form.get("descriptionRu") || "").trim(),
      descriptionEn: String(form.get("descriptionEn") || "").trim(),
      pdf: pdfPublicPath,
      date,
      updatedAt: now,
    });

    await updateJsonFile(materialsPath, materials, `Add study material: ${sectionId}/${kind}/${id}`);

    return Response.redirect(new URL("/admin/math/study/", request.url), 303);
  } catch (error) {
    console.error("create-study-material error", error);
    return Response.redirect(new URL("/admin/math/study/new-material/?error=server-error", request.url), 303);
  }
}
