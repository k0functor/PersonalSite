import { requireAdmin } from "../../../../lib/admin/auth";
import { updateIumSheet } from "../../../../lib/admin/ium";

export const prerender = false;

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  const redirect = await requireAdmin(cookies);
  if (redirect) return redirect;

  let fallback = "/admin/ium/edit-sheet/";

  try {
    const formData = await request.formData();
    const sectionId = String(formData.get("sectionId") ?? "");
    const id = String(formData.get("id") ?? "");
    fallback = `/admin/ium/edit-sheet/${sectionId}/${id}/`;

    const result = await updateIumSheet(formData);

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/admin/success?type=ium-sheet-update&slug=${encodeURIComponent(`${result.sectionId}/${result.id}`)}`,
      },
    });
  } catch (error) {
    console.error("Update IUM sheet error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(null, {
      status: 303,
      headers: {
        Location: `${fallback}?error=${encodeURIComponent(message)}`,
      },
    });
  }
}
