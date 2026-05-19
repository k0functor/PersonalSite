interface RepoFile {
  path: string;
  sha: string;
  content: string;
  encoding: string;
}

function getRequiredEnv(name: string) {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getRepoConfig() {
  return {
    token: getRequiredEnv("GITHUB_TOKEN"),
    owner: getRequiredEnv("GITHUB_OWNER"),
    repo: getRequiredEnv("GITHUB_REPO"),
    branch: import.meta.env.GITHUB_BRANCH || "main",
    committerName: import.meta.env.GITHUB_COMMITTER_NAME || "Site Admin Bot",
    committerEmail:
      import.meta.env.GITHUB_COMMITTER_EMAIL || "site-admin@example.com",
  };
}

function getFileUrl(path: string) {
  const { owner, repo } = getRepoConfig();
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponentPath(path)}`;
}

function encodeURIComponentPath(path: string) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function textToBase64(text: string) {
  return Buffer.from(text, "utf8").toString("base64");
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

export function base64ToText(content: string) {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

export async function getRepoFile(path: string): Promise<RepoFile | null> {
  const { token, branch } = getRepoConfig();

  const response = await fetch(`${getFileUrl(path)}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub file read failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    throw new Error(`Expected file but got directory: ${path}`);
  }

  return data;
}

export async function readJsonFile<T>(path: string, fallback: T): Promise<{ data: T; sha?: string }> {
  const file = await getRepoFile(path);

  if (!file) {
    return { data: fallback };
  }

  const text = base64ToText(file.content);
  return {
    data: JSON.parse(text) as T,
    sha: file.sha,
  };
}

export async function createOrUpdateRepoFile(options: {
  path: string;
  contentBase64: string;
  message: string;
  sha?: string;
}) {
  const { token, branch, committerName, committerEmail } = getRepoConfig();

  const body: Record<string, unknown> = {
    message: options.message,
    content: options.contentBase64,
    branch,
    committer: {
      name: committerName,
      email: committerEmail,
    },
  };

  if (options.sha) {
    body.sha = options.sha;
  }

  const response = await fetch(getFileUrl(options.path), {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub file write failed: ${response.status} ${errorText}`);
  }

  return response.json();
}
