"use client"


import { logger } from '@/lib/logger'
import React, { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Star, ArrowLeft, UserPlus, Flag, Shield, ShieldOff, Trash2, UserX } from "lucide-react"
import { useRouter } from "next/navigation"
import AuthService from "@/lib/auth"
import { calcularEdad } from "@/lib/utils"
import { API_BASE, AmistadAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ReportModal } from "@/components/ui/report-modal"
import { useAuth } from "@/hooks/use-auth"

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
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState<Usuario | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [friendStatus, setFriendStatus] = useState<'none' | 'friends' | 'pending-sent' | 'pending-received'>('none')
  const [mutualFriends, setMutualFriends] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false) // Cambiar a false para UI inmediata
  const [error, setError] = useState<string | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [showAdminActions, setShowAdminActions] = useState(false)

  const isAdmin = currentUser?.rol === "ADMIN"

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
          const userFriendsRes = await fetch(`${API_BASE}/api/amistades/amigos/${userId}`, {
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

  const handleAcceptFriendRequest = async () => {
    try {
      // Find the friend request from the user
      const pendientesRecibidasResponse = await AmistadAPI.listarSolicitudesPendientes()
      if (!pendientesRecibidasResponse.success || !pendientesRecibidasResponse.data) {
        throw new Error("No se pudo obtener la lista de solicitudes")
      }

      const solicitud = pendientesRecibidasResponse.data.find((s: any) =>
        s.usuarioId === userId || s.usuario?.id === userId
      )

      if (!solicitud || !solicitud.id) {
        throw new Error("No se encontró la solicitud")
      }

      const response = await AmistadAPI.aceptarSolicitud(solicitud.id)

      if (response.success) {
        setFriendStatus('friends')
        // Reload to get mutual friends
        await loadUserProfile()
      } else {
        alert(response.message || "Error al aceptar solicitud")
      }
    } catch (error) {
      logger.error("Error accepting friend request:", error)
      alert("Error al aceptar solicitud")
    }
  }

  const handleRejectFriendRequest = async () => {
    if (!confirm("¿Estás seguro de rechazar esta solicitud?")) {
      return
    }

    try {
      // Find the friend request from the user
      const pendientesRecibidasResponse = await AmistadAPI.listarSolicitudesPendientes()
      if (!pendientesRecibidasResponse.success || !pendientesRecibidasResponse.data) {
        throw new Error("No se pudo obtener la lista de solicitudes")
      }

      const solicitud = pendientesRecibidasResponse.data.find((s: any) =>
        s.usuarioId === userId || s.usuario?.id === userId
      )

      if (!solicitud || !solicitud.id) {
        throw new Error("No se encontró la solicitud")
      }

      const response = await AmistadAPI.rechazarSolicitud(solicitud.id)

      if (response.success) {
        setFriendStatus('none')
      } else {
        alert(response.message || "Error al rechazar solicitud")
      }
    } catch (error) {
      logger.error("Error rejecting friend request:", error)
      alert("Error al rechazar solicitud")
    }
  }

  const handleUserClick = (id: string) => router.push(`/users/${id}`)

  // Admin functions
  const handleBanUser = async () => {
    const reason = prompt("Motivo del baneo:")
    if (!reason) return

    try {
      const token = AuthService.getToken()
      const response = await fetch(`${API_BASE}/admin/usuarios/${userId}/ban`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        alert("Usuario baneado correctamente")
        loadUserProfile() // Recargar perfil para mostrar estado de baneo
      } else {
        alert("Error al banear usuario")
      }
    } catch (error) {
      logger.error("Error banning user:", error)
      alert("Error al banear usuario")
    }
  }

  const handleUnbanUser = async () => {
    if (!confirm("¿Desbanear este usuario?")) return

    try {
      const token = AuthService.getToken()
      const response = await fetch(`${API_BASE}/admin/usuarios/${userId}/unban`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        alert("Usuario desbaneado correctamente")
        loadUserProfile()
      } else {
        alert("Error al desbanear usuario")
      }
    } catch (error) {
      logger.error("Error unbanning user:", error)
      alert("Error al desbanear usuario")
    }
  }

  const handleToggleRole = async () => {
    const newRole = (user as any).rol === "ADMIN" ? "USER" : "ADMIN"
    if (!confirm(`¿Cambiar rol a ${newRole}?`)) return

    try {
      const token = AuthService.getToken()
      const response = await fetch(`${API_BASE}/admin/usuarios/${userId}/rol`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rol: newRole }),
      })

      if (response.ok) {
        alert(`Rol cambiado a ${newRole} correctamente`)
        loadUserProfile()
      } else {
        alert("Error al cambiar rol")
      }
    } catch (error) {
      logger.error("Error changing role:", error)
      alert("Error al cambiar rol")
    }
  }

  const handleDeleteUser = async () => {
    const confirmText = prompt('Para eliminar permanentemente este usuario, escribe "ELIMINAR":')
    if (confirmText !== "ELIMINAR") return

    try {
      const token = AuthService.getToken()
      const response = await fetch(`${API_BASE}/admin/usuarios/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        alert("Usuario eliminado correctamente")
        router.push("/admin")
      } else {
        const data = await response.json()
        alert(data.message || "Error al eliminar usuario")
      }
    } catch (error) {
      logger.error("Error deleting user:", error)
      alert("Error al eliminar usuario")
    }
  }

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
            <button onClick={handleBack} className="p-2 sm:p-3 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
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
          <button onClick={handleBack} className="p-2 sm:p-3 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
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
              <div className="space-y-2">
                <Button
                  onClick={handleAcceptFriendRequest}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Aceptar solicitud
                </Button>
                <Button
                  onClick={handleRejectFriendRequest}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-xl"
                >
                  Rechazar solicitud
                </Button>
              </div>
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

            {/* Report Button */}
            <Button
              onClick={() => setReportModalOpen(true)}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl"
            >
              <Flag className="w-4 h-4 mr-2" />
              Reportar usuario
            </Button>

            {/* Admin Actions */}
            {isAdmin && (
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-700 uppercase">Acciones de Admin</h4>
                  <Shield className="w-4 h-4 text-orange-600" />
                </div>

                {/* Ban/Unban */}
                {(user as any).bannedAt ? (
                  <div className="space-y-2">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs font-medium text-red-700">Usuario Baneado</p>
                      <p className="text-xs text-red-600 mt-1">
                        Razón: {(user as any).banReason || "Sin razón especificada"}
                      </p>
                    </div>
                    <Button
                      onClick={handleUnbanUser}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl"
                    >
                      <ShieldOff className="w-4 h-4 mr-2" />
                      Desbanear Usuario
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleBanUser}
                    variant="destructive"
                    className="w-full py-3 rounded-xl"
                  >
                    <ShieldOff className="w-4 h-4 mr-2" />
                    Banear Usuario
                  </Button>
                )}

                {/* Toggle Role */}
                <Button
                  onClick={handleToggleRole}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 py-3 rounded-xl"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {(user as any).rol === "ADMIN" ? "Quitar Admin" : "Hacer Admin"}
                </Button>

                {/* Delete User */}
                {!(user as any).deleted_at && (
                  <Button
                    onClick={handleDeleteUser}
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50 py-3 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Usuario Permanentemente
                  </Button>
                )}
              </div>
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

                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2">
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
                              className={`w-3 h-3 ${i < review.deportividad ? "fill-accent text-accent" : "text-muted-foreground"
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
                              className={`w-3 h-3 ${i < review.companerismo ? "fill-accent text-accent" : "text-muted-foreground"
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

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportedUserId={userId}
        reportedUserName={fullName}
      />
    </div>
  )
}