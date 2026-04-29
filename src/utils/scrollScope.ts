export type ScrollScope = "scroll" | "public";

const SCROLL_PREFIX = "__scroll__::";
const PUBLIC_PREFIX = "__public__::";

const stripKnownPrefix = (tag: string): string => {
  if (typeof tag !== "string") return "";
  if (tag.startsWith(SCROLL_PREFIX)) return tag.slice(SCROLL_PREFIX.length);
  if (tag.startsWith(PUBLIC_PREFIX)) return tag.slice(PUBLIC_PREFIX.length);
  return tag;
};

export const toScopedScrollTag = (tag: string, scope: ScrollScope): string => {
  const cleanTag = stripKnownPrefix((tag || "").trim());
  const prefix = scope === "public" ? PUBLIC_PREFIX : SCROLL_PREFIX;
  return `${prefix}${cleanTag}`;
};

export const toDisplayScrollTag = (tag: string): string => {
  return stripKnownPrefix(tag || "");
};

export const isScrollTagInScope = (tag: string, scope: ScrollScope): boolean => {
  const value = tag || "";

  if (scope === "public") {
    return value.startsWith(PUBLIC_PREFIX);
  }

  // Keep legacy (unprefixed) records in Scroll so old data remains visible.
  return value.startsWith(SCROLL_PREFIX) || !value.startsWith(PUBLIC_PREFIX);
};

export const getScrollScopeFromTag = (tag: string): ScrollScope => {
  const value = tag || "";
  if (value.startsWith(PUBLIC_PREFIX)) return "public";
  return "scroll";
};
