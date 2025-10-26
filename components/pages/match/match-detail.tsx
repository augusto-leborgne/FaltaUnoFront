"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { API_BASE, normalizeUrl } from "@/lib/api"
import { AuthService } from "@/lib/auth"

type Partido = {
  id: string
  tipo: string
  fecha: string
  organizador?: {
    id: string
    nombre: string
    apellido: string
    foto_perfil?: string
  }
  // ...cualquier otro campo existente que ya uses en el JSX
}

export default function MatchDetail() {
  const router = useRouter()
  const params = useSearchParams()
  const partidoId = params.get("id") // o como obtengas el ID (de ruta/prop)
  const [match, setMatch] = useState<Partido | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMatch = useCallback(async () => {
    if (!partidoId) return
    try {
      console.log("[MatchDetail] Cargando partido:", partidoId)
      const url = normalizeUrl(`${API_BASE}/api/partidos/${partidoId}`)
      console.log("[API] GET", url)
      const res = await fetch(url, { headers: AuthService.getAuthHeaders() })
      if (!res.ok) throw new Error("Error al obtener el partido")
      const body = await res.json()
      console.log("[API] ✓", url, "completado")
      console.log("[PartidoAPI.get] Respuesta raw:", body)
      setMatch(body.data ?? body)
    } catch (e: any) {
      console.error("[PartidoAPI.get] Error capturado:", e)
      setError(e.message || "Error al obtener el partido")
    } finally {
      setLoading(false)
    }
  }, [partidoId])

  useEffect(() => {
    loadMatch()
  }, [loadMatch])

  const goOrganizer = () => {
    if (!match?.organizador?.id) return
    const uid = match.organizador.id
    console.log("[MatchDetail] Click en organizador, ID:", uid)
    console.log("[MatchDetail] Organizador completo:", match.organizador)
    // navega a la página de usuario (ruta del front), pero NO golpees /api local
    router.push(`/users/${uid}`)
  }

  if (loading) return <div>Cargando...</div>
  if (error || !match) return <div className="text-red-500">Error: {error}</div>

  // ⬇️ tu JSX original se mantiene igual; solo asegúrate de que el onClick del organizador llame a goOrganizer
  return (
    <div className="p-4">
      {/* ...tu UI existente... */}
      {/* ejemplo de botón/link al organizador */}
      <button onClick={goOrganizer} className="underline">
        Ver organizador
      </button>
      {/* ...resto del JSX sin cambios... */}
    </div>
  )
}