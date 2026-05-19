import { isAdminRequest } from "../../../../lib/admin/auth";

export const prerender = false;

type ProjectStatus = "done" | "in-progress" | "planned" | "paused";

interface ProjectItem {
  id: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  status: ProjectStatus;
  order: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

    const id = normalizeId(String(formData.get("id") || ""));
    const titleRu = String(formData.get("titleRu") || "").trim();
    const titleEn = String(formData.get("titleEn") || "").trim();
    const descriptionRu = String(formData.get("descriptionRu") || "").trim();
    const descriptionEn = String(formData.get("descriptionEn") || "").trim();
    const status = String(formData.get("status") || "planned") as ProjectStatus;
    const order = Number(formData.get("order") || 10);

    if (!id || !titleRu || !titleEn || !descriptionRu || !descriptionEn) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/admin/projects/new/?error=missing-fields" },
      });
    }

    const path = "src/data/projects/projects.json";
    const file = await getGithubFile(path);
    const projects = JSON.parse(file.content) as ProjectItem[];

    if (projects.some((project) => project.id === id)) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/admin/projects/new/?error=duplicate-id" },
      });
    }

    projects.push({
      id,
      titleRu,
      titleEn,
      descriptionRu,
      descriptionEn,
      status,
      order: Number.isFinite(order) ? order : 10,
    });

    projects.sort((a, b) => a.order - b.order);

    await updateGithubFile(
      path,
      `${JSON.stringify(projects, null, 2)}\n`,
      file.sha,
      `Add project ${id}`
    );

    return new Response(null, {
      status: 303,
      headers: { Location: "/admin/projects/?success=created" },
    });
  } catch (error) {
    console.error("Create project error:", error);
    return new Response(null, {
      status: 303,
      headers: { Location: "/admin/projects/new/?error=server-error" },
    });
  }
}
