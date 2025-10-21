// hooks/use-current-user.ts
"use client"

import { useEffect, useState } from "react"
import { AuthService } from "@/lib/auth"
import type { Usuario } from "@/lib/api"

/**
 * Hook para obtener el usuario actual con datos siempre actualizados
 * 
 * A diferencia de useAuth(), este hook:
 * - Escucha eventos de actualización del usuario
 * - Refresca automáticamente cuando hay cambios
 * - Proporciona el usuario normalizado (foto_perfil consistente)
 * 
 * @example
 * ```tsx
 * const { user, loading, refresh } = useCurrentUser()
 * 
 * if (loading) return <Loading />
 * if (!user) return <NotLoggedIn />
 * 
 * return (
 *   <div>
 *     <UserAvatar photo={user.foto_perfil} name={user.nombre} />
 *     <p>{user.nombre} {user.apellido}</p>
 *   </div>
 * )
 * ```
 */
export function useCurrentUser() {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    const currentUser = AuthService.getUser()
    setUser(currentUser)
  }

  useEffect(() => {
    // Cargar usuario inicial
    refresh()
    setLoading(false)

    // Escuchar eventos de actualización
    const handleUserUpdated = ((e: CustomEvent) => {
      console.log("[useCurrentUser] Usuario actualizado")
      setUser(e.detail)
    }) as EventListener

    const handleUserLoggedOut = () => {
      console.log("[useCurrentUser] Usuario cerró sesión")
      setUser(null)
    }

    window.addEventListener('userUpdated', handleUserUpdated)
    window.addEventListener('userLoggedOut', handleUserLoggedOut)

    // Escuchar cambios en storage (sync entre pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        try {
          const newUser = e.newValue ? JSON.parse(e.newValue) : null
          console.log("[useCurrentUser] Storage cambió")
          setUser(newUser)
        } catch {
          setUser(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdated)
      window.removeEventListener('userLoggedOut', handleUserLoggedOut)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return { user, loading, refresh }
}

// Export default for compatibility
export default useCurrentUser