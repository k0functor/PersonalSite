export type BookStatus =
  | "read"
  | "reading"
  | "planned"
  | "paused"
  | "reference";

export interface MathBook {
  title: string;
  author: string;
  status: BookStatus;
  area: string;
  level: "basic" | "intermediate" | "advanced";
  language: "ru" | "en";
  comment: string;
}

export const ruMathBooks: MathBook[] = [
  {
    title: "Математический анализ I",
    author: "В. А. Зорич",
    status: "reading",
    area: "анализ",
    level: "basic",
    language: "ru",
    comment: "Основной источник для строгого университетского анализа.",
  },
  {
    title: "Математический анализ II",
    author: "В. А. Зорич",
    status: "planned",
    area: "анализ",
    level: "intermediate",
    language: "ru",
    comment: "Продолжение анализа: ряды, интегралы, функции нескольких переменных.",
  },
  {
    title: "Algebraic Topology",
    author: "Allen Hatcher",
    status: "planned",
    area: "алгебраическая топология",
    level: "advanced",
    language: "en",
    comment: "Ключевая книга для будущего входа в алгебраическую топологию.",
  },
];

export const enMathBooks: MathBook[] = [
  {
    title: "Mathematical Analysis I",
    author: "V. A. Zorich",
    status: "reading",
    area: "analysis",
    level: "basic",
    language: "ru",
    comment: "My main source for rigorous university-level analysis.",
  },
  {
    title: "Mathematical Analysis II",
    author: "V. A. Zorich",
    status: "planned",
    area: "analysis",
    level: "intermediate",
    language: "ru",
    comment: "A continuation of analysis: series, integrals, and functions of several variables.",
  },
  {
    title: "Algebraic Topology",
    author: "Allen Hatcher",
    status: "planned",
    area: "algebraic topology",
    level: "advanced",
    language: "en",
    comment: "A key book for entering algebraic topology properly.",
  },
];

export const mathBooks = ruMathBooks;