/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // Use standalone output for better compatibility
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
    
    // Prevent problematic libraries from being bundled on the server
    if (isServer) {
      config.externals = [
        ...config.externals, 
        'gif.js',
        'gl',
        'pixi.js',
        'glsl-canvas',
        'fabric',
        'react-modal',
        'react-style-singleton', // Add this to prevent server-side rendering issues
        'react-remove-scroll', // Add this to prevent server-side rendering issues
      ];
    }
    
    // Provide fallbacks for browser modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      'gif.js': !isServer && require.resolve('gif.js'),
    };
    
    // Add a specific rule to ignore browser-only modules during build analysis
    config.module.rules.push({
      test: /gif\.js|gl|glsl-canvas|pixi\.js/,
      use: 'null-loader',
      include: /[\\/]node_modules[\\/]/,
    });

    // Add a specific rule for handling Radix UI components
    config.module.rules.push({
      test: /react-remove-scroll|react-style-singleton/,
      use: 'null-loader',
      include: /[\\/]node_modules[\\/]/,
    });
    
    // Replace the problematic styleSingleton with our own implementation
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-style-singleton': path.resolve(__dirname, './lib/patches/styleSingleton.js'),
    };
    
    return config;
  },
};

module.exports = nextConfig; 