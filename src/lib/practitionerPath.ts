const PRACTITIONER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPractitionerId(value: string) {
  return PRACTITIONER_ID.test(value);
}

/** Public profile key. A missing slug uses the practitioner id. */
export function practitionerPublicKey(doctor: {
  slug?: string | null;
  id?: string | null;
}) {
  const slug = (doctor.slug ?? "").trim();
  if (slug) return slug;
  return (doctor.id ?? "").trim();
}

export function practitionerPublicPath(doctor: {
  slug?: string | null;
  id?: string | null;
}) {
  const key = practitionerPublicKey(doctor);
  return key ? `/practitioner/${encodeURIComponent(key)}` : "/";
}
