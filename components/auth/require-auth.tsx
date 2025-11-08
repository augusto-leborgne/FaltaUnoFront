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
  console.log("🔐🔐🔐 RequireAuth RENDERIZADO 🔐🔐🔐", {
    allowIncomplete,
    allowUnverified,
    allowNoPhone
  })
  
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  useEffect(() => {
    console.log(`🔐 [RequireAuth:${pathname}] useEffect disparado`, {
      loading,
      hasUser: !!user,
      userEmail: user?.email,
      allowIncomplete,
      allowNoPhone
    })
    
    if (loading) {
      logger.log(`[RequireAuth:${pathname}] Loading...`)
      console.log(`🔐 [RequireAuth:${pathname}] Loading... retornando`)
      return
    }

    const token = AuthService.getToken()
    if (!token || AuthService.isTokenExpired(token)) {
      logger.log(`[RequireAuth:${pathname}] Token inválido o expirado, redirigiendo a /login`)
      console.log(`🔐 [RequireAuth:${pathname}] Token inválido, redirigiendo a /login`)
      AuthService.logout()
      router.replace("/login")
      return
    }

    // Si no hay user todavía, quedate (render del loader abajo)
    if (!user) {
      logger.log(`[RequireAuth:${pathname}] Esperando usuario...`)
      console.log(`🔐 [RequireAuth:${pathname}] No user, esperando...`)
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
    
    console.log(`🔐 [RequireAuth:${pathname}] Usuario verificado:`, {
      email: user.email,
      perfilCompleto: user.perfilCompleto,
      celular: user.celular,
      hasBasicFields: !!(user.nombre && user.apellido)
    })

    // ⚡ CRÍTICO: Validación mejorada de perfil incompleto
    // Considerar incompleto si perfilCompleto no es true O faltan campos básicos
    const hasBasicFields = user.nombre && user.apellido
    const isProfileComplete = user.perfilCompleto === true
    
    console.log(`🔐 [RequireAuth:${pathname}] Verificando perfil:`, {
      hasBasicFields,
      isProfileComplete,
      allowIncomplete,
      shouldCheckProfile: !allowIncomplete
    })
    
    // ⚡ SIMPLIFICADO: No llamar refreshUser() aquí - AuthProvider ya lo hace en background
    // Evitamos race conditions y loops infinitos
    if (!allowIncomplete && (!isProfileComplete || !hasBasicFields)) {
      if (pathname !== "/profile-setup") {
        console.log(`🔐 [RequireAuth:${pathname}] 🚨 Perfil incompleto - REDIRIGIENDO A /profile-setup`)
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
    console.log(`🔐 [RequireAuth:${pathname}] Verificando celular:`, {
      hasCelular,
      celular: user.celular,
      allowNoPhone,
      shouldCheckPhone: !allowNoPhone
    })
    
    if (!allowNoPhone && !hasCelular) {
      if (pathname !== "/phone-verification") {
        console.log(`🔐 [RequireAuth:${pathname}] 🚨 REDIRIGIENDO A /phone-verification (sin celular)`)
        logger.log(`[RequireAuth:${pathname}] Celular faltante, redirigiendo a /phone-verification`)
        router.replace("/phone-verification")
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

    console.log(`🔐 [RequireAuth:${pathname}] ✅ TODAS LAS VERIFICACIONES PASARON - Permitiendo acceso`)
    logger.log(`[RequireAuth:${pathname}] ✓ Verificación completa, permitiendo acceso`)
    // Importante: no redirigir a "/" nunca acá.
  }, [user, loading, router, pathname, allowIncomplete, allowUnverified, allowNoPhone])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  return <>{children}</>
}