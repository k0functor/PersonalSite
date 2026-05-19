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
  lang: "ru";
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
