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
] as const;

export function getLocalizedPath(lang: Lang, path = "") {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  return cleanPath ? `/${lang}/${cleanPath}/` : `/${lang}/`;
}

export function getLanguageSwitchPath(pathname: string, targetLang: Lang) {
  const normalizedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;

  const isIumPath = /^\/(ru|en)\/math\/ium(\/|$)/.test(normalizedPath);

  if (isIumPath) {
    return `/${targetLang}/math/ium/`;
  }

  const switchedPath = normalizedPath.replace(
    /^\/(ru|en)(?=\/|$)/,
    `/${targetLang}`
  );

  if (switchedPath === normalizedPath) {
    return `/${targetLang}/`;
  }

  return switchedPath;
}
