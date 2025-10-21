"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthService } from "@/lib/auth"

export function RedirectIfAuthenticated({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // ✅ CORREGIDO: Verificar tanto token como usuario
    const token = AuthService.getToken()
    
    console.log("[RedirectIfAuthenticated] Checking - Loading:", loading, "User:", user ? "YES" : "NO", "Token:", token ? "YES" : "NO")
    
    if (loading) {
      console.log("[RedirectIfAuthenticated] Still loading, waiting...")
      return
    }

    // ✅ Solo redirigir si AMBOS existen
    if (user && token && !AuthService.isTokenExpired(token)) {
      console.log("[RedirectIfAuthenticated] User authenticated, redirecting to /home")
      router.replace("/home")
    } else {
      console.log("[RedirectIfAuthenticated] Not authenticated or invalid session, showing page")
    }
  }, [user, loading, router])

  // Mostrar nada mientras se verifica
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return <>{children}</>
}