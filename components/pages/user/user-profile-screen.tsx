"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { API_BASE, normalizeUrl } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"

interface UserProfileScreenProps {
  userId: string
}

interface UserData {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
  posicion?: string
  reputacion?: number
  descripcion?: string
}

export default function UserProfileScreen({ userId }: UserProfileScreenProps) {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log("[UserProfile] Cargando perfil para userId:", userId)
        const url = normalizeUrl(`${API_BASE}/api/usuarios/${userId}`)
        const res = await fetch(url, {
          headers: AuthService.getAuthHeaders(),
        })

        if (!res.ok) throw new Error(`Error ${res.status}: No se pudo cargar el perfil`)
        const data = await res.json()
        console.log("[UserProfile] Datos recibidos:", data)
        setUser(data.data ?? data)
      } catch (err: any) {
        console.error("[UserProfile] Error cargando perfil:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [userId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Cargando perfil...</p>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500">Error: {error || "No se encontró el usuario"}</p>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex flex-col items-center">
        <UserAvatar
          photo={user.foto_perfil}
          fullName={`${user.nombre} ${user.apellido}`}
          className="w-32 h-32"
        />
        <h1 className="text-xl font-semibold mt-2">{`${user.nombre} ${user.apellido}`}</h1>
        {user.posicion && <p className="text-gray-500">{user.posicion}</p>}
        {user.descripcion && <p className="mt-2 text-center text-sm">{user.descripcion}</p>}
      </div>
    </div>
  )
}