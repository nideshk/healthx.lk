import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "si"],
  defaultLocale: "en",
  localePrefix: "never",
  localeDetection: false,
  localeCookie: false, // 👈
});

export const config = {
  matcher: ["/dashboard/:path*", "/appointment/:path*"],
};
