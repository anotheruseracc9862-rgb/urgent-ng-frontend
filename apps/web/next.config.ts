import type { NextConfig } from "next";
import { env } from "./lib/env";

const nextConfig: NextConfig = {
  experimental: {
    // Barrel packages: import only the components and icons a route uses.
    optimizePackageImports: ["@urgent/ui", "lucide-react"],
  },
  transpilePackages: [
    "@urgent/ui",
    "@urgent/api-client",
    "@urgent/schemas",
    "@urgent/types",
    "@urgent/utils",
    "@urgent/config",
  ],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
