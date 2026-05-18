export type Lang = "ru" | "en";

export const routes = [
  {
    key: "about",
    href: "about",
  },
  {
    key: "math",
    href: "math",
  },
  {
    key: "programming",
    href: "programming",
  },
  {
    key: "game",
    href: "game",
  },
  {
    key: "blog",
    href: "blog",
  },
  {
    key: "projects",
    href: "projects",
  },
  {
    key: "shop",
    href: "shop",
  },
  {
    key: "roadmap",
    href: "roadmap",
  },
] as const;

export function getLocalizedPath(lang: Lang, path = "") {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  return cleanPath ? `/${lang}/${cleanPath}/` : `/${lang}/`;
}

export function getLanguageSwitchPath(pathname: string, targetLang: Lang) {
  const switchedPath = pathname.replace(/^\/(ru|en)(?=\/|$)/, `/${targetLang}`);

  if (switchedPath === pathname) {
    return `/${targetLang}/`;
  }

  return switchedPath.endsWith("/") ? switchedPath : `${switchedPath}/`;
}