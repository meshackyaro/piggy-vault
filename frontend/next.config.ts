import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix for multiple lockfiles warning
  outputFileTracingRoot: path.join(__dirname, '../'),
  
  // Webpack configuration for better build performance
  webpack: (config) => {
    // Ignore pino-pretty in client-side builds (it's server-side only)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
