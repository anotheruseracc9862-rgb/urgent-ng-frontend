import type { NextConfig } from "next";
import { env } from "./lib/env";
import { securityHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev only: lets a phone reach dev assets and HMR through a GitHub/VS Code port-forwarding tunnel.
  allowedDevOrigins: ["**.devtunnels.ms"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "production") }];
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
    return { fallback: [
      {
        source: '/api/v1/admin/:path*',
        destination: `${env.NEXT_PUBLIC_ADMIN_API_URL}/:path*`,
      },
    ] };
  },
};

export default nextConfig;
