"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Clock, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { apiService, type Match } from "@/lib/api"

export function MyMatchesScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Creados")
  const [createdMatches, setCreatedMatches] = useState<Match[]>([])
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true)
        const response = await apiService.getUserMatches()
        if (response.success) {
          // Separate created matches from joined matches based on captain
          const created = response.data.filter((match) => match.captain.id === "current-user-id")
          const joined = response.data.filter((match) => match.captain.id !== "current-user-id")
          setCreatedMatches(created)
          setJoinedMatches(joined)
        }
      } catch (error) {
        console.error("Error loading user matches:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [])

  const handleCreateMatch = () => {
    router.push("/create-match")
  }

  const handleMatchClick = (matchId: string) => {
    if (activeTab === "Creados") {
      // For created matches, go to management screen since user is captain
      router.push(`/my-matches/${matchId}`)
    } else {
      // For inscriptos matches, always go to match detail page
      router.push(`/matches/${matchId}`)
    }
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

  const formatDate = (dateString: string, timeString: string) => {
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
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
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

      <div className="flex-1 px-6">
        <div className="flex bg-orange-50 rounded-2xl p-1 mb-6 mt-4">
          {["Creados", "Inscriptos"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4 pb-24">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Cargando partidos...</p>
            </div>
          ) : (
            <>
              {activeTab === "Creados" &&
                (createdMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No has creado partidos aún</p>
                  </div>
                ) : (
                  createdMatches.map((match) => {
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
                          <div className="flex gap-2">
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Quedan {spotsLeft}</Badge>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{formatDate(match.date, match.time)}</h3>
                          <div className="flex items-center text-gray-600 text-sm space-x-4 mb-2">
                            <div className="flex items-center space-x-1">
                              <span>${match.price} / jugador</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>90 min</span>
                            </div>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{match.location.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-600">
                              {match.currentPlayers}/{match.maxPlayers} jugadores
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ))}

              {activeTab === "Inscriptos" &&
                (joinedMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No tienes partidos inscriptos</p>
                  </div>
                ) : (
                  joinedMatches.map((match) => {
                    const spotsLeft = match.maxPlayers - match.currentPlayers
                    const userStatus = Math.random() > 0.5 ? "confirmado" : "pendiente" // Mock status
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
                            <Badge
                              className={
                                userStatus === "confirmado"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                              }
                            >
                              {userStatus === "confirmado" ? "Confirmado" : "Pendiente"}
                            </Badge>
                          </div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Quedan {spotsLeft}</Badge>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{formatDate(match.date, match.time)}</h3>
                          <div className="flex items-center text-gray-600 text-sm space-x-4 mb-2">
                            <span>${match.price} / jugador</span>
                            <span>90 min</span>
                          </div>
                          <p className="text-gray-600">{match.location.name}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-600">
                              {match.currentPlayers}/{match.maxPlayers} jugadores
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ))}
            </>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
