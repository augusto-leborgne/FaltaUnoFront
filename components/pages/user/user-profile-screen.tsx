"use client"


import { logger } from '@/lib/logger'
import React, { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Star, ArrowLeft, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import AuthService from "@/lib/auth"
import { calcularEdad } from "@/lib/utils"
import { API_BASE, AmistadAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Review {
  id: string
  usuario_que_califica_id: string
  usuario_calificado_id: string
  partido_id: string
  nivel: number
  deportividad: number
  companerismo: number
  comentario: string
  createdAt: string
}

interface Usuario {
  id: string
  nombre?: string
  apellido?: string
  email?: string
  celular?: string
  fechaNacimiento?: string
  altura?: number
  peso?: number
  posicion?: string
  fotoPerfil?: string
  foto_perfil?: string
  ubicacion?: string
  cedula?: string
  created_at?: string
}

interface UserProfileScreenProps {
  userId: string
}

export default function UserProfileScreen({ userId }: UserProfileScreenProps) {
  const router = useRouter()
  const [user, setUser] = useState<Usuario | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [friendStatus, setFriendStatus] = useState<'none' | 'friends' | 'pending-sent' | 'pending-received'>('none')
  const [mutualFriends, setMutualFriends] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false) // Cambiar a false para UI inmediata
  const [error, setError] = useState<string | null>(null)

  const loadUserProfile = useCallback(async () => {
    try {
      // Solo mostrar loading si no hay usuario cargado
      if (!user) {
        setLoading(true)
      }
      
      setError(null)

      // Esperar un tick para evitar condiciones de carrera con la lectura del token
      const token = await AuthService.ensureToken()
      if (!token) {
        router.push("/login")
        return
      }

      // Usar API_BASE centralizado desde api.ts
      // Usuario
      const userRes = await fetch(`${API_BASE}/api/usuarios/${userId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      
      if (!userRes.ok) {
        // Manejar usuario eliminado (HTTP 410 Gone) o no encontrado (HTTP 404)
        if (userRes.status === 410) {
          throw new Error("Este usuario ya no está disponible")
        }
        if (userRes.status === 404) {
          throw new Error("Usuario no encontrado")
        }
        throw new Error(`Error ${userRes.status}: No se pudo cargar el perfil`)
      }
      
      const userJson = await userRes.json()
      if (!userJson?.data) throw new Error("Usuario no encontrado")
      setUser(userJson.data)

      // Reviews
      const revRes = await fetch(`${API_BASE}/api/reviews/usuario/${userId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (revRes.ok) {
        const revJson = await revRes.json()
        setReviews(revJson?.data || [])
      }

      // Verificar estado de amistad
      const amigosResponse = await AmistadAPI.listarAmigos()
      const pendientesEnviadasResponse = await AmistadAPI.listarSolicitudesEnviadas()
      const pendientesRecibidasResponse = await AmistadAPI.listarSolicitudesPendientes()

      // Obtener amigos del usuario actual
      const misAmigos = amigosResponse.success && amigosResponse.data ? 
        amigosResponse.data.map((amistad: any) => amistad.amigo?.id || amistad.amigoId) : []

      // Obtener amigos del usuario que estamos viendo
      if (misAmigos.length > 0) {
        try {
          const userFriendsRes = await fetch(`${API_BASE}/api/amistad/amigos/${userId}`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          })
          if (userFriendsRes.ok) {
            const userFriendsJson = await userFriendsRes.json()
            const susAmigos = userFriendsJson?.data || []
            
            // Encontrar amigos en común
            const amigosEnComun = susAmigos.filter((amigo: any) => 
              misAmigos.includes(amigo.amigo?.id || amigo.amigoId)
            ).map((amistad: any) => amistad.amigo)
            
            setMutualFriends(amigosEnComun)
            logger.log("[UserProfile] Amigos en común encontrados:", amigosEnComun.length)
          }
        } catch (error) {
          logger.error("[UserProfile] Error cargando amigos en común:", error)
        }
      }

      // Verificar si ya son amigos
      if (amigosResponse.success && amigosResponse.data) {
        const esAmigo = amigosResponse.data.some((amistad: any) => 
          amistad.amigo?.id === userId
        )
        if (esAmigo) {
          setFriendStatus('friends')
          setLoading(false)
          return
        }
      }

      // Verificar si hay solicitud enviada
      if (pendientesEnviadasResponse.success && pendientesEnviadasResponse.data) {
        const solicitudEnviada = pendientesEnviadasResponse.data.some((solicitud: any) =>
          solicitud.amigoId === userId || solicitud.amigo?.id === userId
        )
        if (solicitudEnviada) {
          setFriendStatus('pending-sent')
          setLoading(false)
          return
        }
      }

      // Verificar si hay solicitud recibida
      if (pendientesRecibidasResponse.success && pendientesRecibidasResponse.data) {
        const solicitudRecibida = pendientesRecibidasResponse.data.some((solicitud: any) =>
          solicitud.usuarioId === userId || solicitud.usuario?.id === userId
        )
        if (solicitudRecibida) {
          setFriendStatus('pending-received')
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Error al cargar el perfil")
      }
    } finally {
      setLoading(false)
    }
  }, [router, userId])

  // Carga inicial y cuando cambia el id
  useEffect(() => {
    loadUserProfile()
  }, [loadUserProfile])

  // Re-cargar al volver (popstate) y al recuperar foco
  useEffect(() => {
    const onFocus = () => loadUserProfile()
    const onPopState = () => loadUserProfile()
    window.addEventListener("focus", onFocus)
    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("popstate", onPopState)
    }
  }, [loadUserProfile])

  const handleBack = () => router.back()

  const handleSendFriendRequest = async () => {
    try {
      const response = await AmistadAPI.enviarSolicitud(userId)
      
      if (response.success) {
        setFriendStatus('pending-sent')
      } else {
        alert(response.message || "Error al enviar solicitud")
      }
    } catch (error) {
      logger.error("Error sending friend request:", error)
      alert("Error al enviar solicitud")
    }
  }

  const handleRemoveFriend = async () => {
    if (!confirm("¿Estás seguro de eliminar este amigo?")) {
      return
    }

    try {
      // Primero necesitamos encontrar el amistadId
      const amigosResponse = await AmistadAPI.listarAmigos()
      if (!amigosResponse.success || !amigosResponse.data) {
        throw new Error("No se pudo obtener la lista de amigos")
      }

      const amistad = amigosResponse.data.find((a: any) => 
        (a.amigo?.id === userId) || (a.amigoId === userId)
      )

      if (!amistad || !amistad.id) {
        throw new Error("No se encontró la amistad")
      }

      const response = await AmistadAPI.eliminarAmistad(amistad.id)
      
      if (response.success) {
        setFriendStatus('none')
        setMutualFriends([]) // Limpiar amigos en común
      } else {
        alert(response.message || "Error al eliminar amigo")
      }
    } catch (error) {
      logger.error("Error removing friend:", error)
      alert("Error al eliminar amigo")
    }
  }

  const handleUserClick = (id: string) => router.push(`/users/${id}`)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" variant="green" text="Cargando perfil..." />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="pt-16 pb-6 px-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <button onClick={handleBack} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Perfil de usuario</h1>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-red-600 mb-2 font-medium">{error || "Usuario no encontrado"}</p>
            <p className="text-sm text-muted-foreground mb-4">ID: {userId}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleBack} variant="outline">Volver</Button>
              <Button onClick={loadUserProfile} className="bg-primary hover:bg-primary/90">Reintentar</Button>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  const fullName = `${user.nombre || ""} ${user.apellido || ""}`.trim() || "Usuario"
  const edad = calcularEdad(user.fechaNacimiento)
  const fotoBase64 = (user as any).foto_perfil || (user as any).fotoPerfil
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.nivel + r.deportividad + r.companerismo) / 3, 0) /
          reviews.length
        ).toFixed(1)
      : "0.0"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-border">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Perfil de usuario</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 pb-24">
        {/* User Info */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="w-20 h-20">
              {fotoBase64 ? (
                <AvatarImage src={`data:image/jpeg;base64,${fotoBase64}`} alt={fullName} />
              ) : (
                <AvatarFallback className="bg-muted text-2xl">
                  {fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
              <p className="text-muted-foreground">{(user as any).posicion || "Sin posición preferida"}</p>
              {(user as any).ubicacion && (
                <p className="text-sm text-muted-foreground">{(user as any).ubicacion}</p>
              )}
              {user.celular && <p className="text-sm text-muted-foreground">{user.celular}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{edad !== null ? `${edad}` : "-"}</div>
              <div className="text-sm text-muted-foreground">Edad</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{user.altura ?? "-"}</div>
              <div className="text-sm text-muted-foreground">Altura</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{user.peso ?? "-"}</div>
              <div className="text-sm text-muted-foreground">Peso</div>
            </div>
          </div>

          {/* Amigos en común */}
          {mutualFriends.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="text-sm font-semibold text-gray-900 mb-3">
                Amigos en común ({mutualFriends.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {mutualFriends.slice(0, 5).map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => router.push(`/users/${friend.id}`)}
                    className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <Avatar className="w-6 h-6">
                      {friend.foto_perfil || friend.fotoPerfil ? (
                        <AvatarImage src={`data:image/jpeg;base64,${friend.foto_perfil || friend.fotoPerfil}`} />
                      ) : (
                        <AvatarFallback className="bg-gray-200 text-xs">
                          {friend.nombre?.[0]}{friend.apellido?.[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-sm text-gray-700">{friend.nombre}</span>
                  </div>
                ))}
                {mutualFriends.length > 5 && (
                  <div className="flex items-center px-3 py-2 text-sm text-gray-600">
                    +{mutualFriends.length - 5} más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Friend Request Button */}
          <div className="space-y-3">
            {friendStatus === 'friends' ? (
              <Button
                onClick={handleRemoveFriend}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-xl"
              >
                Eliminar amigo
              </Button>
            ) : friendStatus === 'pending-sent' ? (
              <Button
                disabled
                className="w-full bg-orange-100 text-orange-700 py-3 rounded-xl cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Solicitud enviada
              </Button>
            ) : friendStatus === 'pending-received' ? (
              <Button
                onClick={() => router.push('/friend-requests')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Ver solicitud recibida
              </Button>
            ) : (
              <Button
                onClick={handleSendFriendRequest}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Enviar solicitud de amistad
              </Button>
            )}
            {friendStatus === 'pending-sent' && (
              <p className="text-sm text-orange-600 font-medium text-center">✓ Solicitud enviada correctamente</p>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Reseñas</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{averageRating}</span>
              <span className="text-sm text-muted-foreground">({reviews.length})</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Este usuario aún no tiene reseñas</div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const avgRating = Math.round((review.nivel + review.deportividad + review.companerismo) / 3)
                return (
                  <div
                    key={review.id}
                    className="border-b border-border last:border-b-0 pb-4 last:pb-0 cursor-pointer hover:bg-muted -mx-2 px-2 py-2 rounded-xl transition-colors"
                    onClick={() => handleUserClick(review.usuario_que_califica_id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <button
                        className="font-medium text-foreground hover:text-primary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUserClick(review.usuario_que_califica_id)
                        }}
                      >
                        Usuario {review.usuario_que_califica_id.substring(0, 8)}
                      </button>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < avgRating ? "fill-accent text-accent" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Nivel</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < review.nivel ? "fill-accent text-accent" : "text-muted-foreground"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Deportividad</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.deportividad ? "fill-accent text-accent" : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Compañerismo</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.companerismo ? "fill-accent text-accent" : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {review.comentario && <p className="text-sm text-muted-foreground mb-1">{review.comentario}</p>}
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("es-ES")}
                    </p>
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