import { isAdminRequest } from "../../../../lib/admin/auth";
import {
  readProgrammingMaterialsFromGitHub,
  writeProgrammingMaterialsToGitHub,
} from "../../../../lib/admin/githubProgramming";
import type { ProgrammingMaterial } from "../../../../lib/programming/catalog";

export const prerender = false;

function redirect(location: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
    },
  });
}

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const isAdmin = await isAdminRequest(cookies);

    if (!isAdmin) {
      return redirect("/admin/login");
    }

    const formData = await request.formData();
    const id = formData.get("id");

    if (typeof id !== "string" || !id.trim()) {
      return redirect("/admin/programming/?error=missing-id");
    }

    const { data, sha } = await readProgrammingMaterialsFromGitHub<ProgrammingMaterial[]>();
    const material = data.find((item) => item.id === id);

    if (!material) {
      return redirect("/admin/programming/?error=material-not-found");
    }

    const nextData = data.filter((item) => item.id !== id);

    await writeProgrammingMaterialsToGitHub(
      nextData,
      sha,
      `Delete programming material: ${material.title}`,
    );

    return redirect(`/admin/programming/${material.sectionId}/?deleted=1`);
  } catch (error) {
    console.error("Delete programming material error:", error);
    return redirect("/admin/programming/?error=server-error");
  }
}
