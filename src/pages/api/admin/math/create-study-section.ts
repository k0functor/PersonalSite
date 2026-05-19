import { isAdminRequest } from "../../../../lib/admin/auth";
import { getJsonFile, updateJsonFile, slugify } from "../../../../lib/admin/mathRepo";

type StudySection = {
  id: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  order: number;
};

export const prerender = false;

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const isAdmin = await isAdminRequest(cookies);
    if (!isAdmin) return new Response("Unauthorized", { status: 401 });

    const form = await request.formData();
    const id = slugify(String(form.get("id") || ""));

    if (!id) {
      return Response.redirect(new URL("/admin/math/study/new-section/?error=bad-id", request.url), 303);
    }

    const section: StudySection = {
      id,
      titleRu: String(form.get("titleRu") || "").trim(),
      titleEn: String(form.get("titleEn") || "").trim(),
      descriptionRu: String(form.get("descriptionRu") || "").trim(),
      descriptionEn: String(form.get("descriptionEn") || "").trim(),
      order: Number(form.get("order") || 100),
    };

    const path = "src/data/math/studySections.json";
    const sections = await getJsonFile<StudySection[]>(path, []);

    if (sections.some((item) => item.id === id)) {
      return Response.redirect(new URL("/admin/math/study/new-section/?error=section-exists", request.url), 303);
    }

    sections.push(section);
    sections.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    await updateJsonFile(path, sections, `Add math study section: ${section.titleRu}`);

    return Response.redirect(new URL("/admin/math/study/", request.url), 303);
  } catch (error) {
    console.error("create-study-section error", error);
    return Response.redirect(new URL("/admin/math/study/new-section/?error=server-error", request.url), 303);
  }
}
