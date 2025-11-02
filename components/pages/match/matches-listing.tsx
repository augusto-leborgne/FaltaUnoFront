"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MapPin, Plus, Search, Filter, X, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"
import { MatchesMapView } from "@/components/google-maps/matches-map-view"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { 
  PartidoAPI, 
  PartidoDTO, 
  PartidoEstado,
  TipoPartido, 
  InscripcionAPI,
  InscripcionEstado
} from "@/lib/api"

export function MatchesListing() {
  const router = useRouter()
  
  // Estados
  const [matches, setMatches] = useState<PartidoDTO[]>([])
  const [loading, setLoading] = useState(false) // Cambiar a false para mostrar UI inmediatamente
  const [error, setError] = useState("")
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>()
  const [userInscriptions, setUserInscriptions] = useState<Map<string, { estado: InscripcionEstado | null }>>(new Map())
  const [initialLoad, setInitialLoad] = useState(true) // Nuevo: detectar primera carga

  // Filtros rápidos
  const quickFilters = [
    { label: "Hoy", type: "date" },
    { label: "Fútbol 5", type: "match-type" },
    { label: "Cerca", type: "location" },
  ]

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    loadMatches()
  }, [selectedFilters, searchQuery])

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================

  const loadMatches = async () => {
    try {
      // Solo mostrar loading spinner si no hay datos previos
      if (matches.length === 0) {
        setLoading(true)
      }
      setError("")

      // Validar autenticación
      if (!AuthService.isLoggedIn()) {
        router.push("/login")
        return
      }

      // Construir filtros para la API
      const filtros: any = {}

      // Filtros de fecha
      if (selectedFilters.includes("Hoy")) {
        const today = new Date().toISOString().split('T')[0]
        filtros.fecha = today
      }

      // Filtros de tipo de partido
      selectedFilters.forEach((filter) => {
        if (filter.includes("Fútbol")) {
          const numero = filter.replace("Fútbol ", "")
          filtros.tipoPartido = `FUTBOL_${numero}`
        }
      })

      // Búsqueda por texto
      if (searchQuery.trim()) {
        filtros.search = searchQuery.trim()
      }

      // Solo partidos disponibles y futuros
      filtros.estado = PartidoEstado.DISPONIBLE

      console.log("[MatchesListing] Cargando con filtros:", filtros)

      // Llamar a la API
      const response = await PartidoAPI.list(filtros)

      if (!response.success) {
        throw new Error("Error al cargar partidos")
      }

      let partidos = response.data || []

      // Filtrar partidos futuros (cliente)
      const now = new Date()
      partidos = partidos.filter((p) => {
        try {
          const fechaPartido = new Date(`${p.fecha}T${p.hora}`)
          return fechaPartido > now
        } catch {
          return true
        }
      })

      // Ordenar por fecha (más cercanos primero)
      partidos.sort((a, b) => {
        try {
          const dateA = new Date(`${a.fecha}T${a.hora}`)
          const dateB = new Date(`${b.fecha}T${b.hora}`)
          return dateA.getTime() - dateB.getTime()
        } catch {
          return 0
        }
      })

      setMatches(partidos)

      // Cargar estados de inscripción del usuario para cada partido (en background sin bloquear)
      const user = AuthService.getUser()
      if (user && partidos.length > 0) {
        // No esperar a las inscripciones, cargarlas en background
        loadUserInscriptions(partidos, user.id)
      }

    } catch (err) {
      console.error("[MatchesListing] Error cargando partidos:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al cargar partidos"
      setError(errorMessage)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  // Cargar inscripciones en background
  const loadUserInscriptions = async (partidos: PartidoDTO[], userId: string) => {
    const inscriptionsMap = new Map<string, { estado: InscripcionEstado | null }>()
    
    // Cargar en lotes de 5 para no saturar
    const batchSize = 5
    for (let i = 0; i < partidos.length; i += batchSize) {
      const batch = partidos.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (partido) => {
          try {
            const estadoResponse = await InscripcionAPI.getEstado(partido.id!, userId)
            if (estadoResponse.success && estadoResponse.data) {
              inscriptionsMap.set(partido.id!, {
                estado: estadoResponse.data.estado
              })
            }
          } catch (err) {
            // Ignorar errores silenciosamente
          }
        })
      )
      
      // Actualizar el estado progresivamente
      setUserInscriptions(new Map(inscriptionsMap))
    }
  }

  // ============================================
  // HANDLERS
  // ============================================

  const toggleFilter = (filter: string) => {
    setSelectedFilters((prev) => 
      prev.includes(filter) 
        ? prev.filter((f) => f !== filter) 
        : [...prev, filter]
    )
  }

  const clearFilters = () => {
    setSelectedFilters([])
    setSearchQuery("")
  }

  const handleMatchClick = (matchId: string) => {
    // Verificar si el usuario está inscrito y aceptado
    const inscripcion = userInscriptions.get(matchId)
    
    if (inscripcion?.estado === InscripcionEstado.ACEPTADO) {
      // Usuario es miembro del partido → vista de miembro
      router.push(`/my-matches/${matchId}`)
    } else {
      // Usuario no es miembro → vista externa
      router.push(`/matches/${matchId}`)
    }
  }

  const handleCreateMatch = () => {
    router.push("/create-match")
  }

  // ============================================
  // HELPERS DE FORMATO
  // ============================================

  const formatMatchType = (type?: string) => {
    if (!type) return "Fútbol"
    return type.replace("FUTBOL_", "F")
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
        return `${date.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })} ${time}`
      }
    } catch {
      return `${dateString} ${timeString}`
    }
  }

  const getSpotsLeftColor = (spotsLeft: number) => {
    if (spotsLeft === 0) return "bg-red-100 text-red-800"
    if (spotsLeft <= 3) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 sm:px-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Partidos</h1>
          <Button
            onClick={handleCreateMatch}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 min-h-[44px] min-w-[44px] touch-manipulation"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 overflow-y-auto pb-24">
        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-sm font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mt-4 mb-4">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar partidos por ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Interactive Map - Airbnb Style */}
          <MatchesMapView
            matches={matches}
            selectedMatchId={selectedMatchId}
            onMarkerClick={(matchId) => {
              setSelectedMatchId(matchId)
              router.push(`/matches/${matchId}`)
            }}
            className="h-[300px] mb-6 rounded-2xl overflow-hidden shadow-sm"
          />

          {/* Quick Filters */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 flex-1 overflow-x-auto">
              {quickFilters.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => toggleFilter(filter.label)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation min-h-[36px] whitespace-nowrap ${
                    selectedFilters.includes(filter.label)
                      ? "bg-orange-200 text-gray-900"
                      : "bg-orange-50 text-gray-700 hover:bg-orange-100 active:bg-orange-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="ml-2 rounded-full"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Active Filters Count */}
          {selectedFilters.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedFilters.length} filtro{selectedFilters.length !== 1 ? "s" : ""} aplicado{selectedFilters.length !== 1 ? "s" : ""}
              </p>
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="text-gray-600"
              >
                Limpiar
              </Button>
            </div>
          )}

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Filtros avanzados</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAdvancedFilters(false)} 
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {/* Tipo de partido */}
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-2">Tipo de partido</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Fútbol 5", "Fútbol 7", "Fútbol 8", "Fútbol 9", "Fútbol 11"].map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleFilter(type)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedFilters.includes(type)
                            ? "bg-orange-200 text-gray-900"
                            : "bg-white text-gray-700 hover:bg-orange-50"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Matches List */}
        <div className="space-y-4 pb-24">
          {loading ? (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" variant="green" text="Cargando partidos..." />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">No se encontraron partidos</p>
              <p className="text-sm text-gray-400 mb-4">
                {selectedFilters.length > 0 || searchQuery 
                  ? "Intenta ajustar los filtros" 
                  : "Crea un nuevo partido"}
              </p>
              <Button
                onClick={selectedFilters.length > 0 || searchQuery ? clearFilters : handleCreateMatch}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {selectedFilters.length > 0 || searchQuery ? (
                  "Limpiar filtros"
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Partido
                  </>
                )}
              </Button>
            </div>
          ) : (
            matches.map((match) => {
              const spotsLeft = (match.cantidadJugadores ?? 0) - (match.jugadoresActuales ?? 0)
              
              return (
                <div
                  key={match.id}
                  onClick={() => handleMatchClick(match.id!)}
                  className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all touch-manipulation active:scale-[0.98]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                        {formatMatchType(match.tipoPartido)}
                      </Badge>
                    </div>
                    <Badge className={`${getSpotsLeftColor(spotsLeft)} hover:bg-current`}>
                      {spotsLeft === 0 ? "Completo" : `Quedan ${spotsLeft}`}
                    </Badge>
                  </div>

                  {/* Match Info */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {formatDate(match.fecha, match.hora)}
                    </h3>
                    <div className="flex items-center text-gray-600 text-sm space-x-4 mb-1">
                      <span>${match.precioPorJugador} / jugador</span>
                      <span>•</span>
                      <span>{match.duracionMinutos} min</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="text-sm truncate">{match.nombreUbicacion}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {match.jugadoresActuales}/{match.cantidadJugadores} jugadores
                    </span>
                    <span className="text-sm text-green-600 font-medium">
                      Ver detalles
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