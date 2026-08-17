import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-Output für schlanke Docker-/Server-Deployments
  output: "standalone",
};

export default nextConfig;