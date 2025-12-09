"use client"


import { logger } from '@/lib/logger'
import React, { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Star, ArrowLeft, UserPlus, Flag, Shield, ShieldOff, Trash2, UserX, AlertCircle } from "lucide-react"
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
  rol?: string // 'USER' | 'ADMIN'
  bannedAt?: string // ISO 8601 timestamp
  banReason?: string
  banUntil?: string // ISO 8601 timestamp
  bannedBy?: string // UUID del admin que baneó
  deleted_at?: string // Para soft-deleted users (ISO 8601)
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
  const [userReported, setUserReported] = useState(false)
  
  // Estados para modal de baneo
  const [showBanModal, setShowBanModal] = useState(false)
  const [banReason, setBanReason] = useState("")
  const [banDuration, setBanDuration] = useState<number | null>(7)
  const [banType, setBanType] = useState<"temporary" | "permanent">("temporary")

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
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json"
        }
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

      // Verificar estado de amistad usando endpoint específico
      try {
        const estadoRes = await fetch(`${API_BASE}/api/amistades/estado/${userId}`, {
          headers: { 
            Authorization: `Bearer ${token}`, 
            "Content-Type": "application/json" 
          },
        })
        
        if (estadoRes.ok) {
          const estadoJson = await estadoRes.json()
          const estado = estadoJson?.data
          
          logger.log("[UserProfile] Estado de amistad recibido:", estado)
          
          if (estado?.existe) {
            if (estado.estado === 'ACEPTADO') {
              logger.log("[UserProfile] Son amigos - estado ACEPTADO")
              setFriendStatus('friends')
            } else if (estado.estado === 'PENDIENTE') {
              // Si solicitudEnviada es true, yo envié la solicitud
              // Si solicitudRecibida es true, yo recibí la solicitud
              if (estado.solicitudEnviada) {
                logger.log("[UserProfile] Solicitud pendiente enviada")
                setFriendStatus('pending-sent')
              } else if (estado.solicitudRecibida) {
                logger.log("[UserProfile] Solicitud pendiente recibida")
                setFriendStatus('pending-received')
              }
            }
          } else {
            logger.log("[UserProfile] No existe relación de amistad")
            setFriendStatus('none')
          }
        } else {
          logger.error("[UserProfile] Error al verificar estado de amistad - Status:", estadoRes.status)
          setFriendStatus('none')
        }
      } catch (error) {
        logger.error("[UserProfile] Error verificando estado de amistad:", error)
        setFriendStatus('none')
      }

      // Obtener amigos en común
      try {
        const amigosResponse = await AmistadAPI.listarAmigos()
        const misAmigos = amigosResponse.success && amigosResponse.data ?
          amigosResponse.data.map((amistad: any) => amistad.amigo?.id || amistad.amigoId) : []

        if (misAmigos.length > 0) {
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
        }
      } catch (error) {
        logger.error("[UserProfile] Error cargando amigos en común:", error)
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
        // Actualización optimista del estado
        setFriendStatus('pending-sent')
        alert("Solicitud enviada correctamente")
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
      // Actualización optimista del estado
      setFriendStatus('none')
      
      // El backend espera el ID del amigo (userId), no el ID de la amistad
      const response = await AmistadAPI.eliminarAmistad(userId)

      if (response.success) {
        alert("Amigo eliminado correctamente")
      } else {
        // Revertir en caso de error
        setFriendStatus('friends')
        alert(response.message || "Error al eliminar amigo")
      }
    } catch (error) {
      logger.error("Error removing friend:", error)
      // Revertir en caso de error
      setFriendStatus('friends')
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

      // Actualización optimista del estado
      setFriendStatus('friends')
      
      const response = await AmistadAPI.aceptarSolicitud(solicitud.id)

      if (response.success) {
        alert("Solicitud aceptada correctamente")
        // Reload to get mutual friends
        await loadUserProfile()
      } else {
        // Revertir en caso de error
        setFriendStatus('pending-received')
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

      // Actualización optimista del estado
      setFriendStatus('none')
      
      const response = await AmistadAPI.rechazarSolicitud(solicitud.id)

      if (response.success) {
        alert("Solicitud rechazada")
      } else {
        // Revertir en caso de error
        setFriendStatus('pending-received')
        alert(response.message || "Error al rechazar solicitud")
      }
    } catch (error) {
      logger.error("Error rejecting friend request:", error)
      alert("Error al rechazar solicitud")
    }
  }

  const handleUserClick = (id: string) => router.push(`/users/${id}`)

  // Admin functions
  const openBanModal = () => {
    setBanReason("")
    setBanDuration(7)
    setBanType("temporary")
    setShowBanModal(true)
  }

  const closeBanModal = () => {
    setShowBanModal(false)
    setBanReason("")
    setBanDuration(7)
    setBanType("temporary")
  }

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      alert("Debes proporcionar una razón para el baneo")
      return
    }

    try {
      const token = AuthService.getToken()
      const response = await fetch(`${API_BASE}/api/admin/usuarios/${userId}/ban`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: banReason,
          durationDays: banType === "permanent" ? null : banDuration
        }),
      })

      if (response.ok) {
        alert(`Usuario baneado ${banType === "permanent" ? "permanentemente" : `por ${banDuration} días`}`)
        closeBanModal()
        // Recargar datos para reflejar el baneo
        await loadUserProfile()
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
      const response = await fetch(`${API_BASE}/api/admin/usuarios/${userId}/unban`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        alert("Usuario desbaneado correctamente")
        // Recargar datos para reflejar el desbaneo
        await loadUserProfile()
      } else {
        alert("Error al desbanear usuario")
      }
    } catch (error) {
      logger.error("Error unbanning user:", error)
      alert("Error al desbanear usuario")
    }
  }

  const handleToggleRole = async () => {
    const newRole = user?.rol === "ADMIN" ? "USER" : "ADMIN"
    if (!confirm(`¿Cambiar rol a ${newRole}?`)) return

    try {
      const token = AuthService.getToken()
      const response = await fetch(`${API_BASE}/api/admin/usuarios/${userId}/rol`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rol: newRole }),
      })

      if (response.ok) {
        // Actualización optimista del estado
        setUser(prev => prev ? { ...prev, rol: newRole } : null)
        
        alert(`Rol cambiado a ${newRole} correctamente`)
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
      const response = await fetch(`${API_BASE}/api/admin/usuarios/${userId}`, {
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
      <div className="min-h-screen flex items-center justify-center bg-white px-2 xs:px-3 sm:px-4 md:px-6">
        <LoadingSpinner size="lg" variant="green" text="Cargando perfil..." />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="pt-12 xs:pt-14 sm:pt-16 md:pt-18 pb-2 xs:pb-3 sm:pb-4 sm:pb-5 md:pb-6 px-2 xs:px-3 sm:px-4 md:px-6 border-b border-border">
          <div className="flex items-center space-x-3 xs:space-x-2 xs:space-x-3 sm:space-x-4">
            <button onClick={handleBack} className="p-2 xs:p-2.5 sm:p-3 -ml-2 min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] min-w-[36px] xxs:min-w-[38px] xs:min-w-[40px] sm:min-w-[42px] md:min-w-[44px] xxs:min-w-[42px] xs:min-w-[44px] sm:min-w-[46px] md:min-w-[48px] flex items-center justify-center active:scale-95 transition-transform">
              <ArrowLeft className="w-4 xs:w-5 h-4 xs:h-5 text-muted-foreground" />
            </button>
            <h1 className="text-xs xs:text-sm sm:text-base md:text-lg md:text-xl md:text-xl font-bold text-foreground">Perfil de usuario</h1>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-2 xs:px-3 sm:px-4 md:px-6">
          <div className="text-center max-w-md mx-auto">
            <p className="text-xs xs:text-sm sm:text-base text-red-600 mb-2 font-medium">{error || "Usuario no encontrado"}</p>
            <p className="text-xs xs:text-sm text-muted-foreground mb-3 xs:mb-4">ID: {userId}</p>
            <div className="flex gap-2 xs:gap-3 justify-center">
              <Button onClick={handleBack} variant="outline" className="min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] px-4 xs:px-5 text-sm xs:text-base">Volver</Button>
              <Button onClick={loadUserProfile} className="bg-primary hover:bg-primary/90 min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] px-4 xs:px-5 text-sm xs:text-base">Reintentar</Button>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  const fullName = `${user.nombre || ""} ${user.apellido || ""}`.trim() || "Usuario"
  const edad = calcularEdad(user.fechaNacimiento)
  const fotoBase64 = user?.foto_perfil || user?.fotoPerfil
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
      <div className="pt-6 xs:pt-8 sm:pt-10 md:pt-12 pb-3 sm:pb-4 md:pb-5 px-3 sm:px-4 md:px-6 border-b border-border bg-white safe-top">
        <div className="flex items-center space-x-3 xs:space-x-2 xs:space-x-3 sm:space-x-4">
          <button onClick={handleBack} className="p-2 xs:p-2.5 sm:p-3 -ml-2 min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] min-w-[36px] xxs:min-w-[38px] xs:min-w-[40px] sm:min-w-[42px] md:min-w-[44px] xxs:min-w-[42px] xs:min-w-[44px] sm:min-w-[46px] md:min-w-[48px] flex items-center justify-center active:scale-95 transition-transform">
            <ArrowLeft className="w-4 xs:w-5 h-4 xs:h-5 text-muted-foreground" />
          </button>
          <h1 className="text-xs xs:text-sm sm:text-base md:text-lg md:text-xl md:text-xl font-bold text-foreground">Perfil de usuario</h1>
        </div>
      </div>

      <div className="flex-1 px-2 xs:px-3 sm:px-4 md:px-6 py-3 xs:py-4 sm:py-5 md:py-6 pb-18 xs:pb-20 sm:pb-22 md:pb-24">
        {/* User Info */}
        <div className="max-w-3xl mx-auto">
        <div className="bg-card border border-border rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
          <div className="flex items-center space-x-3 xs:space-x-2 xs:space-x-3 sm:space-x-4 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
            <Avatar className="w-16 xs:w-18 sm:w-20 h-16 xs:h-18 sm:h-20">
              {fotoBase64 ? (
                <AvatarImage src={`data:image/jpeg;base64,${fotoBase64}`} alt={fullName} />
              ) : (
                <AvatarFallback className="bg-muted text-lg xs:text-xl sm:text-2xl">
                  {fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs xs:text-sm sm:text-base md:text-lg md:text-xl md:text-xl font-bold text-foreground truncate">{fullName}</h2>
              <p className="text-xs xs:text-sm text-muted-foreground truncate">{user?.posicion || "Sin posición preferida"}</p>
              {user?.ubicacion && (
                <p className="text-xs xs:text-sm text-muted-foreground truncate">{user?.ubicacion}</p>
              )}
              {user.celular && <p className="text-xs xs:text-sm text-muted-foreground">{user.celular}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
            <div className="text-center">
              <div className="text-xs xs:text-sm sm:text-base md:text-lg md:text-base font-bold text-foreground">{edad !== null ? `${edad}` : "-"}</div>
              <div className="text-xs xs:text-sm text-muted-foreground">Edad</div>
            </div>
            <div className="text-center">
              <div className="text-xs xs:text-sm sm:text-base md:text-lg md:text-base font-bold text-foreground">{user.altura ?? "-"}</div>
              <div className="text-xs xs:text-sm text-muted-foreground">Altura</div>
            </div>
            <div className="text-center">
              <div className="text-xs xs:text-sm sm:text-base md:text-lg md:text-base font-bold text-foreground">{user.peso ?? "-"}</div>
              <div className="text-xs xs:text-sm text-muted-foreground">Peso</div>
            </div>
          </div>

          {/* Amigos en común */}
          {mutualFriends.length > 0 && (
            <div className="mb-3 xs:mb-4 sm:mb-5 md:mb-6 p-3 xs:p-4 bg-gray-50 rounded-lg xs:rounded-xl">
              <div className="text-xs xs:text-sm font-semibold text-gray-900 mb-2 xs:mb-3">
                Amigos en común ({mutualFriends.length})
              </div>
              <div className="flex flex-wrap gap-1.5 xs:gap-2">
                {mutualFriends.slice(0, 5).map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => router.push(`/users/${friend.id}`)}
                    className="flex items-center space-x-1.5 xs:space-x-2 bg-white px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 active:scale-95 transition-all min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px]"
                  >
                    <Avatar className="w-5 xs:w-6 h-5 xs:h-6">
                      {friend.foto_perfil || friend.fotoPerfil ? (
                        <AvatarImage src={`data:image/jpeg;base64,${friend.foto_perfil || friend.fotoPerfil}`} />
                      ) : (
                        <AvatarFallback className="bg-gray-200 text-xs">
                          {friend.nombre?.[0]}{friend.apellido?.[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-xs xs:text-sm text-gray-700">{friend.nombre}</span>
                  </div>
                ))}
                {mutualFriends.length > 5 && (
                  <div className="flex items-center px-2 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm text-gray-600">
                    +{mutualFriends.length - 5} más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Friend Request Button */}
          <div className="space-y-2 xs:space-y-3">
            {friendStatus === 'friends' ? (
              <Button
                onClick={handleRemoveFriend}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base"
              >
                Eliminar amigo
              </Button>
            ) : friendStatus === 'pending-sent' ? (
              <Button
                disabled
                className="w-full bg-orange-100 text-orange-700 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl cursor-not-allowed text-sm xs:text-base"
              >
                <UserPlus className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
                Solicitud enviada
              </Button>
            ) : friendStatus === 'pending-received' ? (
              <div className="space-y-2">
                <Button
                  onClick={handleAcceptFriendRequest}
                  className="w-full bg-green-600 hover:bg-green-700 text-white min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base"
                >
                  <UserPlus className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
                  Aceptar solicitud
                </Button>
                <Button
                  onClick={handleRejectFriendRequest}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base"
                >
                  Rechazar solicitud
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSendFriendRequest}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base"
              >
                <UserPlus className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
                Enviar solicitud de amistad
              </Button>
            )}
            {friendStatus === 'pending-sent' && (
              <p className="text-xs xs:text-sm text-orange-600 font-medium text-center">✓ Solicitud enviada correctamente</p>
            )}

            {/* Report Button */}
            {userReported ? (
              <div className="w-full border-2 border-green-200 bg-green-50 text-green-700 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base flex items-center justify-center">
                <Flag className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
                Usuario reportado ✓
              </div>
            ) : (
              <Button
                onClick={() => setReportModalOpen(true)}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base"
              >
                <Flag className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
                Reportar usuario
              </Button>
            )}

            {/* Admin Actions */}
            {isAdmin && (
              <div className="border-t pt-3 xs:pt-4 mt-3 xs:mt-4 space-y-2 xs:space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs xs:text-sm font-bold text-gray-700 uppercase">Acciones de Admin</h4>
                  <Shield className="w-3.5 xs:w-4 h-3.5 xs:h-4 text-orange-600" />
                </div>

                {/* Ban/Unban */}
                {user?.bannedAt ? (
                  <div className="space-y-2">
                    <div className="bg-red-50 border border-red-200 rounded-lg xs:rounded-xl p-2.5 xs:p-3">
                      <p className="text-[10px] xs:text-xs font-medium text-red-700">Usuario Baneado</p>
                      <p className="text-[10px] xs:text-xs text-red-600 mt-1">
                        Razón: {user?.banReason || "Sin razón especificada"}
                      </p>
                    </div>
                    <Button
                      onClick={handleUnbanUser}
                      className="w-full bg-green-600 hover:bg-green-700 text-white min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base"
                    >
                      <ShieldOff className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
                      Desbanear Usuario
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={openBanModal}
                    variant="destructive"
                    className="w-full min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base"
                  >
                    <ShieldOff className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
                    Banear Usuario
                  </Button>
                )}

                {/* Toggle Role */}
                <Button
                  onClick={handleToggleRole}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base"
                >
                  <Shield className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
                  {user?.rol === "ADMIN" ? "Quitar Admin" : "Hacer Admin"}
                </Button>

                {/* Delete User */}
                {!user?.deleted_at && (
                  <Button
                    onClick={handleDeleteUser}
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] py-2.5 xs:py-3 rounded-xl text-sm xs:text-base"
                  >
                    <Trash2 className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
                    Eliminar Usuario Permanentemente
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Reviews */}
        <div className="max-w-3xl mx-auto">
        <div className="bg-card border border-border rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
          <div className="flex items-center justify-between mb-3 xs:mb-4">
            <h3 className="text-xs xs:text-sm sm:text-base md:text-lg md:text-base font-bold text-foreground">Reseñas</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-3 xs:w-3.5 sm:w-4 h-3 xs:h-3.5 sm:h-4 fill-accent text-accent" />
              <span className="text-xs xs:text-sm font-medium">{averageRating}</span>
              <span className="text-xs xs:text-sm text-muted-foreground">({reviews.length})</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-6 xs:py-8 text-xs xs:text-sm text-muted-foreground">Este usuario aún no tiene reseñas</div>
          ) : (
            <div className="space-y-3 xs:space-y-4">
              {reviews.map((review) => {
                const avgRating = Math.round((review.nivel + review.deportividad + review.companerismo) / 3)
                return (
                  <div
                    key={review.id}
                    className="border-b border-border last:border-b-0 pb-2 xs:pb-3 sm:pb-4 last:pb-0 cursor-pointer hover:bg-muted -mx-2 px-2 py-1.5 xs:py-2 rounded-lg xs:rounded-xl transition-colors min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] flex flex-col justify-center"
                    onClick={() => handleUserClick(review.usuario_que_califica_id)}
                  >
                    <div className="flex items-center justify-between mb-1.5 xs:mb-2">
                      <button
                        className="text-xs xs:text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[32px] flex items-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUserClick(review.usuario_que_califica_id)
                        }}
                      >
                        Usuario {review.usuario_que_califica_id.substring(0, 8)}
                      </button>
                      <div className="flex items-center space-x-0.5 xs:space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-2.5 xs:w-3 h-2.5 xs:h-3 ${i < avgRating ? "fill-accent text-accent" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 xs:gap-1.5 sm:gap-2 mb-1.5 xs:mb-2">
                      <div className="text-center">
                        <div className="text-[10px] xs:text-xs text-muted-foreground mb-0.5 xs:mb-1">Nivel</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-2 xs:w-2.5 sm:w-3 h-2 xs:h-2.5 sm:h-3 ${i < review.nivel ? "fill-accent text-accent" : "text-muted-foreground"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] xs:text-xs text-muted-foreground mb-0.5 xs:mb-1">Deportividad</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-2 xs:w-2.5 sm:w-3 h-2 xs:h-2.5 sm:h-3 ${i < review.deportividad ? "fill-accent text-accent" : "text-muted-foreground"
                                }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] xs:text-xs text-muted-foreground mb-0.5 xs:mb-1">Compañerismo</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-2 xs:w-2.5 sm:w-3 h-2 xs:h-2.5 sm:h-3 ${i < review.companerismo ? "fill-accent text-accent" : "text-muted-foreground"
                                }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {review.comentario && <p className="text-xs xs:text-sm text-muted-foreground mb-1">{review.comentario}</p>}
                    <p className="text-[10px] xs:text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </div>
      </div>

      <BottomNavigation />

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportedUserId={userId}
        reportedUserName={fullName}
        onReportSuccess={() => setUserReported(true)}
      />

      {/* Ban Modal */}
      {showBanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeBanModal}
        >
          <div
            className="max-w-md w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 p-6 pb-0">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldOff className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Banear Usuario
                </h3>
                <p className="text-sm text-gray-500">
                  {user?.nombre} {user?.apellido}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="mb-6 space-y-4 px-6">
              {/* Tipo de baneo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Tipo de baneo
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="banType"
                      value="temporary"
                      checked={banType === "temporary"}
                      onChange={(e) => setBanType(e.target.value as "temporary" | "permanent")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Temporal</div>
                      <div className="text-xs text-gray-600">Banear por un período específico</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="banType"
                      value="permanent"
                      checked={banType === "permanent"}
                      onChange={(e) => setBanType(e.target.value as "temporary" | "permanent")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 text-red-600">Permanente</div>
                      <div className="text-xs text-gray-600">Banear indefinidamente</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Duración (solo si es temporal) */}
              {banType === "temporary" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Duración del baneo
                  </label>
                  <select
                    value={banDuration || 7}
                    onChange={(e) => setBanDuration(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1 día</option>
                    <option value="3">3 días</option>
                    <option value="7">7 días (1 semana)</option>
                    <option value="14">14 días (2 semanas)</option>
                    <option value="30">30 días (1 mes)</option>
                    <option value="90">90 días (3 meses)</option>
                  </select>
                </div>
              )}

              {/* Razón del baneo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Razón del baneo *
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Describe el motivo del baneo..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
                <p className="text-xs text-gray-500">
                  Esta razón será visible para el usuario cuando intente iniciar sesión.
                </p>
              </div>

              {/* Advertencia */}
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-medium mb-1">Esta acción es irreversible:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>El usuario no podrá iniciar sesión</li>
                      <li>Todas sus sesiones activas serán cerradas</li>
                      {banType === "permanent" && <li className="font-bold">El baneo será PERMANENTE</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-0">
              <Button
                onClick={closeBanModal}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBanUser}
                variant="destructive"
                className="flex-1"
                disabled={!banReason.trim()}
              >
                <ShieldOff className="h-4 w-4 mr-1" />
                {banType === "permanent" ? "Banear Permanentemente" : `Banear ${banDuration} días`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}