import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
// @ts-expect-error -- no types needed for this import
import withBundleAnalyzer from "@next/bundle-analyzer";

const analyze = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "@react-pdf/renderer"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  typescript: {
    // TODO: Remove once all TypeScript errors are fixed. Currently ignored to
    // avoid blocking deploys while new models are being integrated.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

const configWithAnalyzer = analyze(nextConfig);

export default withSentryConfig(configWithAnalyzer, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  disableLogger: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  automaticVercelMonitors: true,
});
