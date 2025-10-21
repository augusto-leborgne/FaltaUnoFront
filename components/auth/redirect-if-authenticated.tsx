"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthService } from "@/lib/auth"

function isProfileIncomplete(u: any | null | undefined) {
  if (!u) return true
  if (u.perfilCompleto === false) return true
  if (u.perfilCompleto === true) return false
  // heurística básica si no hay flag explícito
  return !(u.nombre && u.apellido && (u.foto_perfil || u.fotoPerfil))
}

function needsIdVerification(u: any | null | undefined) {
  if (!u) return false
  // Campos comunes
  if (u.cedulaVerificada === false) return true
  if (u.documentoVerificado === false) return true
  if (u.identityVerified === false) return true
  // Estructuras anidadas típicas
  const estado = u?.verificacionCedula?.estado ?? u?.verificacionDocumento?.estado
  if (estado && ["PENDIENTE", "RECHAZADA", "PENDING", "FAILED"].includes(String(estado).toUpperCase())) {
    return true
  }
  return false
}

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (loading || redirectedRef.current) return

    const token = AuthService.getToken()
    const validSession = !!token && !AuthService.isTokenExpired(token)

    if (user && validSession) {
      redirectedRef.current = true
      if (isProfileIncomplete(user)) {
        router.replace("/profile-setup")
      } else if (needsIdVerification(user)) {
        router.replace("/verification")
      } else {
        router.replace("/home")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  return <>{children}</>
}

export default RedirectIfAuthenticated