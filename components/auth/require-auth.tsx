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
  /** Permite ver la página aunque no tenga celular */
  allowNoPhone?: boolean
}

export default function RequireAuth({
  children,
  allowIncomplete = false,
  allowUnverified = true,
  allowNoPhone = false,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  useEffect(() => {
    // ⚡ CRITICAL FIX v4: Run when user changes BUT only redirect if NECESSARY
    // Use guards to prevent redirecting FROM the page we're trying to send them TO
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
      celular: user.celular,
      cedulaVerificada: user.cedulaVerificada,
      allowIncomplete,
      allowUnverified,
      allowNoPhone
    })

    // ⚡ CRÍTICO: Validación mejorada de perfil incompleto
    const hasBasicFields = user.nombre && user.apellido
    const isProfileComplete = user.perfilCompleto === true
    
    if (!allowIncomplete && (!isProfileComplete || !hasBasicFields)) {
      if (pathname !== "/profile-setup") {
        logger.log(`[RequireAuth:${pathname}] Perfil incompleto, redirigiendo a /profile-setup`, {
          perfilCompleto: user.perfilCompleto,
          hasBasicFields
        })
        router.replace("/profile-setup")
      }
      return
    }

    // ⚡ NUEVO: Verificar que tenga celular (obligatorio)
    const hasCelular = user.celular && user.celular.trim() !== ""
    
    if (!allowNoPhone && !hasCelular) {
      if (pathname !== "/phone-verification") {
        logger.log(`[RequireAuth:${pathname}] Celular faltante, redirigiendo a /phone-verification`)
        router.replace("/phone-verification")
      }
      return
    }

    if (!allowUnverified && user.perfilCompleto && !user.cedulaVerificada) {
      // TODO: Verificación de cédula deshabilitada temporalmente
    }

    logger.log(`[RequireAuth:${pathname}] ✓ Verificación completa, permitiendo acceso`)
  }, [user, loading, pathname, router, allowIncomplete, allowUnverified, allowNoPhone]) // ⚡ FIX v4: Re-added all deps

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  return <>{children}</>
}