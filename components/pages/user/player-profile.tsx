"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { API_BASE, normalizeUrl } from "@/lib/api"
import { AuthService } from "@/lib/auth"

type Usuario = {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
  posicion?: string
  reputacion?: number
  descripcion?: string
  // ...otros campos que ya uses en el JSX
}

export default function PlayerProfile() {
  const router = useRouter()
  const params = useParams() as { id?: string } // /users/[id]
  const userId = params?.id
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!userId) return
      try {
        console.log("[UserProfile] Cargando perfil para userId:", userId)
        const url = normalizeUrl(`${API_BASE}/api/usuarios/${userId}`)
        const res = await fetch(url, { headers: AuthService.getAuthHeaders() })
        if (!res.ok) throw new Error(`Error ${res.status}: No se pudo cargar el perfil`)
        const json = await res.json()
        console.log("[UserProfile] Datos recibidos:", json)
        setUser(json.data ?? json)
      } catch (e: any) {
        console.error("[UserProfile] Error cargando perfil:", e)
        setError(e.message || "No se pudo cargar el perfil")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [userId])

  if (loading) return <div className="flex justify-center items-center h-screen">Cargando...</div>
  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500">Error: {error || "No se encontró el usuario"}</p>
        <button onClick={() => router.back()} className="underline">Volver</button>
      </div>
    )
  }

  // ⬇️ tu JSX original se mantiene tal cual; acá no toco el diseño
  return (
    <div className="p-4">
      {/* ejemplo: */}
      {/* <UserHeader user={user} /> */}
      {/* ...resto del JSX sin cambios... */}
      <div className="text-center">
        <img
          src={user.foto_perfil ? `data:image/png;base64,${user.foto_perfil}` : "/avatar.png"}
          alt="avatar"
          className="w-24 h-24 rounded-full mx-auto"
        />
        <h1 className="text-xl font-semibold mt-2">{user.nombre} {user.apellido}</h1>
        {user.posicion && <p className="text-gray-500">{user.posicion}</p>}
        {user.descripcion && <p className="mt-2 text-sm">{user.descripcion}</p>}
      </div>
    </div>
  )
}