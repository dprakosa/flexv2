import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output ships a self-contained server that the Electron app
  // forks at runtime; Vercel and `next dev` are unaffected.
  output: "standalone",
};

export default nextConfig;
