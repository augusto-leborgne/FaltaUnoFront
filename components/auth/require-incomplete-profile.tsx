// components/auth/require-incomplete-profile.tsx
"use client"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { logger } from "@/lib/logger"

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
  const pathname = usePathname()
  const { user, loading } = useAuth()

  useEffect(()=>{
    // ⚡ CRITICAL FIX v5: Use Next.js pathname instead of window.location for better routing
    if (loading) {
      return
    }
    
    if (!user) {
      logger.log("[RequireIncompleteProfile] No user, redirecting to login")
      router.replace("/login"); 
      return 
    }
    
    // ⚡ CRÍTICO: Si el formulario está navegando, NO interferir con el redirect
    if (typeof window !== 'undefined' && sessionStorage.getItem('profileSetupNavigating') === 'true') {
      logger.log("[RequireIncompleteProfile] Navigation flag detected, clearing and allowing")
      sessionStorage.removeItem('profileSetupNavigating')
      return
    }
    
    const incomplete = isIncomplete(user)
    logger.log("[RequireIncompleteProfile] Profile incomplete check:", { incomplete, pathname })
    
    if (!incomplete) {
      // ⚡ IMPROVED: Use Next.js pathname instead of window.location
      if (pathname === '/profile-setup') {
        logger.log("[RequireIncompleteProfile] Profile complete, redirecting to /home")
        router.replace("/home")
      } else {
        logger.log("[RequireIncompleteProfile] Profile complete but not on /profile-setup, no redirect needed")
      }
      return 
    }
  },[user, loading, router, pathname]) // ⚡ FIX v5: Added pathname to deps

  if (loading) return null
  return <>{children}</>
}
