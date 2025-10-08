"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { UserRegistrationGuard } from "@/components/auth/user-registration-guard"
import { Star, ArrowLeft, Share2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { CompressedMap } from "@/components/compressed-map"
import { apiService, type Match } from "@/lib/api"

interface MatchDetailProps {
  matchId: string
}

export function MatchDetail({ matchId }: MatchDetailProps) {
  const router = useRouter()
  const [match, setMatch] = useState<Match | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const response = await apiService.getMatch(matchId)
        if (response.success) {
          setMatch(response.data)
        }
      } catch (error) {
        setError("Error al cargar el partido")
        console.error("Fetch match error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatch()
  }, [matchId])

  const handleJoinMatch = async () => {
    if (!match) return

    setIsJoining(true)
    try {
      const response = await apiService.joinMatch(match.id)
      if (response.success) {
        router.push(`/matches/${matchId}/confirmed`)
      }
    } catch (error) {
      setError("Error al unirse al partido")
      console.error("Join match error:", error)
    } finally {
      setIsJoining(false)
    }
  }

  const handlePlayerClick = (playerId: string) => {
    router.push(`/users/${playerId}`)
  }

  const handleBack = () => {
    router.back()
  }

  const handleShareMatch = async () => {
    if (!match) return

    const shareData = {
      title: `Partido de ${match.type}`,
      text: `¡Únete a este partido! ${match.date} ${match.time} en ${match.location.name}`,
      url: `https://faltauno.app/matches/${matchId}`,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      navigator.clipboard.writeText(shareData.url)
      alert("Link copiado al portapapeles")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <p className="text-red-600 mb-4">{error || "Partido no encontrado"}</p>
        <Button onClick={() => router.back()} variant="outline">
          Volver
        </Button>
      </div>
    )
  }

  const spotsLeft = match.maxPlayers - match.currentPlayers

  return (
    <UserRegistrationGuard userId="current-user-id">
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="pt-16 pb-6 px-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={handleBack} className="p-2 -ml-2">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Detalle del partido</h1>
            </div>
            <button onClick={handleShareMatch} className="p-2">
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-6">
          {/* Match Info Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            {/* Match Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                  {match.type.replace("FUTBOL_", "Fútbol ")}
                </Badge>
                <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">{match.level}</Badge>
              </div>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                Queda{spotsLeft > 1 ? "n" : ""} {spotsLeft}
              </Badge>
            </div>

            {/* Match Time */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {match.date} {match.time}
            </h2>

            {/* Match Details */}
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
              <div>{match.location.name}</div>
              <div>${match.price} / jugador</div>
              <div>90 min</div>
              <div>{match.level}</div>
            </div>

            {/* Compressed Map Component */}
            <CompressedMap
              location={match.location.name}
              lat={match.location.latitude}
              lng={match.location.longitude}
              className="mb-4"
            />
          </div>

          {/* Players Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Jugadores ({match.currentPlayers}/{match.maxPlayers})
            </h3>

            <div className="space-y-3">
              {match.players.map((player) => (
                <div
                  key={player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors touch-manipulation active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={player.profileImage || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gray-200">
                        {player.firstName[0]}
                        {player.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          {player.firstName} {player.lastName[0]}.
                        </span>
                        {player.id === match.captain.id && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs hover:bg-orange-100">Capitán</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{player.preferences.position}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{player.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {match.description && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Descripción</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-700">{match.description}</p>
              </div>
            </div>
          )}

          {/* Join Button */}
          <div className="pb-24">
            <Button
              onClick={handleJoinMatch}
              disabled={isJoining || spotsLeft === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50"
              size="lg"
            >
              {isJoining ? "Procesando..." : spotsLeft === 0 ? "Partido completo" : "Inscribirme"}
            </Button>
            <p className="text-center text-sm text-gray-500 mt-3">Tu solicitud quedará pendiente de aprobación</p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    </UserRegistrationGuard>
  )
}
