// src/i18n.ts
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !["en", "si"].includes(locale)) {
    locale = "en";
  }

  return {
    locale,
    timeZone: "Asia/Colombo",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
