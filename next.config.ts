import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Permite probar en el celular por la IP de la red local con `next dev`.
  allowedDevOrigins: ["192.168.1.44"],
  experimental: {
    agentFeedback: true,
    agentUpgrade: "security",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
