"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Clock, MapPin, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"

interface Match {
  id: string
  tipoPartido: string
  genero: string
  nivel?: string
  fecha: string
  hora: string
  nombreUbicacion: string
  cantidadJugadores: number
  jugadoresActuales: number
  precioPorJugador: number
  duracionMinutos: number
  estado: string
  organizadorId: string
}

export function MyMatchesScreen() {
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<"Creados" | "Inscriptos">("Creados")
  const [createdMatches, setCreatedMatches] = useState<Match[]>([])
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const currentUser = AuthService.getUser()

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    try {
      setLoading(true)
      setError("")

      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      const user = AuthService.getUser()
      if (!user?.id) {
        throw new Error("Usuario no encontrado")
      }

      console.log("[MyMatches] Cargando partidos del usuario:", user.id)

      // Cargar partidos del usuario
      const response = await fetch(`/api/partidos/usuario/${user.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      console.log("[MyMatches] Status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[MyMatches] Error response:", errorText)
        
        // Si es 404, significa que no hay partidos - no es un error
        if (response.status === 404) {
          console.log("[MyMatches] No se encontraron partidos")
          setCreatedMatches([])
          setJoinedMatches([])
          return
        }
        
        // Si es 500, mostrar arrays vacíos sin mensaje de error
        if (response.status === 500) {
          console.warn("[MyMatches] Error 500 del servidor, mostrando vacío")
          setCreatedMatches([])
          setJoinedMatches([])
          return
        }
        
        throw new Error(`Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log("[MyMatches] Respuesta:", result)

      // Manejar diferentes formatos de respuesta
      let partidos: any[] = []
      
      if (Array.isArray(result)) {
        partidos = result
      } else if (result.data && Array.isArray(result.data)) {
        partidos = result.data
      } else if (result.data && typeof result.data === 'object') {
        partidos = result.data.items || result.data.content || []
      } else {
        console.warn("[MyMatches] Formato inesperado:", result)
        partidos = []
      }

      console.log("[MyMatches] Partidos recibidos:", partidos.length)

      // Normalizar partidos
      const normalizedMatches = partidos.map((p: any) => ({
        id: p.id,
        tipoPartido: p.tipoPartido || p.tipo_partido || "FUTBOL_5",
        genero: p.genero || "Mixto",
        nivel: p.nivel || "INTERMEDIO",
        fecha: p.fecha,
        hora: p.hora,
        nombreUbicacion: p.nombreUbicacion || p.nombre_ubicacion || "",
        cantidadJugadores: p.cantidadJugadores || p.cantidad_jugadores || 10,
        jugadoresActuales: p.jugadoresActuales || p.jugadores_actuales || 0,
        precioPorJugador: p.precioPorJugador || p.precio_por_jugador || 0,
        duracionMinutos: p.duracionMinutos || p.duracion_minutos || 90,
        estado: p.estado || "PENDIENTE",
        organizadorId: p.organizadorId || p.organizador_id || ""
      }))

      // Separar en creados vs inscritos
      const created = normalizedMatches.filter((p: Match) => p.organizadorId === user.id)
      const joined = normalizedMatches.filter((p: Match) => p.organizadorId !== user.id)

      // Ordenar por fecha (más recientes primero)
      const sortByDate = (a: Match, b: Match) => {
        try {
          const dateA = new Date(`${a.fecha}T${a.hora}`)
          const dateB = new Date(`${b.fecha}T${b.hora}`)
          return dateB.getTime() - dateA.getTime()
        } catch {
          return 0
        }
      }

      console.log("[MyMatches] Creados:", created.length, "Inscritos:", joined.length)

      setCreatedMatches(created.sort(sortByDate))
      setJoinedMatches(joined.sort(sortByDate))

    } catch (err) {
      console.error("[MyMatches] Error:", err)
      // No mostrar error si es un problema de carga simple
      // Solo mantener arrays vacíos
      setCreatedMatches([])
      setJoinedMatches([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMatch = () => {
    router.push("/create-match")
  }

  const handleMatchClick = (match: Match) => {
    if (activeTab === "Creados" && match.organizadorId === currentUser?.id) {
      router.push(`/my-matches/${match.id}`)
    } else {
      router.push(`/matches/${match.id}`)
    }
  }

  const formatMatchType = (type: string) => {
    return type.replace("FUTBOL_", "F")
  }

  const formatLevel = (level?: string) => {
    if (!level) return "Intermedio"
    
    const levelMap: Record<string, string> = {
      "PRINCIPIANTE": "Principiante",
      "INTERMEDIO": "Intermedio",
      "AVANZADO": "Avanzado",
      "PROFESIONAL": "Profesional"
    }
    return levelMap[level] || level
  }

  const formatDate = (dateString: string, timeString: string) => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      today.setHours(0, 0, 0, 0)
      tomorrow.setHours(0, 0, 0, 0)
      const compareDate = new Date(date)
      compareDate.setHours(0, 0, 0, 0)

      const time = timeString.substring(0, 5)

      if (compareDate.getTime() === today.getTime()) {
        return `Hoy ${time}`
      } else if (compareDate.getTime() === tomorrow.getTime()) {
        return `Mañana ${time}`
      } else {
        const weekday = date.toLocaleDateString("es-ES", { weekday: "long" })
        const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
        return `${formattedWeekday} ${time}`
      }
    } catch {
      return `${dateString} ${timeString}`
    }
  }

  const getStatusBadge = (estado: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      "CONFIRMADO": { label: "Confirmado", className: "bg-green-100 text-green-800" },
      "CANCELADO": { label: "Cancelado", className: "bg-red-100 text-red-800" },
      "COMPLETADO": { label: "Completado", className: "bg-blue-100 text-blue-800" },
      "PENDIENTE": { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
    }

    const status = statusMap[estado] || statusMap["PENDIENTE"]

    return (
      <Badge className={`${status.className} hover:${status.className}`}>
        {status.label}
      </Badge>
    )
  }

  const getSpotsLeftBadge = (spotsLeft: number) => {
    if (spotsLeft === 0) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Completo</Badge>
    }
    if (spotsLeft <= 3) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Quedan {spotsLeft}</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Quedan {spotsLeft}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="pt-12 pb-4 px-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Mis Partidos</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando partidos...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  const displayMatches = activeTab === "Creados" ? createdMatches : joinedMatches

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-12 pb-4 px-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Mis Partidos</h1>
          <Button
            onClick={handleCreateMatch}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 min-h-[40px] min-w-[40px] touch-manipulation"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 px-6 overflow-y-auto">
        {/* Tabs */}
        <div className="flex bg-orange-50 rounded-2xl p-1 mb-6 mt-4">
          {(["Creados", "Inscriptos"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                activeTab === tab 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Matches List */}
        <div className="space-y-4 pb-24">
          {displayMatches.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">
                {activeTab === "Creados" 
                  ? "No has creado partidos aún" 
                  : "No tienes partidos inscriptos"}
              </p>
              <p className="text-sm text-gray-400 mb-4">
                {activeTab === "Creados" 
                  ? "Crea tu primer partido y empieza a organizar" 
                  : "Busca partidos y únete a la comunidad"}
              </p>
              <Button
                onClick={() => activeTab === "Creados" ? handleCreateMatch() : router.push("/matches")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {activeTab === "Creados" ? (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Partido
                  </>
                ) : (
                  "Buscar Partidos"
                )}
              </Button>
            </div>
          ) : (
            displayMatches.map((match) => {
              const spotsLeft = match.cantidadJugadores - match.jugadoresActuales
              const isActive = match.estado !== "CANCELADO" && match.estado !== "COMPLETADO"

              return (
                <div
                  key={match.id}
                  onClick={() => handleMatchClick(match)}
                  className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all touch-manipulation active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                        {formatMatchType(match.tipoPartido)}
                      </Badge>
                      <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                        {formatLevel(match.nivel)}
                      </Badge>
                      {getStatusBadge(match.estado)}
                    </div>
                    {isActive && getSpotsLeftBadge(spotsLeft)}
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {formatDate(match.fecha, match.hora)}
                    </h3>
                    <div className="flex items-center text-gray-600 text-sm space-x-4 mb-2">
                      <div className="flex items-center space-x-1">
                        <span>${match.precioPorJugador} / jugador</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{match.duracionMinutos} min</span>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{match.nombreUbicacion}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-600">
                        {match.jugadoresActuales}/{match.cantidadJugadores} jugadores
                      </span>
                    </div>
                    <span className="text-sm text-green-600 font-medium">
                      {activeTab === "Creados" ? "Gestionar" : "Ver detalles"}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}