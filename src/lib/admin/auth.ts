const SESSION_COOKIE_NAME = "personal_site_admin_session";

function getRequiredEnv(name: string) {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sign(value: string) {
  const secret = getRequiredEnv("ADMIN_SESSION_SECRET");
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(signature);
}

export function checkPassword(password: string) {
  return password === getRequiredEnv("ADMIN_PASSWORD");
}

export async function createSessionToken() {
  const payload = JSON.stringify({
    role: "admin",
    createdAt: Date.now(),
  });

  const payloadBase64 = btoa(payload);
  const signature = await sign(payloadBase64);

  return `${payloadBase64}.${signature}`;
}

export async function verifySessionToken(token?: string) {
  if (!token || !token.includes(".")) {
    return false;
  }

  const [payloadBase64, signature] = token.split(".");

  if (!payloadBase64 || !signature) {
    return false;
  }

  const expectedSignature = await sign(payloadBase64);
  return signature === expectedSignature;
}

export function setSessionCookie(cookies: any, token: string) {
  cookies.set(SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(cookies: any) {
  cookies.delete(SESSION_COOKIE_NAME, {
    path: "/",
  });
}

export async function isAdminRequest(cookies: any) {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
