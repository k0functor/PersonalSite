import { isAdminRequest } from "../../../../lib/admin/auth";
import { getJsonFile, updateJsonFile } from "../../../../lib/admin/mathRepo";

type StudySection = {
  id: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  order: number;
};

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
  order: number;
};

export const prerender = false;

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const isAdmin = await isAdminRequest(cookies);
    if (!isAdmin) return new Response("Unauthorized", { status: 401 });

    const form = await request.formData();
    const id = String(form.get("id") || "").trim();

    if (!id) {
      return Response.redirect(new URL("/admin/math/study/?error=missing-id", request.url), 303);
    }

    const sectionsPath = "src/data/math/studySections.json";
    const materialsPath = "src/data/math/studyMaterials.json";

    const sections = await getJsonFile<StudySection[]>(sectionsPath, []);
    const materials = await getJsonFile<StudyMaterial[]>(materialsPath, []);

    const section = sections.find((item) => item.id === id);

    if (!section) {
      return Response.redirect(new URL("/admin/math/study/?error=section-not-found", request.url), 303);
    }

    const materialsCount = materials.filter((item) => item.sectionId === id).length;

    if (materialsCount > 0) {
      return Response.redirect(new URL("/admin/math/study/?error=section-has-materials", request.url), 303);
    }

    const nextSections = sections.filter((item) => item.id !== id);

    await updateJsonFile(
      sectionsPath,
      nextSections,
      `Delete math study section: ${section.titleRu}`
    );

    return Response.redirect(new URL("/admin/math/study/?success=section-deleted", request.url), 303);
  } catch (error) {
    console.error("delete-study-section error", error);
    return Response.redirect(new URL("/admin/math/study/?error=server-error", request.url), 303);
  }
}
