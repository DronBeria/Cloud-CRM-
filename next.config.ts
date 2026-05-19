import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "@react-pdf/renderer"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

// Only wrap with Sentry when auth token is provided (production deploys only)
// This avoids the 30-60s overhead on every preview/dev build
if (process.env.SENTRY_AUTH_TOKEN) {
  const { withSentryConfig } = require("@sentry/nextjs");
  module.exports = withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    disableLogger: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    widenClientFileUpload: false,
    automaticVercelMonitors: false,
  });
} else {
  module.exports = nextConfig;
}
