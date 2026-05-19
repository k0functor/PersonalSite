import sectionsData from "../../data/programming/sections.json";
import materialsData from "../../data/programming/materials.json";

export type Lang = "ru" | "en";

export type ProgrammingSection = {
  id: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  order: number;
};

export type ProgrammingBlock =
  | {
      type: "text";
      title?: string;
      content: string;
    }
  | {
      type: "code";
      title?: string;
      language: string;
      code: string;
    };

export type ProgrammingTask = {
  question: string;
  answer: string;
};

export type ProgrammingMaterial = {
  id: string;
  lang: Lang;
  sectionId: string;
  slug: string;
  title: string;
  description: string;
  topics: string[];
  order: number;
  blocks: ProgrammingBlock[];
  tasks: ProgrammingTask[];
  createdAt: string;
  updatedAt: string;
};

export const programmingSections = sectionsData as ProgrammingSection[];
export const programmingMaterials = materialsData as ProgrammingMaterial[];

export function getSortedProgrammingSections(): ProgrammingSection[] {
  return [...programmingSections].sort((a, b) => a.order - b.order);
}

export function getProgrammingSections(): ProgrammingSection[] {
  return getSortedProgrammingSections();
}

export function getProgrammingSectionById(id: string): ProgrammingSection | undefined {
  return programmingSections.find((section) => section.id === id);
}

export function getProgrammingSection(id: string): ProgrammingSection | undefined {
  return getProgrammingSectionById(id);
}

export function getSectionTitle(section: ProgrammingSection, lang: Lang): string {
  return lang === "ru" ? section.titleRu : section.titleEn;
}

export function getSectionDescription(section: ProgrammingSection, lang: Lang): string {
  return lang === "ru" ? section.descriptionRu : section.descriptionEn;
}

export function getProgrammingMaterials(): ProgrammingMaterial[] {
  return [...programmingMaterials];
}

export function getProgrammingMaterialsBySection(sectionId: string, lang?: Lang): ProgrammingMaterial[] {
  return programmingMaterials
    .filter((material) => material.sectionId === sectionId && (!lang || material.lang === lang))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function getProgrammingMaterial(sectionId: string, slug: string, lang: Lang): ProgrammingMaterial | undefined {
  return programmingMaterials.find(
    (material) => material.sectionId === sectionId && material.slug === slug && material.lang === lang,
  );
}

export function getProgrammingMaterialById(id: string): ProgrammingMaterial | undefined {
  return programmingMaterials.find((material) => material.id === id);
}

export function groupMaterialsByTopic(materials: ProgrammingMaterial[]) {
  const groups = new Map<string, ProgrammingMaterial[]>();

  for (const material of materials) {
    const topic = material.topics[0] || "Без темы";
    const current = groups.get(topic) ?? [];
    current.push(material);
    groups.set(topic, current);
  }

  return [...groups.entries()].map(([topic, items]) => ({ topic, items }));
}
