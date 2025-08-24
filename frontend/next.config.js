/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize build performance and reduce memory usage
  experimental: {
    optimizePackageImports: ['lodash', 'date-fns', 'react-icons'],
  },
  
  // Compiler optimizations for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Webpack optimizations to prevent build timeouts
  webpack: (config, { isServer }) => {
    // Optimize chunk splitting to reduce memory usage
    config.optimization.splitChunks = {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        common: {
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    }
    
    // Reduce build memory pressure
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    return config
  },
  
  // Image optimization settings
  images: {
    domains: [], // Add your image domains here if needed
    formats: ['image/webp', 'image/avif'],
  },
  
  // Output settings for better deployment compatibility
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment-specific settings
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig