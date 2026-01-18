import type { NextConfig } from "next";
import nextIntlPlugin from "next-intl/plugin";

// 👇 This MUST point to src/i18n.ts
const withNextIntl = nextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
  },
};

export default withNextIntl(nextConfig);
