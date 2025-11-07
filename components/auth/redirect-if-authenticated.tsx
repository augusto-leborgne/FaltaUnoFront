"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

function isProfileIncomplete(u: any | null | undefined) {
  if (!u) return true
  if (u.perfilCompleto === false) return true
  if (u.perfilCompleto === true) return false
  // heurística básica si no hay flag explícito
  return !(u.nombre && u.apellido && (u.foto_perfil || u.fotoPerfil))
}

function needsIdVerification(u: any | null | undefined) {
  if (!u) return false
  // TODO: Verificación de cédula deshabilitada temporalmente
  return false
  
  /* CÓDIGO ORIGINAL - Mantener para futura implementación
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
  */
}

function needsPhoneVerification(u: any | null | undefined) {
  if (!u) return false
  const celular = u?.celular
  return !celular || celular.trim() === ""
}

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const redirectedRef = useRef(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // ⚡ OPTIMIZACIÓN: Check rápido SOLO de localStorage
    // No hacer fetch al servidor, solo verificar si hay sesión válida
    if (redirectedRef.current) return

    const checkAuth = () => {
      const token = AuthService.getToken()
      const user = AuthService.getUser()
      
      // Si no hay token o está expirado, mostrar login
      if (!token || AuthService.isTokenExpired(token)) {
        setChecking(false)
        return
      }

      // Si hay token válido y usuario en localStorage, redirigir
      if (user) {
        redirectedRef.current = true
        if (isProfileIncomplete(user)) {
          router.replace("/profile-setup")
        } else if (needsPhoneVerification(user)) {
          router.replace("/phone-verification")
        } else if (needsIdVerification(user)) {
          router.replace("/verification")
        } else {
          router.replace("/home")
        }
      } else {
        // Token pero no user - dejar que se muestre login
        setChecking(false)
      }
    }

    checkAuth()
  }, [router])

  // ⚡ Spinner consistente durante check rápido
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  return <>{children}</>
}

export default RedirectIfAuthenticated