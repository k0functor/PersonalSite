import { checkPassword, createSessionToken, setSessionCookie } from "../../../lib/admin/auth";

export const prerender = false;

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  const formData = await request.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || !checkPassword(password)) {
    return new Response("Invalid password", {
      status: 401,
    });
  }

  const token = await createSessionToken();
  setSessionCookie(cookies, token);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin",
    },
  });
}
