import { isAdminRequest } from "../../../../lib/admin/auth";
import { getJsonFile, updateJsonFile, slugify } from "../../../../lib/admin/mathRepo";

type Book = {
  id: string;
  title: string;
  author: string;
  status: "read" | "reading" | "planned" | "paused" | "reference";
  areaRu: string;
  areaEn: string;
  level: "basic" | "intermediate" | "advanced";
  language: "ru" | "en" | "other";
  commentRu: string;
  commentEn: string;
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
      return Response.redirect(new URL("/admin/math/books/new/?error=bad-id", request.url), 303);
    }

    const book: Book = {
      id,
      title: String(form.get("title") || "").trim(),
      author: String(form.get("author") || "").trim(),
      status: String(form.get("status") || "planned") as Book["status"],
      areaRu: String(form.get("areaRu") || "").trim(),
      areaEn: String(form.get("areaEn") || "").trim(),
      level: String(form.get("level") || "basic") as Book["level"],
      language: String(form.get("language") || "en") as Book["language"],
      commentRu: String(form.get("commentRu") || "").trim(),
      commentEn: String(form.get("commentEn") || "").trim(),
      order: Number(form.get("order") || 100),
    };

    const path = "src/data/math/books.json";
    const books = await getJsonFile<Book[]>(path, []);

    if (books.some((item) => item.id === id)) {
      return Response.redirect(new URL("/admin/math/books/new/?error=book-exists", request.url), 303);
    }

    books.push(book);
    books.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    await updateJsonFile(path, books, `Add math book: ${book.title}`);

    return Response.redirect(new URL("/admin/math/", request.url), 303);
  } catch (error) {
    console.error("create-book error", error);
    return Response.redirect(new URL("/admin/math/books/new/?error=server-error", request.url), 303);
  }
}
