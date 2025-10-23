/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // ❌ NO SE NECESITA PROXY - Cloud Run backend tiene HTTPS
  // El frontend se comunica directamente con https://faltauno-backend-169771742214.us-central1.run.app
  // Sin Mixed Content errors porque ambos usan HTTPS
  
  // Disable caching in production to always get fresh data
  generateBuildId: async () => {
    // Generate unique build ID based on timestamp to force cache busting
    return `build-${Date.now()}`
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