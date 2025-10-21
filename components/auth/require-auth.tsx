"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

function isProfileIncomplete(u: any | null | undefined) {
  if (!u) return true
  if (u.perfilCompleto === false) return true
  if (u.perfilCompleto === true) return false
  return !(u.nombre && u.apellido && (u.foto_perfil || u.fotoPerfil))
}

function needsIdVerification(u: any | null | undefined) {
  if (!u) return false
  if (u.cedulaVerificada === false) return true
  if (u.documentoVerificado === false) return true
  if (u.identityVerified === false) return true
  const estado = u?.verificacionCedula?.estado ?? u?.verificacionDocumento?.estado
  if (estado && ["PENDIENTE", "RECHAZADA", "PENDING", "FAILED"].includes(String(estado).toUpperCase())) {
    return true
  }
  return false
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const [canRender, setCanRender] = useState(false)

  useEffect(() => {
    if (loading) {
      setCanRender(false)
      return
    }

    // No autenticado -> /login
    if (!user) {
      setCanRender(false)
      router.replace("/login")
      return
    }

    const incomplete = isProfileIncomplete(user)
    const needsVerification = !incomplete && needsIdVerification(user)

    // Reglas de ruteo
    if (incomplete && pathname !== "/profile-setup") {
      setCanRender(false)
      router.replace("/profile-setup")
      return
    }

    if (needsVerification && pathname !== "/verification") {
      setCanRender(false)
      router.replace("/verification")
      return
    }

    // Evitar que vuelvan a profile-setup/verif cuando ya no corresponde
    if (!incomplete && pathname === "/profile-setup") {
      setCanRender(false)
      router.replace(needsVerification ? "/verification" : "/home")
      return
    }

    if (!needsVerification && pathname === "/verification") {
      if (incomplete) {
        setCanRender(false)
        router.replace("/profile-setup")
        return
      }
      setCanRender(false)
      router.replace("/home")
      return
    }

    setCanRender(true)
  }, [user, loading, router, pathname])

  if (!canRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">{loading ? "Verificando acceso..." : "Redirigiendo..."}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}