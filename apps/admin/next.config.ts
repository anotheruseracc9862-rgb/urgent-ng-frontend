import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@urgent/ui",
    "@urgent/api-client",
    "@urgent/schemas",
    "@urgent/types",
    "@urgent/utils",
    "@urgent/config",
  ],
};

export default nextConfig;
