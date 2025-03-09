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
      config.externals = [...config.externals, 
        'gif.js.optimized',
        'three', 
        '@react-three/fiber', 
        '@react-three/drei'
      ];
    }
    
    // Provide fallbacks for browser modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      'gif.js.optimized': false,
    };
    
    // Add a specific rule to ignore these modules completely during build analysis
    config.module.rules.push({
      test: /three|@react-three\/fiber|@react-three\/drei|gif\.js\.optimized/,
      use: 'null-loader',
      include: /[\\/]node_modules[\\/]/,
    });
    
    return config;
  },
};

module.exports = nextConfig; 