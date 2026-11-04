"use client";

import { useLocale, useTranslations } from "next-intl";

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

type ServiceCardSource = {
  slug?: string | null;
  name?: string | null;
  sin_slug?: string | null;
};

/**
 * The OB/GYN service is stored under the gynecologist slug, but its catalog
 * name is "Obstetrician/ Gynecologist (OB/GYN)". The specialties.gynecologist
 * string is only "Gynaecologist", so service cards must keep the DB name.
 */
const SERVICE_CARD_LABEL_EXCLUSIONS = new Set([
  "gynecologist",
  "gynaecologist",
]);

/** Service-card title: specialties.<slug> when that key exists, otherwise the DB name / sin_slug. */
export function formatServiceCardLabel(
  service: ServiceCardSource,
  locale: string,
  t?: SpecialtyTranslator
): string {
  const slug = (service.slug ?? "").trim().toLowerCase();
  const dbName = (service.name ?? "").trim();
  const sinSlug = (service.sin_slug ?? "").trim();

  if (slug && !SERVICE_CARD_LABEL_EXCLUSIONS.has(slug) && t?.has(slug)) {
    return t(slug);
  }

  if (locale === "si" && sinSlug) return sinSlug;
  if (dbName) return dbName;
  return slug ? titleCaseSpecialty(slug) : "";
}

export function useServiceCardLabel() {
  const t = useTranslations("specialties");
  const locale = useLocale();
  return (service: ServiceCardSource) =>
    formatServiceCardLabel(service, locale, t);
}
