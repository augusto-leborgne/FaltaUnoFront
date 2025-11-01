"use client"

import React, { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ArrowLeft, MapPin, UserPlus, UserMinus, UserX } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { calcularEdad } from "@/lib/utils"
import { API_BASE, normalizeUrl } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Review {
  id: string
  usuario_que_califica_id: string
  usuario_calificado_id: string
  partido_id: string
  nivel: number
  deportividad: number
  companerismo: number
  comentario?: string
  createdAt: string
}

interface PlayerProfileProps {
  playerId: string
}

function PlayerProfile({ playerId }: PlayerProfileProps) {
  const router = useRouter()
  const [player, setPlayer] = useState<any>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [friendshipStatus, setFriendshipStatus] = useState<{
    exists: boolean
    estado?: "PENDIENTE" | "ACEPTADA"
    amistadId?: string
  } | null>(null)
  const [removingFriend, setRemovingFriend] = useState(false)

  useEffect(() => {
    let abort = new AbortController()

    ;(async () => {
      try {
        setLoading(true)
        const token = AuthService.getToken()
        if (!token) {
          router.push("/login")
          return
        }

        // Jugador
        const pUrl = normalizeUrl(`${API_BASE}/api/usuarios/${playerId}`)
        const playerResponse = await fetch(pUrl, {
          headers: AuthService.getAuthHeaders(),
          signal: abort.signal,
        })
        if (!playerResponse.ok) {
          throw new Error("No se pudo cargar el perfil del jugador")
        }
        const playerData = await playerResponse.json()
        setPlayer(playerData.data)

        // Reviews
        const rUrl = normalizeUrl(`${API_BASE}/api/reviews/usuario/${playerId}`)
        const reviewsResponse = await fetch(rUrl, {
          headers: AuthService.getAuthHeaders(),
          signal: abort.signal,
        })
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json()
          setReviews(reviewsData.data || [])
        }

        // Friendship Status
        const fUrl = normalizeUrl(`${API_BASE}/api/amistades/estado/${playerId}`)
        const friendshipResponse = await fetch(fUrl, {
          headers: AuthService.getAuthHeaders(),
          signal: abort.signal,
        })
        if (friendshipResponse.ok) {
          const friendshipData = await friendshipResponse.json()
          setFriendshipStatus(friendshipData.data || null)
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Error cargando perfil del jugador:", err)
          setError(err instanceof Error ? err.message : "Error al cargar el perfil")
        }
      } finally {
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [playerId, router])

  const handleBack = () => {
    router.back()
  }

  const handleSendFriendRequest = async () => {
    setSendingRequest(true)
    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      // POST /api/amistades/{playerId}
      const url = normalizeUrl(`${API_BASE}/api/amistades/${playerId}`)
      const response = await fetch(url, {
        method: "POST",
        headers: AuthService.getAuthHeaders(),
      })

      if (response.ok) {
        setRequestSent(true)
        // Actualizar estado de amistad
        const friendshipData = await response.json()
        setFriendshipStatus({
          exists: true,
          estado: "PENDIENTE",
          amistadId: friendshipData.data?.id
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData?.message || "Error al enviar solicitud")
      }
    } catch (err) {
      console.error("Error enviando solicitud:", err)
      alert("Error al enviar solicitud")
    } finally {
      setSendingRequest(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!confirm("¿Estás seguro de que deseas dejar de ser amigo de esta persona?")) {
      return
    }

    setRemovingFriend(true)
    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      // DELETE /api/amistades/{playerId}
      const url = normalizeUrl(`${API_BASE}/api/amistades/${playerId}`)
      const response = await fetch(url, {
        method: "DELETE",
        headers: AuthService.getAuthHeaders(),
      })

      if (response.ok) {
        setFriendshipStatus(null)
        alert("Amistad eliminada correctamente")
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData?.message || "Error al eliminar amistad")
      }
    } catch (err) {
      console.error("Error eliminando amistad:", err)
      alert("Error al eliminar amistad")
    } finally {
      setRemovingFriend(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="xl" variant="green" text="Cargando perfil..." />
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-red-600 mb-4">{error || "Jugador no encontrado"}</p>
          <Button onClick={handleBack} variant="outline">
            Volver
          </Button>
        </div>
      </div>
    )
  }

  const fullName = `${player.nombre || ""} ${player.apellido || ""}`.trim() || "Usuario"
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase()
  const edad = calcularEdad(player.fechaNacimiento)
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.nivel + r.deportividad + r.companerismo) / 3, 0) / reviews.length).toFixed(1)
    : "0.0"

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Perfil del Jugador</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            {player.fotoPerfil || player.foto_perfil ? (
              <AvatarImage src={`data:image/jpeg;base64,${player.foto_perfil || player.fotoPerfil}`} />
            ) : (
              <AvatarFallback className="bg-green-100 text-green-700 text-2xl">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">{fullName}</h2>

          <div className="flex items-center justify-center space-x-4 mb-4">
            {player.posicion && (
              <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                {player.posicion}
              </Badge>
            )}
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{averageRating}</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            {edad !== null && (
              <>
                <span>{edad} años</span>
                <span>•</span>
              </>
            )}
            {player.ubicacion && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{player.ubicacion}</span>
              </div>
            )}
          </div>
        </div>

        {/* Friend Request Button */}
        <div className="mb-8">
          {friendshipStatus?.estado === "ACEPTADA" ? (
            <Button
              onClick={handleRemoveFriend}
              disabled={removingFriend}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl disabled:opacity-50"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              {removingFriend ? "Eliminando..." : "Dejar de ser amigo"}
            </Button>
          ) : friendshipStatus?.estado === "PENDIENTE" ? (
            <div className="text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <UserX className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-yellow-700 font-medium">Solicitud pendiente</p>
                <p className="text-sm text-yellow-600 mt-1">Esta persona aún no ha aceptado tu solicitud</p>
              </div>
            </div>
          ) : friendshipStatus?.exists ? (
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <UserX className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-blue-700 font-medium">Solicitud recibida</p>
                <p className="text-sm text-blue-600 mt-1">Esta persona te ha enviado una solicitud</p>
              </div>
            </div>
          ) : (
            <>
              <Button
                onClick={handleSendFriendRequest}
                disabled={sendingRequest || requestSent}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {requestSent ? "Solicitud enviada" : sendingRequest ? "Enviando..." : "Enviar solicitud de amistad"}
              </Button>
              {requestSent && (
                <p className="text-sm text-green-600 text-center mt-2">
                  ✓ Solicitud enviada correctamente
                </p>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Estadísticas</h3>
          <div className="grid grid-cols-3 gap-4">
            {player.altura && (
              <div className="text-center bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-900">{player.altura}</div>
                <div className="text-sm text-gray-600">Altura (cm)</div>
              </div>
            )}
            {player.peso && (
              <div className="text-center bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-900">{player.peso}</div>
                <div className="text-sm text-gray-600">Peso (kg)</div>
              </div>
            )}
            <div className="text-center bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">{reviews.length}</div>
              <div className="text-sm text-gray-600">Reseñas</div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Reseñas</h3>

          {reviews.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <p className="text-gray-500">Este jugador aún no tiene reseñas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const avgReviewRating = Math.round((review.nivel + review.deportividad + review.companerismo) / 3)

                return (
                  <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          Usuario {review.usuario_que_califica_id.substring(0, 8)}
                        </span>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < avgReviewRating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString("es-ES")}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">Nivel</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.nivel
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">Deportividad</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.deportividad
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">Compañerismo</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.companerismo
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {review.comentario && (
                      <p className="text-gray-700 text-sm">{review.comentario}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="pb-24">
          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full py-4 text-lg font-semibold rounded-2xl border-gray-300 bg-transparent"
          >
            Volver
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}

export default PlayerProfile
export { PlayerProfile }