export interface TemplateVariantLike {
  id: number;
  tag: string;
  langCode: string[] | string | null | undefined;
  order?: number;
  templateId?: number;
}

export interface LanguageAwareTemplate<T extends TemplateVariantLike> extends T {
  isAvailableInCurrentLang: boolean;
  shareTemplate: T;
  shareLangCode: string;
}

const normalizeText = (value: string) => value.trim().toLowerCase();

const splitLangCodes = (langCode: string | string[] | null | undefined) => {
  if (!langCode) {
    return [];
  }

  if (Array.isArray(langCode)) {
    return langCode.map((value) => value.trim()).filter(Boolean);
  }

  return langCode
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

export const hasLanguageCode = (
  langCode: string | string[] | null | undefined,
  targetLang: string,
) => {
  if (!targetLang) {
    return false;
  }

  return splitLangCodes(langCode).includes(targetLang);
};

const getFirstLangCode = (langCode: string[] | string | null | undefined) =>
  splitLangCodes(langCode)[0] || "";

export const pickLanguageAwareTemplate = <T extends TemplateVariantLike>(
  variants: T[],
  currentLang: string,
  defaultLangCode: string,
): LanguageAwareTemplate<T> | null => {
  if (!variants.length) {
    return null;
  }

  const exactMatch = variants.find((variant) =>
    hasLanguageCode(variant.langCode, currentLang),
  );
  const defaultMatch = variants.find((variant) =>
    hasLanguageCode(variant.langCode, defaultLangCode),
  );

  const displayTemplate = defaultMatch || exactMatch || variants[0];
  const shareTemplate = exactMatch || defaultMatch || variants[0];

  const shareLangCode = exactMatch
    ? currentLang
    : defaultMatch
      ? defaultLangCode
      : getFirstLangCode(shareTemplate.langCode) || defaultLangCode;

  return {
    ...displayTemplate,
    isAvailableInCurrentLang: Boolean(exactMatch),
    shareTemplate,
    shareLangCode,
  };
};

export const groupLanguageAwareTemplates = <T extends TemplateVariantLike>(
  items: T[],
  currentLang: string,
  defaultLangCode: string,
  keySelector: (item: T) => string = (item) => item.tag,
): LanguageAwareTemplate<T>[] => {
  const grouped = new Map<string, T[]>();

  items.forEach((item) => {
    const key = normalizeText(keySelector(item) || "");

    if (!key) {
      return;
    }

    const group = grouped.get(key) || [];
    group.push(item);
    grouped.set(key, group);
  });

  return Array.from(grouped.values())
    .map((group) => pickLanguageAwareTemplate(group, currentLang, defaultLangCode))
    .filter((item): item is LanguageAwareTemplate<T> => item !== null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};
