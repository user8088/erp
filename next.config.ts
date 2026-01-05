import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://erp-server-main-xegmvt.laravel.cloud/api/:path*',
      },
      {
        source: '/sanctum/csrf-cookie',
        destination: 'https://erp-server-main-xegmvt.laravel.cloud/sanctum/csrf-cookie',
      },
    ];
  },
};

export default nextConfig;
