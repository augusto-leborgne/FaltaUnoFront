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

    // ✅ FIX: Solo verificar perfil completo si NO estamos ya en profile-setup
    // Esto previene loops infinitos si profile-setup tiene errores
    if (pathname !== '/profile-setup' && pathname !== '/complete-profile') {
      const user = AuthService.getUser()
      
      // Verificar si el perfil está incompleto
      // Solo redirigir si perfilCompleto es explícitamente false
      if (user && user.perfilCompleto === false) {
        logger.debug('[ProtectedRoute] Perfil incompleto (perfilCompleto=false), redirigiendo a profile-setup')
        router.push('/profile-setup')
        return
      }
      
      // Validación adicional: Si no tiene nombre o apellido, también es incompleto
      if (user && (!user.nombre || !user.apellido)) {
        logger.debug('[ProtectedRoute] Perfil incompleto (faltan campos básicos), redirigiendo a profile-setup')
        router.push('/profile-setup')
        return
      }
    }
  }, [pathname, router])

  return <>{children}</>
}
