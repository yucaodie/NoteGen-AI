import type { NextConfig } from 'next';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '*.monkeycode-ai.online'],
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: `${apiBaseUrl}/auth/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
