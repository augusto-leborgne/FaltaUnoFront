"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { logger } from '@/lib/logger'

interface ProtectedRouteProps {
  children: React.ReactNode
}

// Rutas públicas que NO requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/oauth',
  '/verification',
]

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Si es una ruta pública, no validar
    if (PUBLIC_ROUTES.some(route => pathname?.startsWith(route))) {
      return
    }

    // Validar autenticación
    if (!AuthService.isLoggedIn()) {
      logger.debug('[ProtectedRoute] Usuario no autenticado, redirigiendo a login')
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`)
      return
    }

    // Opcional: Verificar si el perfil está completo
    const user = AuthService.getUser()
    if (user && !user.perfilCompleto && pathname !== '/profile-setup') {
      logger.debug('[ProtectedRoute] Perfil incompleto, redirigiendo a profile-setup')
      router.push('/profile-setup')
      return
    }
  }, [pathname, router])

  return <>{children}</>
}
