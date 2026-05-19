import { requireAdmin } from "../../../../lib/admin/auth";
import { addIumSheet } from "../../../../lib/admin/ium";

export const prerender = false;

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  const redirect = await requireAdmin(cookies);
  if (redirect) return redirect;

  try {
    const formData = await request.formData();
    const { sectionId, id } = await addIumSheet(formData);

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/admin/success?type=ium-sheet&slug=${encodeURIComponent(`${sectionId}/${id}`)}`,
      },
    });
  } catch (error) {
    console.error("Create IUM sheet error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/admin/ium/new-sheet?error=${encodeURIComponent(message)}`,
      },
    });
  }
}
