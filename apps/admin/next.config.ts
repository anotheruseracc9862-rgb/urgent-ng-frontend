import type { NextConfig } from "next";
import { env } from "./lib/env";

const nextConfig: NextConfig = {
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
        destination: `${env.NEXT_PUBLIC_ADMIN_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
