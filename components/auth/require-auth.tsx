// components/auth/require-auth.tsx
"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthService } from "@/lib/auth"
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
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) {
      console.log(`[RequireAuth:${pathname}] Loading...`)
      return
    }

    const token = AuthService.getToken()
    if (!token || AuthService.isTokenExpired(token)) {
      console.log(`[RequireAuth:${pathname}] Token inválido o expirado, redirigiendo a /login`)
      AuthService.logout()
      router.replace("/login")
      return
    }

    // Si no hay user todavía, quedate (render del loader abajo)
    if (!user) {
      console.log(`[RequireAuth:${pathname}] Esperando usuario...`)
      return
    }

    console.log(`[RequireAuth:${pathname}] Usuario:`, {
      email: user.email,
      perfilCompleto: user.perfilCompleto,
      cedulaVerificada: user.cedulaVerificada,
      allowIncomplete,
      allowUnverified
    })

    // Redirecciones SOLO para completar flujo de registro/verificación
    if (!allowIncomplete && !user.perfilCompleto) {
      if (pathname !== "/profile-setup") {
        console.log(`[RequireAuth:${pathname}] Perfil incompleto, redirigiendo a /profile-setup`)
        router.replace("/profile-setup")
      }
      return
    }

    if (!allowUnverified && user.perfilCompleto && !user.cedulaVerificada) {
      if (pathname !== "/verification") {
        console.log(`[RequireAuth:${pathname}] Cédula no verificada, redirigiendo a /verification`)
        router.replace("/verification")
      }
      return
    }

    console.log(`[RequireAuth:${pathname}] ✓ Verificación completa, permitiendo acceso`)
    // Importante: no redirigir a "/" nunca acá.
  }, [user, loading, router, pathname, allowIncomplete, allowUnverified])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  return <>{children}</>
}