import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "si"],
  defaultLocale: "en",
  localeDetection: false,
  localePrefix: "never", // 🔴 THIS WAS MISSING
});

export const config = {
  matcher: ["/dashboard/:path*", "/appointment/:path*"],
};
