/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // ❌ NO SE NECESITA PROXY - Cloud Run backend tiene HTTPS
  // El frontend se comunica directamente con https://faltauno-backend-169771742214.us-central1.run.app
  // Sin Mixed Content errors porque ambos usan HTTPS
}

export default nextConfig