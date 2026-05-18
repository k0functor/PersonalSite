import { getAdminEnv } from "./env";
import { encodeBase64Utf8 } from "./crypto";

interface CreateFileOptions {
  path: string;
  content: string;
  message: string;
}

interface GitHubErrorResponse {
  message?: string;
  documentation_url?: string;
}

export async function createFileInGitHub({
  path,
  content,
  message,
}: CreateFileOptions) {
  const env = getAdminEnv();

  const url = new URL(
    `https://api.github.com/repos/${env.githubOwner}/${env.githubRepo}/contents/${path}`,
  );

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.githubToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "astro-site-admin",
    },
    body: JSON.stringify({
      message,
      content: encodeBase64Utf8(content),
      branch: env.githubBranch,
      committer: {
        name: env.githubCommitterName,
        email: env.githubCommitterEmail,
      },
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as GitHubErrorResponse;

    throw new Error(
      data.message
        ? `GitHub API error: ${data.message}`
        : `GitHub API error: ${response.status}`,
    );
  }

  return response.json();
}
