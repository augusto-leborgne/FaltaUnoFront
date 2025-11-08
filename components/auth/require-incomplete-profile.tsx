// components/auth/require-incomplete-profile.tsx
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

const GRACE_WINDOW_MS = 2500 // 2.5s

const isIncomplete = (u:any)=>{
  if (!u) return true

  // Si el backend/cliente marcó explícitamente perfilCompleto=false → incompleto
  if (u.perfilCompleto === false) return true

  // Si acabamos de marcar el perfil como completo localmente, respetar la marca durante una ventana corta
  try {
    const lastUpdated = u.userLastUpdatedAt ?? (typeof window !== 'undefined' ? (() => {
      try { const stored = localStorage.getItem('user'); return stored ? JSON.parse(stored).userLastUpdatedAt : undefined } catch { return undefined }
    })() : undefined)

    if (u.perfilCompleto === true && lastUpdated && (Date.now() - lastUpdated) < GRACE_WINDOW_MS) {
      return false
    }
  } catch (e) {
    // ignore parsing errors
  }

  const hasPhoto = u.hasFotoPerfil ?? u.foto_perfil ?? u.fotoPerfil
  return !(u.nombre && u.apellido && !!hasPhoto)
}

export default function RequireIncompleteProfile({children}:{children:React.ReactNode}) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(()=>{
    if (loading) return
    if (!user) { router.replace("/login"); return }
    
    // ⚡ CRÍTICO: Si el formulario está navegando, NO interferir con el redirect
    if (typeof window !== 'undefined' && sessionStorage.getItem('profileSetupNavigating') === 'true') {
      console.log("[RequireIncompleteProfile] Form está navegando, permitiendo...")
      sessionStorage.removeItem('profileSetupNavigating') // Limpiar flag
      return
    }
    
    if (!isIncomplete(user)) { router.replace("/home"); return }
  },[user,loading,router])

  if (loading) return null
  return <>{children}</>
}
