import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas públicas que NO requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/oauth',
  '/verification',
  '/api',
  '/_next',
  '/favicon.ico',
  '/images',
]

// Rutas que requieren autenticación pero NO perfil completo
const AUTH_ONLY_ROUTES = [
  '/profile-setup',
  '/verification',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Permitir rutas públicas y assets
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Verificar si hay token en las cookies (Next.js maneja cookies automáticamente)
  const token = request.cookies.get('authToken')?.value || 
                // Fallback: intentar leer del header Authorization
                request.headers.get('authorization')?.replace('Bearer ', '')

  // Si no hay token, redirigir a login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verificar si el token está expirado
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000
    
    if (Date.now() >= exp) {
      // Token expirado, redirigir a login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      loginUrl.searchParams.set('expired', 'true')
      
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('authToken')
      return response
    }
  } catch (error) {
    // Token inválido, redirigir a login
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('authToken')
    return response
  }

  // Token válido, permitir acceso
  return NextResponse.next()
}

// Configurar qué rutas deben pasar por el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
}
