type JsonValue = unknown;

function requiredEnv(name: string) {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getRepoConfig() {
  return {
    token: requiredEnv("GITHUB_TOKEN"),
    owner: requiredEnv("GITHUB_OWNER"),
    repo: requiredEnv("GITHUB_REPO"),
    branch: import.meta.env.GITHUB_BRANCH || "main",
    committerName: import.meta.env.GITHUB_COMMITTER_NAME || "Site Admin Bot",
    committerEmail:
      import.meta.env.GITHUB_COMMITTER_EMAIL || "site-admin@example.com",
  };
}

function encodeBase64Utf8(value: string) {
  return Buffer.from(value, "utf-8").toString("base64");
}

function decodeBase64Utf8(value: string) {
  return Buffer.from(value, "base64").toString("utf-8");
}

function encodeBase64Bytes(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString("base64");
}

async function githubRequest(path: string, init: RequestInit = {}) {
  const config = getRepoConfig();

  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}${path}`,
    {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.headers || {}),
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  return response;
}

export async function getRepoFile(path: string) {
  const config = getRepoConfig();
  const response = await githubRequest(
    `/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(config.branch)}`
  );
  return response.json();
}

function encodeURIComponentPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function getJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const file = await getRepoFile(path);
    if (Array.isArray(file) || typeof file.content !== "string") {
      return fallback;
    }

    return JSON.parse(decodeBase64Utf8(file.content)) as T;
  } catch (error) {
    console.warn(`Could not read ${path} from GitHub. Using fallback.`, error);
    return fallback;
  }
}

export async function putTextFile(path: string, content: string, message: string) {
  const config = getRepoConfig();
  let sha: string | undefined;

  try {
    const current = await getRepoFile(path);
    if (!Array.isArray(current) && typeof current.sha === "string") {
      sha = current.sha;
    }
  } catch {
    sha = undefined;
  }

  const body: Record<string, unknown> = {
    message,
    content: encodeBase64Utf8(content),
    branch: config.branch,
    committer: {
      name: config.committerName,
      email: config.committerEmail,
    },
  };

  if (sha) {
    body.sha = sha;
  }

  await githubRequest(`/contents/${encodeURIComponentPath(path)}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function putBinaryFile(
  path: string,
  bytes: ArrayBuffer,
  message: string
) {
  const config = getRepoConfig();
  let sha: string | undefined;

  try {
    const current = await getRepoFile(path);
    if (!Array.isArray(current) && typeof current.sha === "string") {
      sha = current.sha;
    }
  } catch {
    sha = undefined;
  }

  const body: Record<string, unknown> = {
    message,
    content: encodeBase64Bytes(bytes),
    branch: config.branch,
    committer: {
      name: config.committerName,
      email: config.committerEmail,
    },
  };

  if (sha) {
    body.sha = sha;
  }

  await githubRequest(`/contents/${encodeURIComponentPath(path)}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function updateJsonFile<T extends JsonValue>(
  path: string,
  nextValue: T,
  message: string
) {
  await putTextFile(path, `${JSON.stringify(nextValue, null, 2)}\n`, message);
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яё_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
