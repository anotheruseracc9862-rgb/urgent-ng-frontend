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
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/:path*`,
      },
    ];
  },
};

export default nextConfig;

