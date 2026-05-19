import { isAdminRequest } from "../../../../lib/admin/auth";
import { getJsonFile, updateJsonFile } from "../../../../lib/admin/mathRepo";

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
    const id = String(form.get("id") || "").trim();

    if (!id) {
      return Response.redirect(new URL("/admin/math/books/?error=missing-id", request.url), 303);
    }

    const path = "src/data/math/books.json";
    const books = await getJsonFile<Book[]>(path, []);
    const book = books.find((item) => item.id === id);

    if (!book) {
      return Response.redirect(new URL("/admin/math/books/?error=book-not-found", request.url), 303);
    }

    const nextBooks = books.filter((item) => item.id !== id);

    await updateJsonFile(path, nextBooks, `Delete math book: ${book.title}`);

    return Response.redirect(new URL("/admin/math/books/?success=book-deleted", request.url), 303);
  } catch (error) {
    console.error("delete-book error", error);
    return Response.redirect(new URL("/admin/math/books/?error=server-error", request.url), 303);
  }
}
