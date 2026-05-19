import { isAdminRequest } from "../../../../lib/admin/auth";

export const prerender = false;

type IumSection = {
  id: string;
  title: string;
  description: string;
  order: number;
  lang: "ru" | "en";
};

type IumSheet = {
  id: string;
  sectionId: string;
};

type GitHubFile = {
  content: string;
  sha?: string;
};

const SECTIONS_PATH = "src/data/ium/sections.json";
const SHEETS_PATH = "src/data/ium/sheets.json";

function getRequiredEnv(name: string) {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getGitHubConfig() {
  return {
    token: getRequiredEnv("GITHUB_TOKEN"),
    owner: getRequiredEnv("GITHUB_OWNER"),
    repo: getRequiredEnv("GITHUB_REPO"),
    branch: getRequiredEnv("GITHUB_BRANCH"),
    committerName: import.meta.env.GITHUB_COMMITTER_NAME || "Site Admin Bot",
    committerEmail: import.meta.env.GITHUB_COMMITTER_EMAIL || "site-admin@example.com",
  };
}

function encodeBase64(content: string) {
  return Buffer.from(content, "utf8").toString("base64");
}

function decodeBase64(content: string) {
  return Buffer.from(content, "base64").toString("utf8");
}

async function getRepoFile(path: string): Promise<GitHubFile | null> {
  const config = getGitHubConfig();
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`;

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
    const text = await response.text();
    throw new Error(`GitHub GET failed for ${path}: ${response.status} ${text}`);
  }

  const data = await response.json();

  return {
    content: decodeBase64(String(data.content).replace(/\n/g, "")),
    sha: data.sha,
  };
}

async function putRepoFile(path: string, content: string, message: string, sha?: string) {
  const config = getGitHubConfig();
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;

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

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub PUT failed for ${path}: ${response.status} ${text}`);
  }
}

function redirect(location: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
    },
  });
}

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  const isAdmin = await isAdminRequest(cookies);

  if (!isAdmin) {
    return redirect("/admin/login");
  }

  try {
    const formData = await request.formData();
    const id = String(formData.get("id") || "").trim();

    if (!id) {
      return redirect("/admin/ium/delete-section/?error=not-found");
    }

    const sectionsFile = await getRepoFile(SECTIONS_PATH);
    const sheetsFile = await getRepoFile(SHEETS_PATH);

    const sections: IumSection[] = sectionsFile ? JSON.parse(sectionsFile.content) : [];
    const sheets: IumSheet[] = sheetsFile ? JSON.parse(sheetsFile.content) : [];

    const sectionExists = sections.some((section) => section.id === id);

    if (!sectionExists) {
      return redirect("/admin/ium/delete-section/?error=not-found");
    }

    const hasSheets = sheets.some((sheet) => sheet.sectionId === id);

    if (hasSheets) {
      return redirect("/admin/ium/delete-section/?error=has-sheets");
    }

    const nextSections = sections.filter((section) => section.id !== id);

    await putRepoFile(
      SECTIONS_PATH,
      `${JSON.stringify(nextSections, null, 2)}\n`,
      `Delete IUM section: ${id}`,
      sectionsFile?.sha
    );

    return redirect("/admin/ium/delete-section/?success=deleted");
  } catch (error) {
    console.error("Delete IUM section error:", error);
    return redirect("/admin/ium/delete-section/?error=server");
  }
}
