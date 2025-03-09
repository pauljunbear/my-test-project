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
  webpack: (config, { isServer }) => {
    // Add canvas to externals to avoid SSR issues with WebGL dependencies
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    
    // Prevent the GIF.js library from being bundled on the server
    if (isServer) {
      config.externals = [...config.externals, 'gif.js.optimized'];
    }
    
    // Provide fallbacks for browser modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      'gif.js.optimized': false,
    };
    
    return config;
  },
};

module.exports = nextConfig; 