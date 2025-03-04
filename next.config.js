/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [],
    remotePatterns: [],
    unoptimized: true, // This will ensure we don't run into issues with the Next.js image optimization
  }
};

module.exports = nextConfig; 