const DATA_PATH = "src/data/programming/materials.json";

type GitHubFile = {
  sha: string;
  content: string;
  encoding: string;
};

function getEnv(name: string) {
  const value = import.meta.env[name] ?? process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getGitHubConfig() {
  return {
    token: getEnv("GITHUB_TOKEN"),
    owner: getEnv("GITHUB_OWNER"),
    repo: getEnv("GITHUB_REPO"),
    branch: getEnv("GITHUB_BRANCH"),
    committerName: getEnv("GITHUB_COMMITTER_NAME"),
    committerEmail: getEnv("GITHUB_COMMITTER_EMAIL"),
  };
}

function encodeBase64(value: string) {
  return Buffer.from(value, "utf-8").toString("base64");
}

function decodeBase64(value: string) {
  return Buffer.from(value, "base64").toString("utf-8");
}

async function getRepoFile(path: string) {
  const config = getGitHubConfig();
  const url = new URL(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
  );
  url.searchParams.set("ref", config.branch);

  const response = await fetch(url, {
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
    throw new Error(`GitHub get file failed: ${response.status} ${await response.text()}`);
  }

  const json = await response.json();

  if (Array.isArray(json)) {
    throw new Error(`GitHub path is a directory, expected file: ${path}`);
  }

  return json as GitHubFile;
}

async function createOrUpdateRepoFile(path: string, content: string, sha: string | null, message: string) {
  const config = getGitHubConfig();
  const body: Record<string, unknown> = {
    message,
    content: encodeBase64(content),
    branch: config.branch,
    committer: {
      name: config.committerName,
      email: config.committerEmail,
    },
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub write file failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function readProgrammingMaterialsFromGitHub<T>() {
  const file = await getRepoFile(DATA_PATH);

  if (!file) {
    return {
      sha: null,
      data: [] as T,
    };
  }

  const json = decodeBase64(file.content.replace(/\n/g, ""));

  return {
    sha: file.sha,
    data: JSON.parse(json) as T,
  };
}

export async function writeProgrammingMaterialsToGitHub<T>(
  data: T,
  sha: string | null,
  message: string,
) {
  const json = `${JSON.stringify(data, null, 2)}\n`;
  return createOrUpdateRepoFile(DATA_PATH, json, sha, message);
}
