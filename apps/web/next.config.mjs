const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '*.monkeycode-ai.online'],
  reactStrictMode: false,
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: { instrumentationHook: true },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, path: false, os: false };
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@antv/infographic': '/workspace/apps/web/lib/empty-stub.ts',
      };
    }
    return config;
  },
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
