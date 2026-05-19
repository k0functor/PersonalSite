export type IumLang = "ru";

export type IumSheetStatus =
  | "not-started"
  | "in-progress"
  | "partly-solved"
  | "solved"
  | "submitted"
  | "needs-rewrite";

export interface IumSection {
  id: string;
  title: string;
  description: string;
  order: number;
  lang: IumLang;
}

export interface IumSheet {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  topics: string[];
  status: IumSheetStatus;
  sheetPdf: string;
  solutionPdf?: string;
  date: string;
  updatedAt: string;
}

export const statusLabels: Record<IumSheetStatus, string> = {
  "not-started": "не начат",
  "in-progress": "в процессе",
  "partly-solved": "решён частично",
  solved: "решён",
  submitted: "сдан",
  "needs-rewrite": "нужно переписать",
};
