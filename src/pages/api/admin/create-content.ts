import { isAdmin } from "../../../lib/admin/auth";
import { buildMdx, getContentPath, inputFromFormData } from "../../../lib/admin/content";
import { createFileInGitHub } from "../../../lib/admin/github";

export const prerender = false;

export async function POST({
  request,
  cookies,
}: {
  request: Request;
  cookies: any;
}) {
  const admin = await isAdmin(cookies);

  if (!admin) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  try {
    const formData = await request.formData();
    const input = inputFromFormData(formData);
    const path = getContentPath(input);
    const content = buildMdx(input);

    await createFileInGitHub({
      path,
      content,
      message: `Add ${input.type}: ${input.title}`,
    });

    const successUrl = new URL("/admin/success", new URL(request.url).origin);
    successUrl.searchParams.set("path", path);

    return new Response(null, {
      status: 302,
      headers: {
        Location: successUrl.pathname + successUrl.search,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(message, {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
