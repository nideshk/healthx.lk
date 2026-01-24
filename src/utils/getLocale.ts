import { cookies } from "next/headers";

export async function getLocaleFromCookie() {
  const locale = (await cookies()).get("locale")?.value;
  return locale === "si" ? "si" : "en";
}
