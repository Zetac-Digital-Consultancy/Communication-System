import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set by the Dockerfile; keeps "npm start" working outside Docker
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
