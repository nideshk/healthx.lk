import type { NextConfig } from "next";
import nextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = nextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  typedRoutes: false,
  serverExternalPackages: ["pdfkit"],
  output: "standalone", // ✅ important for Vercel tracing
};

export default withNextIntl(nextConfig);