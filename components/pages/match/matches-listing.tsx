"use client"


import { logger } from '@/lib/logger'
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

      logger.log("[MatchesListing] Cargando con filtros:", filtros)

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
      logger.error("[MatchesListing] Error cargando partidos:", err)
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Responsive sticky */}
      <div className="pt-safe-top bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Partidos</h1>
            <Button
              onClick={handleCreateMatch}
              size="sm"
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full p-2 sm:p-2.5 min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] touch-manipulation shadow-md transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Error Message */}
        {error && (
          <div className="mx-4 sm:mx-6 md:mx-8 mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-sm font-medium">Error</p>
              <p className="text-red-600 text-xs sm:text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700 touch-manipulation p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="px-4 sm:px-6 md:px-8 pt-4 pb-3">
          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 rounded-xl text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 touch-manipulation p-1"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Interactive Map - Responsive height */}
          <MatchesMapView
            matches={matches}
            selectedMatchId={selectedMatchId}
            onMarkerClick={(matchId) => {
              setSelectedMatchId(matchId)
              router.push(`/matches/${matchId}`)
            }}
            className="h-[250px] sm:h-[300px] md:h-[350px] mb-4 sm:mb-6 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm"
          />

          {/* Quick Filters - Better mobile scroll */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-2 flex-1 overflow-x-auto pb-1 scrollbar-hide">
              {quickFilters.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => toggleFilter(filter.label)}
                  className={`px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation min-h-[36px] whitespace-nowrap ${
                    selectedFilters.includes(filter.label)
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-orange-50 active:bg-orange-100"
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
              className="rounded-full flex-shrink-0 border-gray-200 hover:bg-gray-50 active:bg-gray-100"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Active Filters Count */}
          {selectedFilters.length > 0 && (
            <div className="mb-3 flex items-center justify-between bg-orange-50 rounded-lg p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-gray-700 font-medium">
                {selectedFilters.length} filtro{selectedFilters.length !== 1 ? "s" : ""} aplicado{selectedFilters.length !== 1 ? "s" : ""}
              </p>
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="text-orange-700 hover:text-orange-900 hover:bg-orange-100 text-xs sm:text-sm h-auto py-1 px-2"
              >
                Limpiar
              </Button>
            </div>
          )}

          {/* Advanced Filters - Better mobile layout */}
          {showAdvancedFilters && (
            <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">Filtros avanzados</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAdvancedFilters(false)} 
                  className="p-1 h-auto hover:bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {/* Tipo de partido */}
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Tipo de partido</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Fútbol 5", "Fútbol 7", "Fútbol 8", "Fútbol 9", "Fútbol 11"].map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleFilter(type)}
                        className={`px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
                          selectedFilters.includes(type)
                            ? "bg-orange-500 text-white shadow-md"
                            : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-orange-50 active:border-orange-300"
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

        {/* Matches List - Better mobile spacing */}
        <div className="px-4 sm:px-6 md:px-8 pb-24 sm:pb-28">
          {loading ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" variant="green" text="Cargando partidos..." />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium mb-2 text-base sm:text-lg">No se encontraron partidos</p>
              <p className="text-sm sm:text-base text-gray-500 mb-6 px-4">
                {selectedFilters.length > 0 || searchQuery 
                  ? "Intenta ajustar los filtros" 
                  : "Crea un nuevo partido"}
              </p>
              <Button
                onClick={selectedFilters.length > 0 || searchQuery ? clearFilters : handleCreateMatch}
                className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-md transition-transform active:scale-95 touch-manipulation text-sm sm:text-base px-6 py-2.5"
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
            <div className="space-y-3 sm:space-y-4">
              {matches.map((match) => {
                const spotsLeft = (match.cantidadJugadores ?? 0) - (match.jugadoresActuales ?? 0)
                
                return (
                  <div
                    key={match.id}
                    onClick={() => handleMatchClick(match.id!)}
                    className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:border-green-200 transition-all duration-200 touch-manipulation active:scale-[0.98] active:shadow-md"
                  >
                    {/* Header row - Badges */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                          {formatMatchType(match.tipoPartido)}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                          {match.genero || 'Mixto'}
                        </Badge>
                      </div>
                      <Badge className={`${getSpotsLeftColor(spotsLeft)} hover:bg-current text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1 whitespace-nowrap flex-shrink-0`}>
                        {spotsLeft === 0 ? "Completo" : `${spotsLeft} lugar${spotsLeft !== 1 ? 'es' : ''}`}
                      </Badge>
                    </div>

                    {/* Match Info */}
                    <div className="mb-3 sm:mb-4">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                        {formatDate(match.fecha, match.hora)}
                      </h3>
                      
                      {/* Price and Duration */}
                      <div className="flex flex-wrap items-center text-gray-600 text-xs sm:text-sm gap-x-3 gap-y-1 mb-2">
                        <div className="flex items-center space-x-1 font-medium">
                          <span className="text-green-600 text-sm sm:text-base">${match.precioPorJugador}</span>
                          <span className="text-gray-500">/ jugador</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span>{match.duracionMinutos} min</span>
                      </div>
                      
                      {/* Location */}
                      <div className="flex items-start text-gray-600 text-xs sm:text-sm">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2 sm:line-clamp-1">{match.nombreUbicacion}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{match.jugadoresActuales}</span>
                        <span className="text-gray-400">/{match.cantidadJugadores}</span>
                      </span>
                      <span className="text-xs sm:text-sm text-green-600 font-semibold">
                        Ver detalles →
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