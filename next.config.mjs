/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // DISABLED standalone due to pnpm symlink issues in Cloud Run build
  // output: 'standalone',
  
  // ⚡ PERFORMANCE OPTIMIZATIONS
  // Compile only essential packages (reduce bundle size)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // Enable SWC minification (faster than Terser)
  swcMinify: true,
  
  // Optimize font loading
  optimizeFonts: true,
  
  // Compress pages (gzip/brotli)
  compress: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // ❌ NO SE NECESITA PROXY - Cloud Run backend tiene HTTPS
  // El frontend se comunica directamente con https://faltauno-backend-169771742214.us-central1.run.app
  // Sin Mixed Content errors porque ambos usan HTTPS
  
  // Configure Next.js Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'faltauno-backend-pg4rwegknq-uc.a.run.app',
        pathname: '/api/usuarios/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/api/usuarios/**',
      },
    ],
    formats: ['image/avif', 'image/webp'], // AVIF first (better compression)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60, // Cache images for 60 seconds minimum
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Use BUILD_ID from environment (set during Docker build with timestamp)
  // This ensures each deployment has a unique ID for version checking
  generateBuildId: async () => {
    return process.env.BUILD_ID || `build-${Date.now()}`
  },
  
  // Add cache control headers - optimized for dynamic content
  async headers() {
    return [
      {
        // API routes and dynamic pages - no cache
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        // Dynamic user pages - short cache with revalidation
        source: '/(home|profile|matches|search|notifications)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, must-revalidate',
          },
        ],
      },
      {
        // Static assets - long cache with immutable
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Images and media - cache with revalidation
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=43200',
          },
        ],
      },
      {
        // Public static files - cache for 1 hour
        source: '/:path*.{jpg,jpeg,png,gif,svg,ico,webp}',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
  
  // Explicit env configuration for build time AND runtime
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_BUILD_ID: process.env.BUILD_ID || `build-${Date.now()}`,
  },
  
  // Make runtime config available to client
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_BUILD_ID: process.env.BUILD_ID || `build-${Date.now()}`,
  },
  
  // Experimental features
  experimental: {
    // ⚡ PERFORMANCE: Optimize package imports
    // REMOVED 'lucide-react' due to barrel export issues in Docker production builds
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'date-fns',
      'recharts',
    ],
    
    // ⚡ Optimize server components
    serverComponentsExternalPackages: ['@radix-ui'],
  },
  
  // Ensure lucide-react is properly transpiled in all environments
  transpilePackages: ['lucide-react'],
  
  // ⚡ Webpack optimizations for production
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable aggressive code splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            // Separate chunk for common components
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            },
            // Radix UI separate chunk (large library)
            radix: {
              name: 'radix',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // React & Next.js core
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              chunks: 'all',
              priority: 40,
            },
          },
          maxInitialRequests: 25,
          minSize: 20000,
        },
      }
    }
    
    return config
  },
}

export default nextConfig