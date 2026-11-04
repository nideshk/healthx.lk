/**
 * Service slugs and the slugs stored on practitioners do not always match.
 * The paediatrician service is stored as "peadiatrician" while clinicians
 * are tagged "pediatrician". Matching is also case-sensitive in Postgres,
 * and the cancer service slug is "Cancer-specialist".
 *
 * This only widens the read. It does not write specialty data.
 */
const ALIASES: Record<string, string[]> = {
  peadiatrician: ["peadiatrician", "pediatrician", "paediatrician"],
  pediatrician: ["pediatrician", "peadiatrician", "paediatrician"],
  paediatrician: ["paediatrician", "pediatrician", "peadiatrician"],
  gynecologist: ["gynecologist", "gynaecologist"],
  gynaecologist: ["gynaecologist", "gynecologist"],
  "cancer-specialist": ["cancer-specialist", "Cancer-specialist"],
};

export function specialtySlugVariants(slug: string): string[] {
  const raw = slug.trim();
  const lower = raw.toLowerCase();
  return Array.from(new Set([raw, lower, ...(ALIASES[lower] ?? [])]));
}
