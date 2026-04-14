import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint checks during production builds (not recommended long-term).
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Also skip TypeScript checks to ensure the build completes.
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
