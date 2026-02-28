import type { NextConfig } from "next";
import nextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = nextIntlPlugin(
  path.resolve("./src/i18n.ts")
);

const nextConfig: NextConfig = {
  typedRoutes: false,

  output: "standalone", // ✅ important for Vercel tracing
};

export default withNextIntl(nextConfig);