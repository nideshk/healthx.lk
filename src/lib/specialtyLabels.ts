"use client";

import { useTranslations } from "next-intl";

type SpecialtyTranslator = {
  has: (key: string) => boolean;
  (key: string): string;
};

/** Title-case fallback for a specialty slug that has no translated label. */
export function titleCaseSpecialty(slug: string): string {
  return slug
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatSpecialtyLabel(
  slug: string,
  t?: SpecialtyTranslator
): string {
  const key = slug.trim().toLowerCase();
  if (!key) return "";
  if (t?.has(key)) return t(key);
  return titleCaseSpecialty(key);
}

export function formatSpecialtyList(
  value: unknown,
  t?: SpecialtyTranslator,
  separator = ", "
): string {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return items
    .map((item) => formatSpecialtyLabel(String(item), t))
    .filter(Boolean)
    .join(separator);
}

export function useFormatSpecialties() {
  const t = useTranslations("specialties");
  return (value: unknown, separator = ", ") =>
    formatSpecialtyList(value, t, separator);
}
