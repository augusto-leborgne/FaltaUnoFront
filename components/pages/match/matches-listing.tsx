"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserRegistrationGuard } from "@/components/auth/user-registration-guard"
import { MapPin, Plus, Search, Filter, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Input } from "@/components/ui/input"
import { apiService, type Match } from "@/lib/api"
import { SecureMap } from "@/components/google-maps/secure-map"

export function MatchesListing() {
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [showFullMap, setShowFullMap] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const quickFilters = [
    { label: "Hoy", type: "date" },
    { label: "Fútbol 5", type: "match-type" },
    { label: "Cerca", type: "location" },
  ]

  const advancedFilters = {
    matchType: ["Fútbol 5", "Fútbol 7", "Fútbol 8", "Fútbol 9", "Fútbol 11"],
    level: ["Principiante", "Intermedio", "Avanzado", "Profesional"],
    date: ["Hoy", "Mañana", "Esta semana", "Próxima semana", "Este mes"],
    gender: ["Mixto", "Hombres", "Mujeres"],
    price: ["Gratis", "Hasta $5", "$5-$10", "$10-$15", "Más de $15"],
    time: ["Mañana", "Tarde", "Noche"],
    location: ["Cerca", "Centro", "Norte", "Sur", "Este", "Oeste"],
  }

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true)
        const filters: any = {}

        selectedFilters.forEach((filter) => {
          if (filter === "Hoy") filters.date = "today"
          if (filter === "Fútbol 5") filters.type = "FUTBOL_5"
          if (filter === "Fútbol 7") filters.type = "FUTBOL_7"
          if (filter === "Cerca") filters.location = "nearby"
          if (filter === "Intermedio") filters.level = "INTERMEDIATE"
          if (filter === "Avanzado") filters.level = "ADVANCED"
        })

        const response = await apiService.getMatches(filters)
        if (response.success) {
          const sortedMatches = response.data.sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.time}`)
            const dateB = new Date(`${b.date} ${b.time}`)
            return dateA.getTime() - dateB.getTime()
          })
          setMatches(sortedMatches)
        }
      } catch (error) {
        console.error("Error loading matches:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [selectedFilters])

  const toggleFilter = (filter: string) => {
    setSelectedFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

  const handleMatchClick = (matchId: string) => {
    router.push(`/matches/${matchId}`)
  }

  const handleCreateMatch = () => {
    router.push("/create-match")
  }

  const handleMapPinClick = (matchId: string) => {
    router.push(`/matches/${matchId}`)
  }

  const formatMatchType = (type: string) => {
    return type.replace("FUTBOL_", "Fútbol ").replace("_", " ")
  }

  const formatLevel = (level: string) => {
    const levelMap: { [key: string]: string } = {
      BEGINNER: "Principiante",
      INTERMEDIATE: "Intermedio",
      ADVANCED: "Avanzado",
    }
    return levelMap[level] || level
  }

  return (
    <UserRegistrationGuard userId="current-user-id">
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
                placeholder="Buscar partidos por ubicación, tipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-1">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.label}
                    onClick={() => toggleFilter(filter.label)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation min-h-[36px] ${
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

            {showAdvancedFilters && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Filtros avanzados</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowAdvancedFilters(false)} className="p-1">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {Object.entries(advancedFilters).map(([category, filters]) => (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-gray-600 mb-2 capitalize">
                        {category === "matchType"
                          ? "Tipo de partido"
                          : category === "level"
                            ? "Nivel"
                            : category === "date"
                              ? "Fecha"
                              : category === "gender"
                                ? "Género"
                                : category === "price"
                                  ? "Precio"
                                  : category === "time"
                                    ? "Horario"
                                    : category === "location"
                                      ? "Ubicación"
                                      : category}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {filters.map((filter) => (
                          <button
                            key={filter}
                            onClick={() => toggleFilter(filter)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              selectedFilters.includes(filter)
                                ? "bg-orange-200 text-gray-900"
                                : "bg-white text-gray-700 hover:bg-orange-50"
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showFullMap ? (
            <div className="pb-24">
              <div className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Mapa de partidos</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowFullMap(false)} className="p-2">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="h-96 relative">
                  <SecureMap center="-34.9011,-56.1645" zoom="12" className="w-full h-full" />

                  <div className="absolute inset-0 pointer-events-none">
                    {matches.map((match, index) => (
                      <div
                        key={match.id}
                        className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
                        style={{
                          left: `${25 + (index % 3) * 25}%`,
                          top: `${25 + Math.floor(index / 3) * 25}%`,
                        }}
                        onClick={() => handleMapPinClick(match.id)}
                      >
                        <div className="bg-green-600 rounded-full w-8 h-8 shadow-lg hover:scale-125 transition-transform border-3 border-white flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {match.location.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-100 rounded-2xl mb-6 overflow-hidden">
                <div
                  className="h-32 bg-white relative cursor-pointer transition-all hover:shadow-sm"
                  onClick={() => setShowFullMap(true)}
                >
                  <div className="absolute inset-0 p-4">
                    <div className="absolute inset-0 opacity-20">
                      <div className="grid grid-cols-8 grid-rows-6 h-full w-full gap-1">
                        {Array.from({ length: 48 }).map((_, i) => (
                          <div key={i} className="bg-gray-300 rounded-sm" />
                        ))}
                      </div>
                    </div>

                    <div className="absolute top-1/3 left-0 right-0 h-1 bg-gray-400 opacity-60" />
                    <div className="absolute top-2/3 left-0 right-0 h-1 bg-gray-400 opacity-60" />
                    <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-gray-400 opacity-60" />
                    <div className="absolute left-3/4 top-0 bottom-0 w-1 bg-gray-400 opacity-60" />

                    {matches.slice(0, 2).map((_, index) => (
                      <div key={index} className={`absolute ${index === 0 ? "top-6 left-8" : "top-16 right-12"}`}>
                        <div className="w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow-sm"></div>
                      </div>
                    ))}

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 rounded-lg px-3 py-2 shadow-sm">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700 font-medium">Toca para ver mapa completo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pb-24">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">Cargando partidos...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No se encontraron partidos</p>
                  </div>
                ) : (
                  matches.map((match) => {
                    const spotsLeft = match.maxPlayers - match.currentPlayers
                    return (
                      <div
                        key={match.id}
                        onClick={() => handleMatchClick(match.id)}
                        className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all touch-manipulation active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex gap-2">
                            <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                              {formatMatchType(match.type)}
                            </Badge>
                            <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                              {formatLevel(match.level)}
                            </Badge>
                          </div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Quedan {spotsLeft}</Badge>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {new Date(match.date).toLocaleDateString("es-ES", {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            {match.time}
                          </h3>
                          <div className="flex items-center text-gray-600 text-sm space-x-4">
                            <span>${match.price} / jugador</span>
                            <span>90 min</span>
                          </div>
                          <p className="text-gray-600 mt-1">{match.location.name}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="flex -space-x-2">
                              {match.players.slice(0, 3).map((player) => (
                                <Avatar
                                  key={player.id}
                                  className="w-8 h-8 border-2 border-white cursor-pointer hover:scale-110 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/users/${player.id}`)
                                  }}
                                >
                                  <AvatarImage src={player.profileImage || "/placeholder.svg"} />
                                  <AvatarFallback className="bg-gray-200 text-xs">
                                    {player.firstName[0]}
                                    {player.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              {match.currentPlayers}/{match.maxPlayers}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}

                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Pulsa un partido para ver el detalle</p>
                </div>
              </div>
            </>
          )}
        </div>

        <BottomNavigation />
      </div>
    </UserRegistrationGuard>
  )
}
