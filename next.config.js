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
    
    // Prevent problematic libraries from being bundled on the server
    if (isServer) {
      config.externals = [
        ...config.externals, 
        'gif.js',
        'gl',
        'pixi.js',
        'glsl-canvas',
        'fabric',
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
    
    return config;
  },
};

module.exports = nextConfig; 