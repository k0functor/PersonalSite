import { ru } from "./ru";
import { en } from "./en";
import type { Lang } from "../config/navigation";

export const dictionary = {
  ru,
  en,
};

export function getDictionary(lang: Lang) {
  return dictionary[lang];
}