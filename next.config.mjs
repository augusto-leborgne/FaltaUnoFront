/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend_sd-backend-1:8080/api/:path*', // nombre del contenedor backend
      },
      {
        source: '/auth/:path*',
        destination: 'http://backend_sd-backend-1:8080/auth/:path*', // opcional, para auth
      },
    ]
  },
}

export default nextConfig