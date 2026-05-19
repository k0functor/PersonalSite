import { isAdminRequest } from "../../../../lib/admin/auth";
import {
  readProgrammingMaterialsFromGitHub,
  writeProgrammingMaterialsToGitHub,
} from "../../../../lib/admin/githubProgramming";
import type { ProgrammingBlock, ProgrammingMaterial, ProgrammingTask } from "../../../../lib/programming/catalog";

export const prerender = false;

function redirect(location: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
    },
  });
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseBlocks(formData: FormData): ProgrammingBlock[] {
  const types = formData.getAll("blockType").map(String);
  const titles = formData.getAll("blockTitle").map(String);
  const contents = formData.getAll("blockContent").map(String);
  const languages = formData.getAll("blockLanguage").map(String);
  const blocks: ProgrammingBlock[] = [];

  for (let i = 0; i < types.length; i += 1) {
    const type = types[i];
    const title = titles[i]?.trim() || undefined;
    const content = contents[i]?.trim() ?? "";

    if (!content) continue;

    if (type === "code") {
      blocks.push({
        type: "code",
        title,
        language: languages[i]?.trim() || "text",
        code: content,
      });
    } else {
      blocks.push({ type: "text", title, content });
    }
  }

  return blocks;
}

function parseTasks(formData: FormData): ProgrammingTask[] {
  const questions = formData.getAll("taskQuestion").map(String);
  const answers = formData.getAll("taskAnswer").map(String);
  const tasks: ProgrammingTask[] = [];

  for (let i = 0; i < questions.length; i += 1) {
    const question = questions[i]?.trim();
    const answer = answers[i]?.trim();

    if (question && answer) {
      tasks.push({ question, answer });
    }
  }

  return tasks;
}

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
  try {
    const isAdmin = await isAdminRequest(cookies);

    if (!isAdmin) {
      return redirect("/admin/login");
    }

    const formData = await request.formData();
    const oldId = getString(formData, "oldId");
    const lang = getString(formData, "lang") as "ru" | "en";
    const sectionId = getString(formData, "sectionId");
    const slug = slugify(getString(formData, "slug"));
    const title = getString(formData, "title");
    const description = getString(formData, "description");
    const order = Number(getString(formData, "order") || "1");
    const topics = getString(formData, "topics")
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean);

    if (!oldId || !lang || !sectionId || !slug || !title || !description) {
      return redirect(`/admin/programming/edit/${oldId || ""}/?error=missing-fields`);
    }

    const blocks = parseBlocks(formData);

    if (blocks.length === 0) {
      return redirect(`/admin/programming/edit/${oldId}/?error=no-blocks`);
    }

    const tasks = parseTasks(formData);
    const newId = `${lang}-${sectionId}-${slug}`;
    const now = new Date().toISOString().slice(0, 10);

    const { data, sha } = await readProgrammingMaterialsFromGitHub<ProgrammingMaterial[]>();
    const index = data.findIndex((material) => material.id === oldId);

    if (index === -1) {
      return redirect("/admin/programming/?error=material-not-found");
    }

    if (newId !== oldId && data.some((material) => material.id === newId)) {
      return redirect(`/admin/programming/edit/${oldId}/?error=duplicate-id`);
    }

    const previous = data[index];

    data[index] = {
      ...previous,
      id: newId,
      lang,
      sectionId,
      slug,
      title,
      description,
      topics,
      order: Number.isFinite(order) ? order : 1,
      blocks,
      tasks,
      updatedAt: now,
    };

    await writeProgrammingMaterialsToGitHub(data, sha, `Update programming material: ${title}`);

    return redirect(`/admin/programming/${sectionId}/?updated=1`);
  } catch (error) {
    console.error("Update programming material error:", error);
    return redirect("/admin/programming/?error=server-error");
  }
}
