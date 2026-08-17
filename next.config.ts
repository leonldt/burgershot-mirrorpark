import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-Output für schlanke Docker-/Server-Deployments
  output: "standalone",
  // Dev-Server: erlaubt lokale E2E-Tests (Playwright) von 127.0.0.1/localhost
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;