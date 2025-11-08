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
    // ⚡ CRITICAL FIX v4: Run when user changes BUT guard against redirect loops
    // Only redirect if we're NOT already on the target page
    if (loading) {
      return
    }
    
    if (!user) { 
      router.replace("/login"); 
      return 
    }
    
    // ⚡ CRÍTICO: Si el formulario está navegando, NO interferir con el redirect
    if (typeof window !== 'undefined' && sessionStorage.getItem('profileSetupNavigating') === 'true') {
      sessionStorage.removeItem('profileSetupNavigating')
      return
    }
    
    const incomplete = isIncomplete(user)
    
    if (!incomplete) {
      // ⚡ GUARD: Only redirect if we're currently ON /profile-setup
      // This prevents redirecting when user updates their profile elsewhere
      if (typeof window !== 'undefined' && window.location.pathname === '/profile-setup') {
        router.replace("/home")
      }
      return 
    }
  },[user, loading, router]) // ⚡ FIX v4: Re-added all deps

  if (loading) return null
  return <>{children}</>
}
