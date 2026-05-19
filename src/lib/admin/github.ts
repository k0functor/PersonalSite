const GITHUB_API_BASE = "https://api.github.com";

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getGitHubConfig() {
  return {
    token: getRequiredEnv("GITHUB_TOKEN"),
    owner: getRequiredEnv("GITHUB_OWNER"),
    repo: getRequiredEnv("GITHUB_REPO"),
    branch: getRequiredEnv("GITHUB_BRANCH"),
    committerName: import.meta.env.GITHUB_COMMITTER_NAME ?? "Site Admin Bot",
    committerEmail:
      import.meta.env.GITHUB_COMMITTER_EMAIL ?? "site-admin@example.com",
  };
}

function normalizeRepoPath(path: string): string {
  return path.replace(/^\/+/, "");
}

function encodeTextToBase64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

function encodeArrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

async function githubRequest(path: string, init: RequestInit = {}) {
  const { token } = getGitHubConfig();

  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  return response;
}

export async function getFileShaFromGitHub(
  filePath: string
): Promise<string | null> {
  const { owner, repo, branch } = getGitHubConfig();
  const cleanPath = normalizeRepoPath(filePath);

  const url =
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(cleanPath)}` +
    `?ref=${encodeURIComponent(branch)}`;

  const response = await fetch(`${GITHUB_API_BASE}${url}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${getGitHubConfig().token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (typeof data.sha !== "string") {
    return null;
  }

  return data.sha;
}

export async function readTextFileFromGitHub(
  filePath: string
): Promise<string | null> {
  const { owner, repo, branch } = getGitHubConfig();
  const cleanPath = normalizeRepoPath(filePath);

  const url =
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(cleanPath)}` +
    `?ref=${encodeURIComponent(branch)}`;

  const response = await fetch(`${GITHUB_API_BASE}${url}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${getGitHubConfig().token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (typeof data.content !== "string") {
    return null;
  }

  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function readJsonFileFromGitHub<T>(
  filePath: string,
  fallback: T
): Promise<T> {
  const text = await readTextFileFromGitHub(filePath);

  if (!text) {
    return fallback;
  }

  return JSON.parse(text) as T;
}

export async function createOrUpdateFileInGitHub(params: {
  path: string;
  contentBase64: string;
  message: string;
}): Promise<void> {
  const { owner, repo, branch, committerName, committerEmail } =
    getGitHubConfig();

  const cleanPath = normalizeRepoPath(params.path);
  const sha = await getFileShaFromGitHub(cleanPath);

  const body: Record<string, unknown> = {
    message: params.message,
    content: params.contentBase64,
    branch,
    committer: {
      name: committerName,
      email: committerEmail,
    },
  };

  if (sha) {
    body.sha = sha;
  }

  await githubRequest(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(cleanPath)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}

export async function createFileInGitHub(
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  await createOrUpdateFileInGitHub({
    path: filePath,
    contentBase64: encodeTextToBase64(content),
    message,
  });
}

export async function writeJsonFileToGitHub(
  filePath: string,
  data: unknown,
  message: string
): Promise<void> {
  const content = `${JSON.stringify(data, null, 2)}\n`;

  await createOrUpdateFileInGitHub({
    path: filePath,
    contentBase64: encodeTextToBase64(content),
    message,
  });
}

export async function uploadBinaryFileToGitHub(
  filePath: string,
  file: File,
  message: string
): Promise<void> {
  const buffer = await file.arrayBuffer();

  await createOrUpdateFileInGitHub({
    path: filePath,
    contentBase64: encodeArrayBufferToBase64(buffer),
    message,
  });
}

export async function deleteFileFromGitHub(
  filePath: string,
  message: string
): Promise<void> {
  const { owner, repo, branch, committerName, committerEmail } =
    getGitHubConfig();

  const cleanPath = normalizeRepoPath(filePath);
  const sha = await getFileShaFromGitHub(cleanPath);

  if (!sha) {
    return;
  }

  await githubRequest(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(cleanPath)}`,
    {
      method: "DELETE",
      body: JSON.stringify({
        message,
        sha,
        branch,
        committer: {
          name: committerName,
          email: committerEmail,
        },
      }),
    }
  );
}

export function textToBase64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

export const readJsonFile = readJsonFileFromGitHub;

export const createOrUpdateRepoFile = createOrUpdateFileInGitHub;