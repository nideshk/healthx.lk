import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "si"],
  defaultLocale: "en",
  localeDetection: false, // 👈 THIS LINE
});

export const config = {
  matcher: ["/dashboard/:path*", "/appointment/:path*"],
};
