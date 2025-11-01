// components/pages/search-screen.tsx - VERSIÓN MEJORADA
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Search, MapPin, X, SlidersHorizontal, Clock, TrendingUp, Calendar, Users, Map } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"
import { API_BASE } from "@/lib/api"
import { SearchMapView } from "./search-map-view"

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
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"todos" | "usuarios" | "partidos">("todos")
  const [showFilters, setShowFilters] = useState(false)
  const [showMapView, setShowMapView] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("relevancia")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  // Filtros avanzados
  const [filters, setFilters] = useState({
    genero: "todos" as "todos" | "MASCULINO" | "FEMENINO" | "MIXTO",
    nivel: "todos" as "todos" | "Principiante" | "Intermedio" | "Avanzado" | "Profesional",
    tipoPartido: "todos" as "todos" | "FUTBOL_5" | "FUTBOL_7" | "FUTBOL_11",
  })


  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches")
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Debounce para búsqueda en tiempo real
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 500) // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timeoutId)
  }, [searchQuery, filters])

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
        console.log("[SearchScreen] Buscando usuarios con token:", token ? "SÍ" : "NO")
        const usersResponse = await fetch(`${API_BASE}/api/usuarios?${queryParams}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        console.log("[SearchScreen] Respuesta usuarios:", usersResponse.status, usersResponse.statusText)

        // Manejar error 401
        if (usersResponse.status === 401) {
          console.error("[SearchScreen] Token inválido o expirado")
          AuthService.logout()
          router.push("/login")
          return
        }

        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          const users = usersData.data || []
          console.log("[SearchScreen] Usuarios encontrados:", users.length)
          
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
          console.error("[SearchScreen] Error al buscar usuarios:", await usersResponse.text())
        }
      }

      // Buscar partidos si aplica
      if (filter === "todos" || filter === "partidos") {
        console.log("[SearchScreen] Buscando partidos")
        const partidosResponse = await fetch(`${API_BASE}/api/partidos?${queryParams}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        console.log("[SearchScreen] Respuesta partidos:", partidosResponse.status, partidosResponse.statusText)

        // Manejar error 401
        if (partidosResponse.status === 401) {
          console.error("[SearchScreen] Token inválido o expirado en búsqueda de partidos")
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
      console.error("Error en búsqueda:", error)
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

  const handleResultClick = (result: SearchResult) => {
    if (result.tipo === "usuario") {
      router.push(`/users/${result.id}`)
    } else {
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
        onPartidoClick={(id) => {
          setShowMapView(false)
          router.push(`/matches/${id}`)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-4 px-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Buscar</h1>
          
          {/* Map View Toggle - Solo mostrar si hay partidos en resultados */}
          {results.some(r => r.tipo === "partido") && (
            <Button
              onClick={() => setShowMapView(true)}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Mapa</span>
            </Button>
          )}
        </div>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar usuarios o partidos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-gray-50 border-gray-200 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                setResults([])
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
          {["todos", "usuarios", "partidos"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              hasActiveFilters
                ? "bg-orange-100 text-orange-800 border border-orange-300"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros {hasActiveFilters && `(${Object.values(filters).filter(v => v !== "todos").length})`}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-4">
            {/* Género Filter */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Género</label>
              <div className="flex gap-2 flex-wrap">
                {["todos", "MASCULINO", "FEMENINO", "MIXTO"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setFilters(prev => ({ ...prev, genero: g as any }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      filters.genero === g
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {g === "todos" ? "Todos" : g.charAt(0) + g.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Nivel Filter */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Nivel</label>
              <div className="flex gap-2 flex-wrap">
                {["todos", "Principiante", "Intermedio", "Avanzado", "Profesional"].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFilters(prev => ({ ...prev, nivel: n as any }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      filters.nivel === n
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
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
                <label className="text-xs font-medium text-gray-600 mb-2 block">Tipo de partido</label>
                <div className="flex gap-2 flex-wrap">
                  {["todos", "FUTBOL_5", "FUTBOL_7", "FUTBOL_11"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilters(prev => ({ ...prev, tipoPartido: t as any }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        filters.tipoPartido === t
                          ? "bg-primary text-white shadow-sm"
                          : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {t === "todos" ? "Todos" : t.replace("FUTBOL_", "Fútbol ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="flex-1"
                disabled={!hasActiveFilters}
              >
                Limpiar filtros
              </Button>
              <Button
                size="sm"
                onClick={() => setShowFilters(false)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Aplicar
              </Button>
            </div>
          </div>
        )}

        {/* Sort Options */}
        {results.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <span className="text-xs text-gray-500 py-2 whitespace-nowrap">Ordenar por:</span>
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
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  sortBy === value
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 px-6 py-6 pb-24 overflow-y-auto">
        {loading ? (
          <SearchSkeleton />
        ) : filteredResults.length === 0 && searchQuery ? (
          <EmptyState message="No se encontraron resultados" />
        ) : searchQuery === "" ? (
          <div>
            <EmptyState message="Escribe para buscar usuarios o partidos" icon={<Search className="w-12 h-12 text-gray-300" />} />
            
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Búsquedas recientes</h3>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Limpiar
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchQuery(search)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                    >
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Results Count */}
            <p className="text-sm text-gray-500 mb-4">
              {filteredResults.length} resultado{filteredResults.length !== 1 ? 's' : ''} encontrado{filteredResults.length !== 1 ? 's' : ''}
            </p>
            
            {/* Results List */}
            <div className="space-y-3">
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
        className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-all hover:shadow-md"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative">
              {result.foto_perfil && !result.imageError ? (
                <Image 
                  src={`${API_BASE}/api/usuarios/${result.id}/foto`}
                  alt={result.nombre || 'Usuario'}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                  onError={() => {
                    // Call parent callback to update state safely
                    onImageError?.(result.id)
                  }}
                  unoptimized // Backend serves dynamic images
                />
              ) : (
                <span className="text-gray-600 font-medium text-sm">
                  {result.nombre?.[0]}{result.apellido?.[0]}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-gray-900 truncate">
                  {result.nombre} {result.apellido}
                </p>
                {result.esAmigo && (
                  <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0">
                    Amigo
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {result.posicion && (
                  <span className="truncate">{result.posicion}</span>
                )}
                {result.nivel && result.posicion && (
                  <span>•</span>
                )}
                {result.nivel && (
                  <span>{result.nivel}</span>
                )}
              </div>
              {result.rating !== undefined && result.rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs font-medium text-yellow-600">
                    {result.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800 text-xs whitespace-nowrap ml-2">
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
      className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-orange-100 text-orange-800 whitespace-nowrap">
            {result.tipo_partido?.replace("FUTBOL_", "Fútbol ")}
          </Badge>
          {result.genero && (
            <Badge variant="outline" className="text-xs">
              {result.genero}
            </Badge>
          )}
        </div>
        <Badge className={`text-xs whitespace-nowrap ml-2 ${isLleno ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {isLleno ? 'Lleno' : `${disponibles} lugar${disponibles !== 1 ? 'es' : ''}`}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <p className="font-medium text-gray-900">
          {result.fecha} • {result.hora}
        </p>
      </div>
      
      <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span className="line-clamp-1">{result.nombre_ubicacion}</span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users className="w-3 h-3" />
          <span>{result.inscritos}/{result.capacidad} jugadores</span>
        </div>
        {result.distancia !== undefined && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <span>{result.distancia.toFixed(1)} km</span>
          </div>
        )}
      </div>
    </div>
  )
}