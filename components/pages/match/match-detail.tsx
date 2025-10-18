"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Star, ArrowLeft, Share2, MapPin, Users, DollarSign, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { CompressedMap } from "@/components/google-maps/compressed-map"
import { AuthService } from "@/lib/auth"

interface MatchDetailProps {
  matchId: string
}

interface Jugador {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
  posicion?: string
  rating?: number
}

interface Partido {
  id: string
  tipo_partido: string
  nivel: string
  fecha: string
  hora: string
  duracion_minutos: number
  nombre_ubicacion: string
  direccion_ubicacion?: string
  latitud?: number
  longitud?: number
  cantidad_jugadores: number
  jugadores_actuales: number
  precio_total: number
  precio_por_jugador: number
  descripcion?: string
  estado: string
  organizador_id: string
  organizador?: {
    id: string
    nombre: string
    apellido: string
    foto_perfil?: string
  }
  jugadores?: Jugador[]
}

export function MatchDetail({ matchId }: MatchDetailProps) {
  const router = useRouter()
  const [match, setMatch] = useState<Partido | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchMatch()
  }, [matchId])

  const fetchMatch = async () => {
    try {
      setIsLoading(true)
      const token = AuthService.getToken()
      
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`/api/partidos/${matchId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error("Error al cargar el partido")
      }

      const result = await response.json()
      if (result.success && result.data) {
        setMatch(result.data)
      } else {
        throw new Error(result.message || "Error al cargar el partido")
      }
    } catch (error) {
      console.error("Error cargando partido:", error)
      setError(error instanceof Error ? error.message : "Error al cargar el partido")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinMatch = async () => {
    if (!match) return

    setIsJoining(true)
    try {
      const token = AuthService.getToken()
      const user = AuthService.getUser()
      
      if (!token || !user?.id) {
        router.push("/login")
        return
      }

      const response = await fetch("/api/inscripciones", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          partidoId: match.id,
          usuarioId: user.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al inscribirse")
      }

      router.push(`/matches/${matchId}/confirmed`)
    } catch (error) {
      console.error("Error al inscribirse:", error)
      setError(error instanceof Error ? error.message : "Error al inscribirse al partido")
    } finally {
      setIsJoining(false)
    }
  }

  const loadMatchData = async () => {
    try {
      setIsLoading(true)
      const token = AuthService.getToken()
      
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`/api/partidos/${matchId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error("Error al cargar el partido")
      }

      const result = await response.json()
      console.log("[MatchDetail] Datos recibidos:", result)
      
      if (result.success && result.data) {
        // Normalizar datos del backend
        const normalizedMatch = {
          ...result.data,
          tipo_partido: result.data.tipoPartido || result.data.tipo_partido,
          nivel: result.data.nivel || "INTERMEDIO",
          nombre_ubicacion: result.data.nombreUbicacion || result.data.nombre_ubicacion,
          direccion_ubicacion: result.data.direccionUbicacion || result.data.direccion_ubicacion,
          cantidad_jugadores: result.data.cantidadJugadores || result.data.cantidad_jugadores,
          jugadores_actuales: result.data.jugadoresActuales || result.data.jugadores_actuales || 0,
          precio_total: result.data.precioTotal || result.data.precio_total || 0,
          precio_por_jugador: result.data.precioPorJugador || result.data.precio_por_jugador || 
            (result.data.cantidadJugadores > 0 ? (result.data.precioTotal || 0) / result.data.cantidadJugadores : 0),
          duracion_minutos: result.data.duracionMinutos || result.data.duracion_minutos || 90
        }
        
        setMatch(normalizedMatch)
      } else {
        throw new Error(result.message || "Error al cargar el partido")
      }
    } catch (error) {
      console.error("Error cargando partido:", error)
      setError(error instanceof Error ? error.message : "Error al cargar el partido")
    } finally {
      setIsLoading(false)
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
      title: `Partido de ${formatMatchType(match.tipo_partido)}`,
      text: `¡Únete a este partido! ${formatDate(match.fecha)} ${match.hora} en ${match.nombre_ubicacion}`,
      url: `${window.location.origin}/matches/${matchId}`,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url)
        alert("Link copiado al portapapeles")
      } catch (err) {
        console.error("Error copying to clipboard:", err)
      }
    }
  }

  const formatMatchType = (type: string) => {
    return type.replace("FUTBOL_", "Fútbol ").replace("_", " ")
  }

  const formatLevel = (level: string) => {
    const levelMap: { [key: string]: string } = {
      PRINCIPIANTE: "Principiante",
      INTERMEDIO: "Intermedio",
      AVANZADO: "Avanzado",
      PROFESIONAL: "Profesional"
    }
    return levelMap[level] || level
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando partido...</p>
        </div>
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

  const spotsLeft = match.cantidad_jugadores - match.jugadores_actuales
  const currentUser = AuthService.getUser()
  const isOrganizer = currentUser?.id === match.organizador_id

  return (
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
                {formatMatchType(match.tipo_partido)}
              </Badge>
              <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                {formatLevel(match.nivel)}
              </Badge>
            </div>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              Queda{spotsLeft !== 1 ? "n" : ""} {spotsLeft}
            </Badge>
          </div>

          {/* Match Time */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {formatDate(match.fecha)} {match.hora}
          </h2>

          {/* Match Details */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{match.nombre_ubicacion}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>${match.precio_por_jugador} / jugador</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{match.duracion_minutos || 90} min</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>{match.jugadores_actuales}/{match.cantidad_jugadores}</span>
            </div>
          </div>

          {/* Compressed Map Component */}
          <CompressedMap
            location={match.nombre_ubicacion}
            lat={match.latitud || -34.9011}
            lng={match.longitud || -56.1645}
            className="mb-4"
          />
        </div>

        {/* Organizer Section */}
        {match.organizador && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Organizador</h3>
            <div
              onClick={() => handlePlayerClick(match.organizador!.id)}
              className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Avatar className="w-12 h-12">
                {match.organizador.foto_perfil ? (
                  <AvatarImage src={`data:image/jpeg;base64,${match.organizador.foto_perfil}`} />
                ) : (
                  <AvatarFallback className="bg-orange-100">
                    {match.organizador.nombre?.[0]}{match.organizador.apellido?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <span className="font-semibold text-gray-900">
                  {match.organizador.nombre} {match.organizador.apellido}
                </span>
                <div className="text-sm text-gray-600">Capitán</div>
              </div>
            </div>
          </div>
        )}

        {/* Players Section */}
        {match.jugadores && match.jugadores.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Jugadores ({match.jugadores_actuales}/{match.cantidad_jugadores})
            </h3>

            <div className="space-y-3">
              {match.jugadores.map((player) => (
                <div
                  key={player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      {player.foto_perfil ? (
                        <AvatarImage src={`data:image/jpeg;base64,${player.foto_perfil}`} />
                      ) : (
                        <AvatarFallback className="bg-gray-200">
                          {player.nombre[0]}{player.apellido[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {player.nombre} {player.apellido[0]}.
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        {player.posicion && <span>{player.posicion}</span>}
                        {player.rating && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>{player.rating}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {match.descripcion && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Descripción</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-700">{match.descripcion}</p>
            </div>
          </div>
        )}

        {/* Join Button */}
        <div className="pb-24">
          {isOrganizer ? (
            <Button
              onClick={() => router.push(`/my-matches/${matchId}`)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-2xl"
            >
              Gestionar partido
            </Button>
          ) : (
            <>
              <Button
                onClick={handleJoinMatch}
                disabled={isJoining || spotsLeft === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50"
              >
                {isJoining ? "Procesando..." : spotsLeft === 0 ? "Partido completo" : "Inscribirme"}
              </Button>
              <p className="text-center text-sm text-gray-500 mt-3">
                Tu solicitud quedará pendiente de aprobación
              </p>
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}