/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [],
    remotePatterns: [],
    unoptimized: true, // This will ensure we don't run into issues with the Next.js image optimization
  },
  experimental: {
    esmExternals: "loose", // Required to make PixiJS work properly
  },
  webpack: (config) => {
    // Add canvas to externals to avoid SSR issues with WebGL dependencies
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

module.exports = nextConfig; 