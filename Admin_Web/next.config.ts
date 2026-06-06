import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Explicitly set the Turbopack workspace root to avoid inference warnings.
  // Using absolute path ensures correct root detection.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
