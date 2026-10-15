import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { env } from "./lib/env";
import { securityHeaders } from "./lib/security-headers";

const buildConfig = (production: boolean): NextConfig => ({
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders({
          production,
          apiOrigin: env.NEXT_PUBLIC_API_URL,
        }),
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
});

/** The phase, not NODE_ENV, decides: the config can load before NODE_ENV is set. */
const nextConfig = (phase: string): NextConfig => buildConfig(phase !== PHASE_DEVELOPMENT_SERVER);

export default nextConfig;
