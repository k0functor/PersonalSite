import type { AstroCookies } from "astro";
import { getAdminEnv } from "./env";
import { sign, verifySignature } from "./crypto";

const COOKIE_NAME = "site_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  role: "admin";
  exp: number;
}

function encodePayload(payload: SessionPayload): string {
  return btoa(JSON.stringify(payload));
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    return JSON.parse(atob(encoded)) as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSessionToken(): Promise<string> {
  const { sessionSecret } = getAdminEnv();

  const payload = encodePayload({
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  });

  const signature = await sign(payload, sessionSecret);

  return `${payload}.${signature}`;
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const { sessionSecret } = getAdminEnv();
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  const validSignature = await verifySignature(payload, signature, sessionSecret);

  if (!validSignature) {
    return false;
  }

  const decoded = decodePayload(payload);

  if (!decoded || decoded.role !== "admin") {
    return false;
  }

  return decoded.exp > Math.floor(Date.now() / 1000);
}

export async function isAdmin(cookies: AstroCookies): Promise<boolean> {
  const token = cookies.get(COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}

export async function requireAdmin(cookies: AstroCookies): Promise<Response | null> {
  const valid = await isAdmin(cookies);

  if (valid) {
    return null;
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin/login",
    },
  });
}

export function setSessionCookie(cookies: AstroCookies, token: string): void {
  cookies.set(COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: import.meta.env.PROD,
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, {
    path: "/",
  });
}

export function checkPassword(password: string): boolean {
  const { adminPassword } = getAdminEnv();
  return password === adminPassword;
}
