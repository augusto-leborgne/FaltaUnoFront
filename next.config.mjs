/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8080/api/:path*', // nombre del contenedor backend
      },
      {
        source: '/auth/:path*',
        destination: 'http://backend:8080/auth/:path*', // opcional, para auth
      },
    ]
  },
}

export default nextConfig