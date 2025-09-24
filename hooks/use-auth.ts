import { useState, useEffect } from "react"
import { AuthService } from "@/lib/auth"
import { Usuario } from "@/lib/api"

export function useAuth() {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = AuthService.getUser()
    setUser(u)
    setLoading(false)
  }, [])

  return { user, loading }
}