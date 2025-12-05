/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // DISABLED standalone due to pnpm symlink issues in Cloud Run build
  // output: 'standalone',
  
  // ⚡ PERFORMANCE OPTIMIZATIONS
  // Compile only essential packages (reduce bundle size)
  compiler: {
    // Remove console.log in production, keep errors and warnings
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'] // Keep errors and warnings
    } : false,
  },
  
  // Enable SWC minification (faster than Terser)
  swcMinify: true,
  
  // Optimize font loading
  optimizeFonts: true,
  
  // Compress pages (gzip/brotli)
  compress: true,
  
  // 💰 OPTIMIZACIONES DE PRODUCCION
  productionBrowserSourceMaps: false, // Sin source maps = menos tamaño
  poweredByHeader: false, // Sin header X-Powered-By
  generateEtags: true, // ETags para caché
  
  // 💰 STANDALONE OUTPUT (50% más pequeño en Docker)
  output: 'standalone',
  
  // ❌ NO SE NECESITA PROXY - Cloud Run backend tiene HTTPS
  // El frontend se comunica directamente con https://faltauno-backend-169771742214.us-central1.run.app
  // Sin Mixed Content errors porque ambos usan HTTPS
  
  // 💰 OPTIMIZACION DE IMAGENES ULTRA-ECONOMICA
  images: {
    unoptimized: false,
    loader: 'default',
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
    formats: ['image/avif', 'image/webp'], // AVIF first (mejor compresión 50%+)
    deviceSizes: [640, 750, 828, 1080, 1200], // 💰 Menos tamaños = menos procesamiento
    imageSizes: [16, 32, 48, 64, 96], // 💰 Reducido de [16..256]
    minimumCacheTTL: 86400, // 💰 24 horas (reducir procesamiento)
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
  
  // Experimental features - OPTIMIZED SAFELY
  experimental: {
    // ⚡ SAFE: Optimize package imports for libraries that work well with transformation
    // EXCLUDED: lucide-react, @radix-ui (caused SSR undefined component errors)
    optimizePackageImports: [
      'date-fns',        // ✅ Safe - pure functions, no SSR issues
      'recharts',        // ✅ Safe - chart library, works well with optimization
    ],
    
    // ❌ DISABLED: serverComponentsExternalPackages
    // Conflicted with optimizePackageImports causing module resolution errors
    
    // ❌ DISABLED: turbo mode
    // Still experimental, caused SSR issues with custom loaders
    
    // ⚡ SAFE: Optimize client-side navigation
    optimisticClientCache: false, // Keep disabled as we have custom caching
    
    // ⚡ SAFE: Partial prerendering - keep disabled for stability
    ppr: false,
  },
  
  // ❌ DISABLED: transpilePackages for lucide-react
  // Caused double-transformation conflict with optimizePackageImports
  // lucide-react works fine without transpilation in Next.js 14.2.16 + React 18.3.1
  
  // ⚡ Webpack optimizations for production - SAFE MINIMAL CONFIG
  webpack: (config, { dev, isServer }) => {
    // Minimal optimizations to avoid breaking SSR
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
      }
    }
    
    return config
  },
}

export default nextConfig