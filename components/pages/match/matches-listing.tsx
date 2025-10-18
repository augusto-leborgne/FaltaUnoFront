"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Plus, Search, Filter, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Input } from "@/components/ui/input"
import { AuthService } from "@/lib/auth"

interface Partido {
  id: string
  tipo_partido: string
  nivel: string
  fecha: string
  hora: string
  precio_por_jugador: number
  cantidad_jugadores: number
  jugadores_actuales: number
  nombre_ubicacion: string
  latitud?: number
  longitud?: number
  estado: string
}

export function MatchesListing() {
  const router = useRouter()
  const [matches, setMatches] = useState<Partido[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const quickFilters = [
    { label: "Hoy", type: "date" },
    { label: "Fútbol 5", type: "match-type" },
    { label: "Cerca", type: "location" },
  ]

  useEffect(() => {
    loadMatches()
  }, [selectedFilters, searchQuery])

  const loadMatches = async () => {
    try {
      setLoading(true)
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      // Construir query params basado en filtros
      const params = new URLSearchParams()
      
      selectedFilters.forEach((filter) => {
        if (filter === "Hoy") {
          const today = new Date().toISOString().split('T')[0]
          params.append("fecha", today)
        }
        if (filter === "Fútbol 5") params.append("tipoPartido", "FUTBOL_5")
        if (filter === "Fútbol 7") params.append("tipoPartido", "FUTBOL_7")
        if (filter === "Fútbol 8") params.append("tipoPartido", "FUTBOL_8")
        if (filter === "Fútbol 9") params.append("tipoPartido", "FUTBOL_9")
        if (filter === "Fútbol 11") params.append("tipoPartido", "FUTBOL_11")
        if (filter === "Principiante") params.append("nivel", "PRINCIPIANTE")
        if (filter === "Intermedio") params.append("nivel", "INTERMEDIO")
        if (filter === "Avanzado") params.append("nivel", "AVANZADO")
      })

      if (searchQuery) {
        params.append("search", searchQuery)
      }

      const response = await fetch(`/api/partidos?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        const partidos = result.data || []
        
        // Filtrar solo partidos activos y futuros
        const now = new Date()
        const partidosActivos = partidos.filter((p: Partido) => {
          if (p.estado === "CANCELADO" || p.estado === "COMPLETADO") return false
          try {
            const fechaPartido = new Date(`${p.fecha}T${p.hora}`)
            return fechaPartido > now
          } catch {
            return true
          }
        })
        
        // Ordenar por fecha
        const sorted = partidosActivos.sort((a: Partido, b: Partido) => {
          try {
            const dateA = new Date(`${a.fecha}T${a.hora}`)
            const dateB = new Date(`${b.fecha}T${b.hora}`)
            return dateA.getTime() - dateB.getTime()
          } catch {
            return 0
          }
        })
        
        setMatches(sorted)
      }
    } catch (error) {
      console.error("Error cargando partidos:", error)
    } finally {
      setLoading(false)
    }
  }

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
    router.push(`/matches/${matchId}`)
  }

  const handleCreateMatch = () => {
    router.push("/create-match")
  }

  const formatMatchType = (type: string) => {
    return type.replace("FUTBOL_", "F")
  }

    const formatLevel = (level: string) => {
    const levelMap: { [key: string]: string } = {
      PRINCIPIANTE: "Principiante",
      INTERMEDIO: "Intermedio",
      AVANZADO: "Avanzado",
      PROFESIONAL: "Profesional"
    }
    return levelMap[level] || level || "Intermedio"
  }

  const formatDate = (dateString: string, timeString: string) => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (date.toDateString() === today.toDateString()) {
        return `Hoy ${timeString}`
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Mañana ${timeString}`
      } else {
        return `${date.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })} ${timeString}`
      }
    } catch {
      return `${dateString} ${timeString}`
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-12 pb-4 px-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Partidos</h1>
          <Button
            onClick={handleCreateMatch}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 min-h-[40px] min-w-[40px] touch-manipulation"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 px-6">
        <div className="mt-4 mb-4">
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
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-2">Nivel</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Principiante", "Intermedio", "Avanzado"].map((level) => (
                      <button
                        key={level}
                        onClick={() => toggleFilter(level)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedFilters.includes(level)
                            ? "bg-orange-200 text-gray-900"
                            : "bg-white text-gray-700 hover:bg-orange-50"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 pb-24">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando partidos...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">No se encontraron partidos</p>
              <p className="text-sm text-gray-400 mb-4">
                Intenta ajustar los filtros o crea un nuevo partido
              </p>
              <Button
                onClick={handleCreateMatch}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Partido
              </Button>
            </div>
          ) : (
            matches.map((match) => {
              const spotsLeft = match.cantidad_jugadores - match.jugadores_actuales
              
              return (
                <div
                  key={match.id}
                  onClick={() => handleMatchClick(match.id)}
                  className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all touch-manipulation active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                        {formatMatchType(match.tipo_partido)}
                      </Badge>
                      <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                        {formatLevel(match.nivel)}
                      </Badge>
                    </div>
                    <Badge className={`${spotsLeft > 3 ? 'bg-green-100 text-green-800' : spotsLeft > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'} hover:bg-current`}>
                      Quedan {spotsLeft}
                    </Badge>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {formatDate(match.fecha, match.hora)}
                    </h3>
                    <div className="flex items-center text-gray-600 text-sm space-x-4">
                      <span>${match.precio_por_jugador} / jugador</span>
                      <span>•</span>
                      <span>90 min</span>
                    </div>
                    <div className="flex items-center text-gray-600 mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{match.nombre_ubicacion}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {match.jugadores_actuales}/{match.cantidad_jugadores} jugadores
                    </span>
                    <span className="text-sm text-primary font-medium">Ver detalles</span>
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