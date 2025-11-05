// components/auth/require-auth.tsx
"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthService } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type Props = {
  children: React.ReactNode
  /** Permite ver la página aunque el perfil no esté completo */
  allowIncomplete?: boolean
  /** Permite ver la página aunque no haya verificado cédula */
  allowUnverified?: boolean
}

export default function RequireAuth({
  children,
  allowIncomplete = false,
  allowUnverified = true,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, refreshUser } = useAuth()

  useEffect(() => {
    if (loading) {
      logger.log(`[RequireAuth:${pathname}] Loading...`)
      return
    }

    const token = AuthService.getToken()
    if (!token || AuthService.isTokenExpired(token)) {
      logger.log(`[RequireAuth:${pathname}] Token inválido o expirado, redirigiendo a /login`)
      AuthService.logout()
      router.replace("/login")
      return
    }

    // Si no hay user todavía, quedate (render del loader abajo)
    if (!user) {
      logger.log(`[RequireAuth:${pathname}] Esperando usuario...`)
      return
    }

    logger.log(`[RequireAuth:${pathname}] Usuario:`, {
      email: user.email,
      perfilCompleto: user.perfilCompleto,
      cedulaVerificada: user.cedulaVerificada,
      allowIncomplete,
      allowUnverified
    })

    // ⚡ CRÍTICO: Validación mejorada de perfil incompleto
    // Considerar incompleto si perfilCompleto no es true O faltan campos básicos
    const hasBasicFields = user.nombre && user.apellido
    const isProfileComplete = user.perfilCompleto === true
    
    if (!allowIncomplete && (!isProfileComplete || !hasBasicFields)) {
      if (pathname !== "/profile-setup") {
        logger.log(`[RequireAuth:${pathname}] Perfil incompleto detectado, revalidando antes de redirigir...`, {
          perfilCompleto: user.perfilCompleto,
          hasBasicFields
        })
        refreshUser().then((freshUser) => {
          if (freshUser) {
            const freshHasBasicFields = freshUser.nombre && freshUser.apellido
            const freshIsComplete = freshUser.perfilCompleto === true
            
            if (!freshIsComplete || !freshHasBasicFields) {
              logger.log(`[RequireAuth:${pathname}] Confirmado: perfil incompleto, redirigiendo a /profile-setup`)
              router.replace("/profile-setup")
            } else {
              logger.log(`[RequireAuth:${pathname}] ✓ Perfil completo tras revalidación, permitiendo acceso`)
            }
          }
        }).catch(err => {
          logger.error(`[RequireAuth:${pathname}] Error revalidando usuario:`, err)
        })
      }
      return
    }

    if (!allowUnverified && user.perfilCompleto && !user.cedulaVerificada) {
      // TODO: Verificación de cédula deshabilitada temporalmente - no redirigir a /verification
      /*
      if (pathname !== "/verification") {
        logger.log(`[RequireAuth:${pathname}] Cédula no verificada, redirigiendo a /verification`)
        router.replace("/verification")
      }
      return
      */
    }

    logger.log(`[RequireAuth:${pathname}] ✓ Verificación completa, permitiendo acceso`)
    // Importante: no redirigir a "/" nunca acá.
  }, [user, loading, router, pathname, allowIncomplete, allowUnverified, refreshUser])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  return <>{children}</>
}