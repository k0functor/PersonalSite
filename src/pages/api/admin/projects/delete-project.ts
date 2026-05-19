import { isAdminRequest } from "../../../../lib/admin/auth";

export const prerender = false;

interface ProjectItem {
  id: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  status: "done" | "in-progress" | "planned" | "paused";
  order: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function encodeBase64(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64");
}

async function getGithubFile(path: string) {
  const token = requireEnv("GITHUB_TOKEN");
  const owner = requireEnv("GITHUB_OWNER");
  const repo = requireEnv("GITHUB_REPO");
  const branch = process.env.GITHUB_BRANCH || "main";

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Cannot read ${path}: ${response.status}`);
  }

  const data = await response.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");

  return {
    content,
    sha: data.sha as string,
  };
}

async function updateGithubFile(path: string, content: string, sha: string, message: string) {
  const token = requireEnv("GITHUB_TOKEN");
  const owner = requireEnv("GITHUB_OWNER");
  const repo = requireEnv("GITHUB_REPO");
  const branch = process.env.GITHUB_BRANCH || "main";

  const committerName = process.env.GITHUB_COMMITTER_NAME || "Site Admin Bot";
  const committerEmail = process.env.GITHUB_COMMITTER_EMAIL || "site-admin@example.com";

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: encodeBase64(content),
        sha,
        branch,
        committer: {
          name: committerName,
          email: committerEmail,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cannot update ${path}: ${response.status} ${text}`);
  }
}

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const isAdmin = await isAdminRequest(cookies);
    if (!isAdmin) {
      return new Response(null, { status: 303, headers: { Location: "/admin/login" } });
    }

    const formData = await request.formData();
    const id = String(formData.get("id") || "").trim();

    if (!id) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/admin/projects/?error=missing-id" },
      });
    }

    const path = "src/data/projects/projects.json";
    const file = await getGithubFile(path);
    const projects = JSON.parse(file.content) as ProjectItem[];
    const nextProjects = projects.filter((project) => project.id !== id);

    if (nextProjects.length === projects.length) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/admin/projects/?error=not-found" },
      });
    }

    await updateGithubFile(
      path,
      `${JSON.stringify(nextProjects, null, 2)}\n`,
      file.sha,
      `Delete project ${id}`
    );

    return new Response(null, {
      status: 303,
      headers: { Location: "/admin/projects/?success=deleted" },
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return new Response(null, {
      status: 303,
      headers: { Location: "/admin/projects/?error=server-error" },
    });
  }
}
