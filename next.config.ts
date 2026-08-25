import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for a small production Docker image. The
  // standalone server also hosts the Node-runtime BFF routes (/api/hermes/*),
  // which proxy HermesMQ's REST API server-side (the secret boundary).
  output: "standalone",
};

export default nextConfig;
