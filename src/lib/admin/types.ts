export type Lang = "ru" | "en";

export type ContentType =
  | "math-ium"
  | "math-note"
  | "programming-note"
  | "game-devlog"
  | "blog-post";

export interface CreateContentInput {
  type: ContentType;
  lang: Lang;
  title: string;
  description: string;
  slug: string;
  date: string;
  tags: string[];
  body: string;

  course?: string;
  sheetNumber?: number;
  status?: string;
  solved?: number;
  total?: number;

  topic?: string;
  level?: string;
  version?: string;
}
