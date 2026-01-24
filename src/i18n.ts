// src/i18n.ts
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => {
  switch (locale) {
    case "si":
      return {
        locale: "si",
        messages: (await import("./messages/si.json")).default,
      };

    case "en":
    default:
      return {
        locale: "en",
        messages: (await import("./messages/en.json")).default,
      };
  }
});
