import sectionsData from "../../data/ium/sections.json";
import sheetsData from "../../data/ium/sheets.json";
import type { IumSection, IumSheet } from "./types";

export const iumSections = sectionsData as IumSection[];
export const iumSheets = sheetsData as IumSheet[];

export function getSortedIumSections(): IumSection[] {
  return [...iumSections].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "ru"));
}

export function getSectionById(sectionId: string): IumSection | undefined {
  return iumSections.find((section) => section.id === sectionId);
}

export function getSheetsBySection(sectionId: string): IumSheet[] {
  return iumSheets
    .filter((sheet) => sheet.sectionId === sectionId)
    .sort((a, b) => a.id.localeCompare(b.id, "ru", { numeric: true }));
}

export function getSheet(sectionId: string, sheetId: string): IumSheet | undefined {
  return iumSheets.find((sheet) => sheet.sectionId === sectionId && sheet.id === sheetId);
}

export function getSectionSheetCount(sectionId: string): number {
  return iumSheets.filter((sheet) => sheet.sectionId === sectionId).length;
}
