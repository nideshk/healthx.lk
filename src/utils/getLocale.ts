export function getLocaleFromCookie() {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/lang=(en|si)/);
  return (match?.[1] as "en" | "si") || "en";
}
