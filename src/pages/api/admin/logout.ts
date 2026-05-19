import { clearSessionCookie } from "../../../lib/admin/auth";

export const prerender = false;

export async function POST({ cookies }: { cookies: any }) {
  clearSessionCookie(cookies);

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin/login",
    },
  });
}
