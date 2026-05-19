import { getAdminEnv } from "./env";
import { encodeBase64Utf8 } from "./crypto";

interface CreateFileOptions {
  path: string;
  content: string;
  message: string;
}

interface CreateOrUpdateFileOptions {
  path: string;
  content: string;
  message: string;
  sha?: string;
  encoded?: boolean;
}

interface RepoFileResponse {
  type: string;
  encoding?: string;
  content?: string;
  sha?: string;
  path?: string;
}

interface GitHubErrorResponse {
  message?: string;
  documentation_url?: string;
}

function toBase64Bytes(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64Utf8(input: string): string {
  const normalized = input.replace(/\n/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}

function getContentsUrl(path: string) {
  const env = getAdminEnv();
  return new URL(
    `https://api.github.com/repos/${env.githubOwner}/${env.githubRepo}/contents/${path}`,
  );
}

function getHeaders() {
  const env = getAdminEnv();

  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${env.githubToken}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "astro-site-admin",
  };
}

export async function getFileFromGitHub(path: string): Promise<RepoFileResponse | null> {
  const env = getAdminEnv();
  const url = getContentsUrl(path);
  url.searchParams.set("ref", env.githubBranch);

  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as GitHubErrorResponse;
    throw new Error(data.message ? `GitHub API error: ${data.message}` : `GitHub API error: ${response.status}`);
  }

  return (await response.json()) as RepoFileResponse;
}

export async function createOrUpdateFileInGitHub({
  path,
  content,
  message,
  sha,
  encoded = false,
}: CreateOrUpdateFileOptions) {
  const env = getAdminEnv();
  const response = await fetch(getContentsUrl(path), {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({
      message,
      content: encoded ? content : encodeBase64Utf8(content),
      branch: env.githubBranch,
      sha,
      committer: {
        name: env.githubCommitterName,
        email: env.githubCommitterEmail,
      },
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as GitHubErrorResponse;
    throw new Error(data.message ? `GitHub API error: ${data.message}` : `GitHub API error: ${response.status}`);
  }

  return response.json();
}

export async function createFileInGitHub({
  path,
  content,
  message,
}: CreateFileOptions) {
  return createOrUpdateFileInGitHub({ path, content, message });
}

export async function readJsonFileFromGitHub<T>(path: string, fallback: T): Promise<{ data: T; sha?: string }> {
  const file = await getFileFromGitHub(path);

  if (!file || !file.content) {
    return { data: fallback };
  }

  return {
    data: JSON.parse(fromBase64Utf8(file.content)) as T,
    sha: file.sha,
  };
}

export async function writeJsonFileToGitHub(path: string, data: unknown, message: string, sha?: string) {
  return createOrUpdateFileInGitHub({
    path,
    content: `${JSON.stringify(data, null, 2)}\n`,
    message,
    sha,
  });
}

export async function uploadBinaryFileToGitHub(path: string, file: File, message: string) {
  const existing = await getFileFromGitHub(path);
  const bytes = new Uint8Array(await file.arrayBuffer());

  return createOrUpdateFileInGitHub({
    path,
    content: toBase64Bytes(bytes),
    message,
    sha: existing?.sha,
    encoded: true,
  });
}
