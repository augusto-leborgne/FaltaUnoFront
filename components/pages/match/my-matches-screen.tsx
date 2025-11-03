"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Clock, MapPin, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"
import { PartidoAPI, PartidoDTO } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Usar PartidoDTO del API
type Match = PartidoDTO

export function MyMatchesScreen() {
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<"Creados" | "Inscriptos">("Creados")
  const [createdMatches, setCreatedMatches] = useState<Match[]>([])
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false) // Cambiar a false para UI inmediata
  const [error, setError] = useState("")

  const currentUser = AuthService.getUser()

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    try {
      // Solo mostrar loading si no hay datos previos
      if (createdMatches.length === 0 && joinedMatches.length === 0) {
        setLoading(true)
      }
      
      setError("")

      if (!AuthService.isLoggedIn()) {
        router.push("/login")
        return
      }

      const user = AuthService.getUser()
      if (!user?.id) {
        throw new Error("Usuario no encontrado")
      }

      logger.log("[MyMatches] Cargando partidos del usuario:", user.id)

      // Usar PartidoAPI en lugar de fetch directo
      const response = await PartidoAPI.misPartidos(user.id)

      logger.log("[MyMatches] Respuesta:", response)

      const partidos = response.data || []

      // Separar en creados vs inscritos
      const created = partidos.filter((p: Match) => p.organizadorId === user.id)
      const joined = partidos.filter((p: Match) => p.organizadorId !== user.id)

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

      logger.log("[MyMatches] Creados:", created.length, "Inscritos:", joined.length)

      setCreatedMatches(created.sort(sortByDate))
      setJoinedMatches(joined.sort(sortByDate))

    } catch (err) {
      logger.error("[MyMatches] Error:", err)
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
        // ✅ Capitalize first letter
        const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
        return `${formattedWeekday} ${time}`
      }
    } catch {
      return `${dateString} ${timeString}`
    }
  }

  const getStatusBadge = (estado: string, fecha: string, hora: string) => {
    // ✅ Apply backend business rules for status display
    // Backend runs this every 5 minutes, but we can show it immediately in UI
    const now = new Date()
    const matchDateTime = new Date(`${fecha}T${hora}`)
    const isPast = matchDateTime < now
    
    let displayEstado = estado
    
    // Rule 1: DISPONIBLE matches that passed their date/time → CANCELADO
    if (isPast && estado === "DISPONIBLE") {
      displayEstado = "CANCELADO"
    }
    
    // Rule 2: CONFIRMADO matches that passed their date/time → COMPLETADO
    if (isPast && estado === "CONFIRMADO") {
      displayEstado = "COMPLETADO"
    }
    
    const statusMap: Record<string, { label: string; className: string }> = {
      "CONFIRMADO": { label: "Confirmado", className: "bg-green-100 text-green-800" },
      "CANCELADO": { label: "Cancelado", className: "bg-red-100 text-red-800" },
      "COMPLETADO": { label: "Completado", className: "bg-blue-100 text-blue-800" },
      "DISPONIBLE": { label: "Disponible", className: "bg-green-100 text-green-800" },
    }

    const status = statusMap[displayEstado] || statusMap["DISPONIBLE"]

    return (
      <Badge className={`${status.className} hover:${status.className} text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1`}>
        {status.label}
      </Badge>
    )
  }

  const getSpotsLeftBadge = (spotsLeft: number) => {
    if (spotsLeft === 0) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1 whitespace-nowrap">Completo</Badge>
    }
    if (spotsLeft <= 3) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1 whitespace-nowrap">{spotsLeft} lugar{spotsLeft !== 1 ? 'es' : ''}</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1 whitespace-nowrap">{spotsLeft} lugares</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="pt-safe-top bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Mis Partidos</h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <LoadingSpinner size="lg" variant="green" text="Cargando partidos..." />
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  const displayMatches = activeTab === "Creados" ? createdMatches : joinedMatches

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Responsive padding */}
      <div className="pt-safe-top bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Mis Partidos</h1>
            <Button
              onClick={handleCreateMatch}
              size="sm"
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full p-2 sm:p-2.5 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] touch-manipulation shadow-md transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Tabs - Better mobile spacing */}
        <div className="px-4 sm:px-6 md:px-8 pt-4 pb-3">
          <div className="flex bg-gray-100 rounded-xl sm:rounded-2xl p-1">
            {(["Creados", "Inscriptos"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all duration-200 touch-manipulation ${
                  activeTab === tab 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900 active:bg-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Matches List - Optimized spacing */}
        <div className="px-4 sm:px-6 md:px-8 pb-24 sm:pb-28">
          {displayMatches.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium mb-2 text-base sm:text-lg">
                {activeTab === "Creados" 
                  ? "No has creado partidos aún" 
                  : "No tienes partidos inscriptos"}
              </p>
              <p className="text-sm sm:text-base text-gray-500 mb-6 px-4">
                {activeTab === "Creados" 
                  ? "Crea tu primer partido y empieza a organizar" 
                  : "Busca partidos y únete a la comunidad"}
              </p>
              <Button
                onClick={() => activeTab === "Creados" ? handleCreateMatch() : router.push("/matches")}
                className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-md transition-transform active:scale-95 touch-manipulation text-sm sm:text-base px-6 py-2.5"
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
            <div className="space-y-3 sm:space-y-4">
              {displayMatches.map((match) => {
                const spotsLeft = (match.cantidadJugadores || 0) - (match.jugadoresActuales || 0)
                const isActive = match.estado !== "CANCELADO" && match.estado !== "COMPLETADO"

                return (
                  <div
                    key={match.id}
                    onClick={() => handleMatchClick(match)}
                    className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:border-green-200 transition-all duration-200 touch-manipulation active:scale-[0.98] active:shadow-md"
                  >
                    {/* Header row - Badges */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                          {formatMatchType(match.tipoPartido || 'FUTBOL_5')}
                        </Badge>
                        {getStatusBadge(match.estado, match.fecha, match.hora)}
                      </div>
                      {isActive && <div className="flex-shrink-0">{getSpotsLeftBadge(spotsLeft)}</div>}
                    </div>

                    {/* Date/Time - Bigger on mobile */}
                    <div className="mb-3 sm:mb-4">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                        {formatDate(match.fecha, match.hora)}
                      </h3>
                      
                      {/* Price and Duration - Better mobile layout */}
                      <div className="flex flex-wrap items-center text-gray-600 text-xs sm:text-sm gap-x-3 gap-y-1 mb-2">
                        <div className="flex items-center space-x-1 font-medium">
                          <span className="text-green-600 text-sm sm:text-base">${match.precioPorJugador}</span>
                          <span className="text-gray-500">/ jugador</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>{match.duracionMinutos} min</span>
                        </div>
                      </div>
                      
                      {/* Location - Better truncation on mobile */}
                      <div className="flex items-start text-gray-600 text-xs sm:text-sm">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2 sm:line-clamp-1">{match.nombreUbicacion}</span>
                      </div>
                    </div>

                    {/* Footer - Players count and action */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                        <span className="text-xs sm:text-sm text-gray-600">
                          <span className="font-semibold text-gray-900">{match.jugadoresActuales}</span>
                          <span className="text-gray-400">/{match.cantidadJugadores}</span>
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-green-600 font-semibold">
                        {activeTab === "Creados" ? "Gestionar →" : "Ver detalles →"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}