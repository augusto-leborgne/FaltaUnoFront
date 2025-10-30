/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // ❌ NO SE NECESITA PROXY - Cloud Run backend tiene HTTPS
  // El frontend se comunica directamente con https://faltauno-backend-169771742214.us-central1.run.app
  // Sin Mixed Content errors porque ambos usan HTTPS
  
  // Use BUILD_ID from environment (set during Docker build with timestamp)
  // This ensures each deployment has a unique ID for version checking
  generateBuildId: async () => {
    return process.env.BUILD_ID || `build-${Date.now()}`
  },
  
  // Add cache control headers to force fresh content
  async headers() {
    return [
      {
        // Apply to all pages
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // Static assets can have longer cache with ETag validation
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  // Explicit env configuration for build time AND runtime
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  
  // Make runtime config available to client
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  
  // Disable static optimization for pages that need fresh data
  experimental: {
    // Ensure pages are rendered on each request
    isrMemoryCacheSize: 0,
  },
}

export default nextConfig