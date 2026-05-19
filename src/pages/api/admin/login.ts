import {
  checkPassword,
  createSessionToken,
  setSessionCookie,
} from "../../../lib/admin/auth";

export const prerender = false;

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const formData = await request.formData();
    const password = formData.get("password");

    if (typeof password !== "string" || !checkPassword(password)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/admin/login?error=invalid-password",
        },
      });
    }

    const token = await createSessionToken();
    setSessionCookie(cookies, token);

    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin/",
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin/login?error=server-error",
      },
    });
  }
}
