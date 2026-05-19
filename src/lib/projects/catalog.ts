import projectsData from "../../data/projects/projects.json";

export type ProjectStatus = "done" | "in-progress" | "planned" | "paused";
export type ProjectLang = "ru" | "en";

export interface ProjectItem {
  id: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  status: ProjectStatus;
  order: number;
}

const projects = projectsData as ProjectItem[];

export function getProjects(): ProjectItem[] {
  return [...projects].sort((a, b) => a.order - b.order);
}

export function getProjectById(id: string): ProjectItem | undefined {
  return projects.find((project) => project.id === id);
}

export function getProjectTitle(project: ProjectItem, lang: ProjectLang): string {
  return lang === "ru" ? project.titleRu : project.titleEn;
}

export function getProjectDescription(project: ProjectItem, lang: ProjectLang): string {
  return lang === "ru" ? project.descriptionRu : project.descriptionEn;
}

export function getStatusLabel(status: ProjectStatus, lang: ProjectLang): string {
  const labels: Record<ProjectLang, Record<ProjectStatus, string>> = {
    ru: {
      done: "готово",
      "in-progress": "in progress",
      planned: "запланировано",
      paused: "на паузе",
    },
    en: {
      done: "done",
      "in-progress": "in progress",
      planned: "planned",
      paused: "paused",
    },
  };

  return labels[lang][status];
}
