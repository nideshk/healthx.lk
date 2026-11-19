export function isInHomeType(type: any) {
  if (!type) return false;
  const slug = (type.slug || type.sin_slug || "").toString().toLowerCase();
  if (slug) {
    if (slug === "in-home-visit" || slug === "in-home" || slug.includes("home")) return true;
  }
  const name = (type.name || "").toString().toLowerCase();
  if (name.includes("in-home") || name.includes("home visit") || name.includes("home")) return true;
  return false;
}
