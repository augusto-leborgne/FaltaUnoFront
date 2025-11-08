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

    // ✅ FIX: Solo verificar perfil completo si NO estamos en rutas de onboarding
    // Esto previene loops infinitos en el flujo de completar perfil
    const ONBOARDING_ROUTES = ['/profile-setup', '/phone-verification', '/verification']
    const isOnboardingRoute = ONBOARDING_ROUTES.some(route => pathname?.startsWith(route))
    
    if (!isOnboardingRoute) {
      const user = AuthService.getUser()
      
      // ⚡ CRÍTICO: Validación de perfil incompleto
      // Considerar incompleto si:
      // 1. perfilCompleto es explícitamente false
      // 2. perfilCompleto es undefined/null (nuevo usuario)
      // 3. Faltan campos críticos (nombre o apellido)
      
      const hasBasicFields = user?.nombre && user?.apellido
      const isProfileComplete = user?.perfilCompleto === true
      
      if (user && (!isProfileComplete || !hasBasicFields)) {
        logger.debug('[ProtectedRoute] Perfil incompleto, redirigiendo a profile-setup', {
          perfilCompleto: user.perfilCompleto,
          hasNombre: !!user.nombre,
          hasApellido: !!user.apellido
        })
        router.push('/profile-setup')
        return
      }
      
      // ✅ NUEVO: Prefetch de datos comunes una vez autenticado
      prefetchCommonData()
      if (user?.id) {
        prefetchUserData(user.id)
      }
    }
  }, [pathname, router])

  return <>{children}</>
}
