interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  committerName: string;
  committerEmail: string;
}

interface RepoFileResponse {
  sha: string;
  content?: string;
  encoding?: string;
  type?: string;
}

function getEnv(name: string): string {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Не задана переменная окружения: ${name}`);
  }

  return value;
}

export function getGitHubConfig(): GitHubConfig {
  return {
    token: getEnv("GITHUB_TOKEN"),
    owner: getEnv("GITHUB_OWNER"),
    repo: getEnv("GITHUB_REPO"),
    branch: import.meta.env.GITHUB_BRANCH || "main",
    committerName: import.meta.env.GITHUB_COMMITTER_NAME || "Site Admin Bot",
    committerEmail:
      import.meta.env.GITHUB_COMMITTER_EMAIL || "site-admin@example.com",
  };
}

function getContentsUrl(config: GitHubConfig, path: string) {
  const cleanPath = path.replace(/^\/+/, "");
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${cleanPath}`;
}

export async function getRepoFile(path: string): Promise<RepoFileResponse | null> {
  const config = getGitHubConfig();

  const response = await fetch(`${getContentsUrl(config, path)}?ref=${config.branch}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub get file failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as RepoFileResponse;
  return data;
}

export async function readRepoTextFile(path: string): Promise<{
  text: string;
  sha: string;
} | null> {
  const file = await getRepoFile(path);

  if (!file || !file.content || file.type !== "file") {
    return null;
  }

  const normalized = file.content.replace(/\n/g, "");
  const text = Buffer.from(normalized, "base64").toString("utf-8");

  return {
    text,
    sha: file.sha,
  };
}

export async function putRepoFile(params: {
  path: string;
  contentBase64: string;
  message: string;
  sha?: string;
}) {
  const config = getGitHubConfig();

  const body: Record<string, unknown> = {
    message: params.message,
    content: params.contentBase64,
    branch: config.branch,
    committer: {
      name: config.committerName,
      email: config.committerEmail,
    },
  };

  if (params.sha) {
    body.sha = params.sha;
  }

  const response = await fetch(getContentsUrl(config, params.path), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub put file failed: ${response.status} ${text}`);
  }

  return response.json();
}

export async function writeRepoTextFile(params: {
  path: string;
  text: string;
  message: string;
  sha?: string;
}) {
  const contentBase64 = Buffer.from(params.text, "utf-8").toString("base64");

  return putRepoFile({
    path: params.path,
    contentBase64,
    message: params.message,
    sha: params.sha,
  });
}

export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

export function isRealUploadedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
