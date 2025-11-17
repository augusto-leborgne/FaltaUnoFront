"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { prefetchCommonData, prefetchUserData } from '@/lib/prefetch'

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

// Rutas que requieren autenticación pero NO requieren verificación de celular
const AUTH_ONLY_ROUTES = [
  '/phone-verification',
  '/forgot-password',
  '/reset-password',
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

    // Si es una ruta que solo requiere autenticación (como phone-verification), no validar celular
    if (AUTH_ONLY_ROUTES.some(route => pathname?.startsWith(route))) {
      return
    }

    // ✅ VERIFICACIÓN OBLIGATORIA: Validar que el celular esté verificado
    // Excepción: Admin users pueden acceder a rutas de admin sin verificación de celular
    const isAdminRoute = pathname?.startsWith('/admin');
    const isAdminUser = user?.rol === 'ADMIN';
    
    if (!user?.celularVerificado && !(isAdminRoute && isAdminUser)) {
      logger.debug('[ProtectedRoute] Celular no verificado, redirigiendo a phone-verification')
      router.push('/phone-verification')
      return
    }

    // ✅ IMPORTANTE: NO validar perfilCompleto aquí
    // Cada página usa RequireAuth con sus propios props (allowIncomplete, etc.)
    // Si validamos aquí, causamos loops infinitos en el flujo de onboarding
    
    // ✅ Prefetch de datos comunes una vez autenticado
    prefetchCommonData()
    if (user?.id) {
      prefetchUserData(user.id)
    }
  }, [pathname, router])

  return <>{children}</>
}
