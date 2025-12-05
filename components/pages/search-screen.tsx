// components/pages/search-screen.tsx - VERSIÓN MEJORADA
"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Search, MapPin, X, SlidersHorizontal, Clock, TrendingUp, Calendar, Users, Map } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"
import { API_BASE, InscripcionAPI, InscripcionEstado } from "@/lib/api"
import { SearchMapView } from "./search-map-view"
import { useDebounce } from "@/hooks/use-performance"
import { formatMatchType } from "@/lib/utils"

interface SearchResult {
  id: string
  tipo: "usuario" | "partido"
  nombre?: string
  apellido?: string
  tipo_partido?: string
  fecha?: string
  hora?: string
  nombre_ubicacion?: string
  latitud?: number
  longitud?: number
  foto_perfil?: string
  posicion?: string
  nivel?: string
  genero?: string
  rating?: number
  distancia?: number
  imageError?: boolean // Track image load errors
  inscritos?: number
  capacidad?: number
  esAmigo?: boolean
  solicitudPendiente?: boolean
}

type SortOption = "relevancia" | "distancia" | "rating" | "fecha"

export function SearchScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false) // Ya está optimizado - false es correcto para búsqueda
  const [filter, setFilter] = useState<"todos" | "usuarios" | "partidos">("todos")
  const [showFilters, setShowFilters] = useState(false)
  const [showMapView, setShowMapView] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("relevancia")
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Filtros avanzados
  const [filters, setFilters] = useState({
    genero: "todos" as "todos" | "MASCULINO" | "FEMENINO" | "MIXTO",
    nivel: "todos" as "todos" | "Principiante" | "Intermedio" | "Avanzado" | "Profesional",
    tipoPartido: "todos" as "todos" | "FUTBOL_5" | "FUTBOL_7" | "FUTBOL_8" | "FUTBOL_9" | "FUTBOL_11",
  })


  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("recentSearches")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed)
        }
      }
    } catch (error) {
      logger.error('Error loading recent searches:', error)
      localStorage.removeItem("recentSearches")
    }
  }, [])

  // ⚡ Optimización: Usar hook useDebounce en lugar de setTimeout manual
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Ejecutar búsqueda cuando el término debounced cambia
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setResults([])
      return
    }

    handleSearch()
  }, [debouncedSearchQuery, filters])

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return

    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem("recentSearches", JSON.stringify(updated))
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem("recentSearches")
  }

  const handleImageError = useCallback((userId: string) => {
    setResults((prev: SearchResult[]) =>
      prev.map((r: SearchResult) =>
        r.id === userId ? { ...r, imageError: true } : r
      )
    )
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    saveRecentSearch(searchQuery)

    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      const allResults: SearchResult[] = []

      // Construir query params con filtros
      const queryParams = new URLSearchParams({
        search: searchQuery,
        ...(filters.genero !== "todos" && { genero: filters.genero }),
        ...(filters.nivel !== "todos" && { nivel: filters.nivel }),
        ...(filters.tipoPartido !== "todos" && { tipo: filters.tipoPartido }),
      })

      // Buscar usuarios si aplica
      if (filter === "todos" || filter === "usuarios") {
        logger.log("[SearchScreen] Buscando usuarios con token:", token ? "SÍ" : "NO")
        const usersResponse = await fetch(`${API_BASE}/api/usuarios?${queryParams}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        logger.log("[SearchScreen] Respuesta usuarios:", usersResponse.status, usersResponse.statusText)

        // Manejar error 401
        if (usersResponse.status === 401) {
          logger.error("[SearchScreen] Token inválido o expirado")
          AuthService.logout()
          router.push("/login")
          return
        }

        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          const users = usersData.data || []
          logger.log("[SearchScreen] Usuarios encontrados:", users.length)

          // Cargar amistades
          const amisταdesResponse = await fetch(`${API_BASE}/api/amistades`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          })

          const amigosIds = new Set<string>()
          if (amisταdesResponse.ok) {
            const amisταdesData = await amisταdesResponse.json()
            const amistades = amisταdesData.data || []
            amistades.forEach((amistad: any) => {
              amigosIds.add(amistad.usuarioId)
              amigosIds.add(amistad.amigoId)
            })
          }

          users.forEach((u: any) => {
            allResults.push({
              id: u.id,
              tipo: "usuario",
              nombre: u.nombre,
              apellido: u.apellido,
              foto_perfil: u.fotoPerfil,
              posicion: u.posicion,
              nivel: u.nivel,
              rating: u.ratingPromedio || 0,
              esAmigo: amigosIds.has(u.id)
            })
          })
        } else {
          logger.error("[SearchScreen] Error al buscar usuarios:", await usersResponse.text())
        }
      }

      // Buscar partidos si aplica
      if (filter === "todos" || filter === "partidos") {
        logger.log("[SearchScreen] Buscando partidos")
        const partidosResponse = await fetch(`${API_BASE}/api/partidos?${queryParams}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        logger.log("[SearchScreen] Respuesta partidos:", partidosResponse.status, partidosResponse.statusText)

        // Manejar error 401
        if (partidosResponse.status === 401) {
          logger.error("[SearchScreen] Token inválido o expirado en búsqueda de partidos")
          AuthService.logout()
          router.push("/login")
          return
        }

        if (partidosResponse.ok) {
          const partidosData = await partidosResponse.json()
          const partidos = partidosData.data || []
          partidos.forEach((p: any) => {
            allResults.push({
              id: p.id,
              tipo: "partido",
              tipo_partido: p.tipoPartido || p.tipo_partido,
              genero: p.genero,
              fecha: p.fecha,
              hora: p.hora,
              nombre_ubicacion: p.nombreUbicacion || p.nombre_ubicacion,
              latitud: p.latitud,
              longitud: p.longitud,
              inscritos: p.jugadoresInscritos || 0,
              capacidad: p.cantidadJugadores || 0,
              distancia: Math.random() * 10 // TODO: Calcular distancia real con geolocalización
            })
          })
        }
      }

      setResults(sortResults(allResults))
    } catch (error) {
      logger.error("Error en búsqueda:", error)
    } finally {
      setLoading(false)
    }
  }

  const sortResults = (results: SearchResult[]): SearchResult[] => {
    const sorted = [...results]

    switch (sortBy) {
      case "distancia":
        return sorted.sort((a, b) => (a.distancia || 999) - (b.distancia || 999))

      case "rating":
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))

      case "fecha":
        return sorted.sort((a, b) => {
          if (!a.fecha || !b.fecha) return 0
          return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        })

      case "relevancia":
      default:
        // Priorizar amigos y partidos con más lugares disponibles
        return sorted.sort((a, b) => {
          if (a.esAmigo && !b.esAmigo) return -1
          if (!a.esAmigo && b.esAmigo) return 1

          if (a.tipo === "partido" && b.tipo === "partido") {
            const aDisponibles = (a.capacidad || 0) - (a.inscritos || 0)
            const bDisponibles = (b.capacidad || 0) - (b.inscritos || 0)
            return bDisponibles - aDisponibles
          }

          return 0
        })
    }
  }

  const filteredResults = results.filter(r => {
    if (filter === "todos") return true
    if (filter === "usuarios") return r.tipo === "usuario"
    if (filter === "partidos") return r.tipo === "partido"
    return true
  })

  const handleResultClick = async (result: SearchResult) => {
    if (result.tipo === "usuario") {
      router.push(`/users/${result.id}`)
    } else {
      // Para partidos, verificar si el usuario está inscrito y aceptado
      const user = AuthService.getUser()
      if (user) {
        try {
          const estadoResponse = await InscripcionAPI.getEstado(result.id, user.id)
          if (estadoResponse.success && estadoResponse.data?.estado === InscripcionEstado.ACEPTADO) {
            // Usuario es miembro → ir a vista de miembro
            router.push(`/my-matches/${result.id}`)
            return
          }
        } catch (err) {
          logger.error("[SearchScreen] Error verificando inscripción:", err)
        }
      }
      // Usuario no es miembro o error → ir a vista externa
      router.push(`/matches/${result.id}`)
    }
  }

  const resetFilters = () => {
    setFilters({
      genero: "todos",
      nivel: "todos",
      tipoPartido: "todos",
    })
  }

  const hasActiveFilters = filters.genero !== "todos" || filters.nivel !== "todos" || filters.tipoPartido !== "todos"

  // Obtener solo partidos para el mapa
  const partidosParaMapa = filteredResults
    .filter(r => r.tipo === "partido")
    .map(p => ({
      id: p.id,
      tipo_partido: p.tipo_partido,
      genero: p.genero,
      fecha: p.fecha,
      hora: p.hora,
      nombre_ubicacion: p.nombre_ubicacion,
      latitud: p.latitud,
      longitud: p.longitud,
      inscritos: p.inscritos,
      capacidad: p.capacidad,
      distancia: p.distancia,
    }))

  // Si está mostrando el mapa, renderizar el componente de mapa
  if (showMapView) {
    return (
      <SearchMapView
        partidos={partidosParaMapa}
        onClose={() => setShowMapView(false)}
        onPartidoClick={async (id) => {
          setShowMapView(false)

          // Verificar inscripción del usuario
          const user = AuthService.getUser()
          if (user) {
            try {
              const estadoResponse = await InscripcionAPI.getEstado(id, user.id)
              if (estadoResponse.success && estadoResponse.data?.estado === InscripcionEstado.ACEPTADO) {
                router.push(`/my-matches/${id}`)
                return
              }
            } catch (err) {
              logger.error("[SearchScreen] Error verificando inscripción:", err)
            }
          }

          router.push(`/matches/${id}`)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-18 xs:pb-20 sm:pb-22 md:pb-24 safe-bottom">
      {/* Header */}
      <div className="pt-10 xs:pt-12 sm:pt-16 pb-3 xs:pb-4 px-3 xs:px-4 sm:px-6 border-b border-gray-100 safe-top">
        <div className="flex items-center justify-between mb-3 xs:mb-4 gap-2 xs:gap-3">
          <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Buscar</h1>

          {/* Map View Toggle - Solo mostrar si hay partidos en resultados */}
          {results.some(r => r.tipo === "partido") && (
            <Button
              onClick={() => setShowMapView(true)}
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5 xs:gap-2 min-h-[44px] px-2.5 xs:px-3 sm:px-4 touch-manipulation active:scale-95 transition-transform"
              aria-label="Ver en mapa"
            >
              <Map className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-xs xs:text-sm">Mapa</span>
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative mb-3 xs:mb-4">
          <Search className="absolute left-2.5 xs:left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5" />
          <Input
            placeholder="Buscar usuarios o partidos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 xs:pl-10 sm:pl-12 pr-10 xs:pr-12 bg-gray-50 border-gray-200 rounded-lg xs:rounded-xl min-h-[48px] text-base"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                setResults([])
              }}
              className="absolute right-1.5 xs:right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-1.5 xs:gap-2 mb-2 xs:mb-3 overflow-x-auto pb-2 -mx-3 px-3 xs:-mx-4 xs:px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {["todos", "usuarios", "partidos"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 xs:px-4 sm:px-5 py-2 xs:py-2.5 rounded-full text-xs xs:text-sm sm:text-base font-medium transition-all whitespace-nowrap min-h-[44px] touch-manipulation active:scale-95 ${filter === f
                ? "bg-green-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 sm:px-5 py-2 xs:py-2.5 rounded-full text-xs xs:text-sm sm:text-base font-medium transition-all whitespace-nowrap min-h-[44px] touch-manipulation active:scale-95 ${hasActiveFilters
              ? "bg-orange-100 text-orange-800 border-2 border-orange-300 shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
              }`}
            aria-label="Mostrar filtros"
          >
            <SlidersHorizontal className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Filtros</span>
            {hasActiveFilters && ` (${Object.values(filters).filter(v => v !== "todos").length})`}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg xs:rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-5 mb-2 xs:mb-3 space-y-3 xs:space-y-4 sm:space-y-5">
            {/* Género Filter */}
            <div>
              <label className="text-xs xs:text-sm font-semibold text-gray-700 mb-2 xs:mb-2.5 block">Género</label>
              <div className="flex gap-1.5 xs:gap-2 flex-wrap">
                {["todos", "MASCULINO", "FEMENINO", "MIXTO"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setFilters(prev => ({ ...prev, genero: g as any }))}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] touch-manipulation active:scale-95 ${filters.genero === g
                      ? "bg-primary text-white shadow-md"
                      : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 active:bg-gray-50"
                      }`}
                  >
                    {g === "todos" ? "Todos" : g.charAt(0) + g.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Nivel Filter */}
            <div>
              <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2.5 block">Nivel</label>
              <div className="flex gap-2 flex-wrap">
                {["todos", "Principiante", "Intermedio", "Avanzado", "Profesional"].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFilters(prev => ({ ...prev, nivel: n as any }))}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] touch-manipulation active:scale-95 ${filters.nivel === n
                      ? "bg-primary text-white shadow-md"
                      : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 active:bg-gray-50"
                      }`}
                  >
                    {n === "todos" ? "Todos" : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo Partido Filter */}
            {filter !== "usuarios" && (
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2.5 block">Tipo de partido</label>
                <div className="flex gap-2 flex-wrap">
                  {["todos", "FUTBOL_5", "FUTBOL_7", "FUTBOL_8", "FUTBOL_9", "FUTBOL_11"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilters(prev => ({ ...prev, tipoPartido: t as any }))}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] touch-manipulation active:scale-95 ${filters.tipoPartido === t
                        ? "bg-primary text-white shadow-md"
                        : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 active:bg-gray-50"
                        }`}
                    >
                      {t === "todos" ? "Todos" : formatMatchType(t)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="flex-1 min-h-[48px] text-base font-medium border-2 touch-manipulation active:scale-95"
                disabled={!hasActiveFilters}
              >
                Limpiar
              </Button>
              <Button
                size="sm"
                onClick={() => setShowFilters(false)}
                className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 min-h-[48px] text-base font-medium shadow-md touch-manipulation active:scale-95"
              >
                Aplicar
              </Button>
            </div>
          </div>
        )}

        {/* Sort Options */}
        {results.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <span className="text-xs sm:text-sm text-gray-500 py-2.5 whitespace-nowrap font-medium">Ordenar:</span>
            {[
              { value: "relevancia" as SortOption, label: "Relevancia", icon: TrendingUp },
              { value: "distancia" as SortOption, label: "Distancia", icon: MapPin },
              { value: "rating" as SortOption, label: "Rating", icon: TrendingUp },
              { value: "fecha" as SortOption, label: "Fecha", icon: Calendar },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setSortBy(value)
                  setResults(sortResults(results))
                }}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap min-h-[44px] touch-manipulation active:scale-95 ${sortBy === value
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.slice(0, 3)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-6 pb-18 xs:pb-20 sm:pb-22 md:pb-24 overflow-y-auto">
        {loading ? (
          <SearchSkeleton />
        ) : filteredResults.length === 0 && searchQuery ? (
          <EmptyState message="No se encontraron resultados" />
        ) : searchQuery === "" ? (
          <div>
            <EmptyState message="Escribe para buscar usuarios o partidos" icon={<Search className="w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 text-gray-300" />} />

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mt-5 xs:mt-6 sm:mt-8">
                <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
                  <h3 className="text-xs xs:text-sm sm:text-base font-semibold text-gray-900">Búsquedas recientes</h3>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs xs:text-sm text-gray-500 hover:text-gray-700 active:text-gray-900 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 min-h-[40px] touch-manipulation active:scale-95"
                  >
                    Limpiar
                  </button>
                </div>
                <div className="space-y-2 xs:space-y-2.5 sm:space-y-3">
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchQuery(search)}
                      className="w-full flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-left min-h-[52px] touch-manipulation active:scale-[0.98]"
                    >
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-gray-700 flex-1 truncate">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Results Count */}
            <p className="text-sm sm:text-base text-gray-500 mb-4 font-medium">
              {filteredResults.length} resultado{filteredResults.length !== 1 ? 's' : ''} encontrado{filteredResults.length !== 1 ? 's' : ''}
            </p>

            {/* Results List */}
            <div className="space-y-3 sm:space-y-4">
              {filteredResults.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  onClick={() => handleResultClick(result)}
                  onImageError={handleImageError}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}

// Skeleton Loader Component
function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Empty State Component
function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center py-12">
      {icon || <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />}
      <p className="text-gray-500">{message}</p>
    </div>
  )
}

// Result Card Component
function ResultCard({
  result,
  onClick,
  onImageError
}: {
  result: SearchResult
  onClick: () => void
  onImageError?: (id: string) => void
}) {
  if (result.tipo === "usuario") {
    return (
      <div
        onClick={onClick}
        className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-all hover:shadow-lg active:shadow-md touch-manipulation active:scale-[0.98] min-h-[80px]"
      >
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative">
              {result.foto_perfil && !result.imageError ? (
                <Image
                  src={`${API_BASE}/api/usuarios/${result.id}/foto`}
                  alt={result.nombre || 'Usuario'}
                  width={56}
                  height={56}
                  className="rounded-full object-cover"
                  onError={() => {
                    // Call parent callback to update state safely
                    onImageError?.(result.id)
                  }}
                  unoptimized // Backend serves dynamic images
                />
              ) : (
                <span className="text-gray-600 font-bold text-base sm:text-lg">
                  {result.nombre?.[0]}{result.apellido?.[0]}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-semibold text-gray-900 truncate text-base sm:text-lg">
                  {result.nombre} {result.apellido}
                </p>
                {result.esAmigo && (
                  <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0.5 flex-shrink-0">
                    Amigo
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500 flex-wrap">
                {result.posicion && (
                  <span className="truncate">{result.posicion}</span>
                )}
                {result.nivel && result.posicion && (
                  <span className="hidden sm:inline">•</span>
                )}
                {result.nivel && (
                  <span>{result.nivel}</span>
                )}
              </div>
              {result.rating !== undefined && result.rating > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
                  <span className="text-xs sm:text-sm font-semibold text-yellow-600">
                    {result.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-2 sm:px-3 py-1">
            Usuario
          </Badge>
        </div>
      </div>
    )
  }

  // Partido Card
  const disponibles = (result.capacidad || 0) - (result.inscritos || 0)
  const isLleno = disponibles <= 0

  return (
    <div
      onClick={onClick}
      className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-all hover:shadow-lg active:shadow-md touch-manipulation active:scale-[0.98] min-h-[120px]"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-orange-100 text-orange-800 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 sm:py-1">
            {formatMatchType(result.tipo_partido)}
          </Badge>
          {result.genero && (
            <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 sm:py-1">
              {result.genero}
            </Badge>
          )}
        </div>
        <Badge className={`text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 font-semibold ${isLleno ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {isLleno ? 'Lleno' : `${disponibles} lugar${disponibles !== 1 ? 'es' : ''}`}
        </Badge>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5">
        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
        <p className="font-semibold text-gray-900 text-base sm:text-lg">
          {result.fecha} • {result.hora}
        </p>
      </div>

      <div className="flex items-start gap-2 sm:gap-2.5 text-sm sm:text-base text-gray-600 mb-3">
        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
        <span className="line-clamp-2">{result.nombre_ubicacion}</span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 font-medium">
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{result.inscritos}/{result.capacidad} jugadores</span>
        </div>
        {result.distancia !== undefined && (
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-500 font-medium">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{result.distancia.toFixed(1)} km</span>
          </div>
        )}
      </div>
    </div>
  )
}