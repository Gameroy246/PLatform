import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["duckdb", "node-pre-gyp", "sqlite3"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("duckdb");
    }
    return config;
  },
};

export default nextConfig;
