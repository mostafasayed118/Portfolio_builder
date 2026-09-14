import { useLanguage } from "@/lib/language";

export function useLocalized() {
  const { lang } = useLanguage();

  function localize<T extends Record<string, unknown>>(
    item: T,
    field: keyof T,
    fallback?: string,
  ): string {
    const arField = `${String(field)}_ar` as keyof T;
    const arValue = lang === "ar" ? item[arField] : undefined;
    const enValue = item[field];
    const value = (arValue || enValue || fallback || "") as string;
    return String(value);
  }

  return { localize };
}
