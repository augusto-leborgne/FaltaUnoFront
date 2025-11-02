// components/pages/user/profile-screen.tsx
"use client"

import React, { useEffect, useState, useCallback } from "react"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Settings, Star, UserPlus, Phone, Users, LogOut } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useRouter } from "next/navigation"
import { calcularEdad } from "@/lib/utils"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { API_BASE, normalizeUrl } from "@/lib/api"

interface Review {
  id: string
  partido_id: string
  usuario_que_califica_id: string
  usuario_calificado_id: string
  nivel: number
  deportividad: number
  companerismo: number
  comentario?: string
  createdAt: string
}

interface FriendRequest {
  id: string
  requesterId: string
  createdAt: string
}

interface Contact {
  id: string
  nombre: string
  apellido: string
  celular?: string
  foto_perfil?: string
  fotoPerfil?: string
  isOnApp: boolean
}

function ProfileScreenInner() {
  const router = useRouter()
  const { user, loading: userLoading, refreshUser } = useAuth()

  const [reviews, setReviews] = useState<Review[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ⚡ CRÍTICO: Revalidar usuario al montar SOLO UNA VEZ
  useEffect(() => {
    console.log("[ProfileScreen] Revalidando usuario desde servidor...")
    refreshUser().catch(err => {
      console.error("[ProfileScreen] Error revalidando usuario:", err)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ✅ Array vacío para ejecutar solo una vez al montar

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = AuthService.getToken()
      if (!token || !user?.id) {
        setLoading(false)
        return
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      // ⚡ OPTIMIZACIÓN: Cargar todos los datos en paralelo
      const [reviewsResult, frResult, contactsResult] = await Promise.allSettled([
        // Reviews
        fetch(normalizeUrl(`${API_BASE}/api/reviews/usuario/${user.id}`), { headers: authHeaders })
          .then(res => res.ok ? res.json() : null),
        
        // Friend requests
        fetch(normalizeUrl(`${API_BASE}/api/amistades/pendientes`), { headers: authHeaders })
          .then(res => res.ok ? res.json() : null),
        
        // Contacts
        fetch(normalizeUrl(`${API_BASE}/api/usuarios`), { headers: authHeaders })
          .then(res => res.ok ? res.json() : null)
      ])

      // Procesar reviews
      if (reviewsResult.status === 'fulfilled' && reviewsResult.value) {
        setReviews(reviewsResult.value.data || [])
      }

      // Procesar friend requests
      if (frResult.status === 'fulfilled' && frResult.value) {
        setFriendRequests(frResult.value.data || [])
      }

      // Procesar contacts
      if (contactsResult.status === 'fulfilled' && contactsResult.value) {
        const contactsData = contactsResult.value
        const allUsers = contactsData.data || []

        const filteredContacts: Contact[] = allUsers
          .filter((u: any) => 
            u && 
            u.id && 
            u.id !== user.id &&
            u.nombre &&
            u.apellido
          )
          .map((u: any) => ({
            id: u.id,
            nombre: u.nombre || "",
            apellido: u.apellido || "",
            celular: u.celular,
            foto_perfil: u.foto_perfil || u.fotoPerfil,
            isOnApp: true,
          }))

        setContacts(filteredContacts)
      }
    } catch (e) {
      console.error("[ProfileScreen] Error cargando datos del perfil:", e)
      setError("Error al cargar datos del perfil")
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      loadProfileData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // ✅ Solo ejecutar cuando cambie el ID del usuario

  const handleReviewClick = (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId)
    if (review?.usuario_que_califica_id) {
      router.push(`/users/${review.usuario_que_califica_id}`)
    }
  }

  const handleSettingsClick = () => router.push("/settings")
  const handleContactsClick = () => router.push("/contacts")

  const handleLogout = () => {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      AuthService.logout()
      // redirección manejada dentro de AuthService.logout()
    }
  }

  const handlePhoneClick = (telefono: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (telefono) window.location.href = `tel:${telefono}`
  }

  const handleContactClick = (contact: Contact) => {
    if (contact.isOnApp && contact.id) {
      router.push(`/users/${contact.id}`)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" variant="green" text="Cargando perfil..." />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-red-600 mb-4">{error || "No se pudo cargar el perfil"}</p>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    )
  }

  const edad = calcularEdad(user.fechaNacimiento)
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.nivel + r.deportividad + r.companerismo) / 3, 0) /
          reviews.length
        ).toFixed(1)
      : "0.0"
  const fullName = `${user.nombre || ""} ${user.apellido || ""}`.trim() || "Usuario"

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-4 sm:pb-6 text-center border-b border-gray-100">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mi Perfil</h1>
      </div>

      <div className="flex-1 px-3 sm:px-6 py-4 sm:py-6 overflow-y-auto">
        {/* Profile Card */}
        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
            <UserAvatar
              photo={user.foto_perfil || user.foto_perfil}
              name={user.nombre}
              surname={user.apellido}
              className="w-16 h-16 sm:w-20 sm:h-20"
              onClick={handleSettingsClick}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{fullName}</h2>
              <p className="text-sm sm:text-base text-gray-600 truncate">{user.posicion || "Sin posición"} • {averageRating}★</p>
              <p className="text-xs sm:text-sm text-gray-500">
                Miembro desde {user.created_at ? new Date(user.created_at).getFullYear() : "..."}
              </p>
            </div>
            <Button variant="outline" size="sm" className="bg-orange-50 border-orange-200 flex-shrink-0" onClick={handleSettingsClick}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="text-center bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className="text-base sm:text-lg font-bold text-gray-900">{edad !== null ? `${edad}` : "N/A"}</div>
              <div className="text-xs sm:text-sm text-gray-600">Edad</div>
            </div>
            <div className="text-center bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className="text-base sm:text-lg font-bold text-gray-900">{user.altura ? `${user.altura}` : "N/A"}</div>
              <div className="text-xs sm:text-sm text-gray-600">Altura (cm)</div>
            </div>
            <div className="text-center bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className="text-base sm:text-lg font-bold text-gray-900">{user.peso ? `${user.peso}` : "N/A"}</div>
              <div className="text-xs sm:text-sm text-gray-600">Peso (kg)</div>
            </div>
            <div className="text-center bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className="text-base sm:text-lg font-bold text-gray-900">{averageRating}</div>
              <div className="text-xs sm:text-sm text-gray-600">Rating</div>
            </div>
          </div>
        </div>

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Solicitudes de amistad</h3>
              <Badge className="bg-orange-100 text-orange-800 text-xs">{friendRequests.length}</Badge>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {friendRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <UserAvatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" fullName="Nueva solicitud" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">Nueva solicitud</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/friend-requests`)}
                    className="bg-transparent flex-shrink-0 text-xs sm:text-sm"
                  >
                    Ver
                  </Button>
                </div>
              ))}
              {friendRequests.length > 3 && (
                <Button
                  onClick={() => router.push(`/friend-requests`)}
                  className="w-full bg-orange-100 hover:bg-orange-200 text-gray-900 border-0"
                >
                  Ver todas ({friendRequests.length})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Reseñas</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-xs sm:text-sm font-medium">{averageRating}</span>
              <span className="text-xs sm:text-sm text-gray-500">({reviews.length})</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500 text-sm">Aún no tienes reseñas</div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {reviews.slice(0, 3).map((review) => {
                const avgRating = Math.round((review.nivel + review.deportividad + review.companerismo) / 3)
                return (
                  <div
                    key={review.id}
                    onClick={() => handleReviewClick(review.id)}
                    className="border-b border-gray-100 last:border-b-0 pb-3 sm:pb-4 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg sm:rounded-xl transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        Usuario {review.usuario_que_califica_id.substring(0, 8)}
                      </span>
                      <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0 ml-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${i < avgRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">Nivel</div>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < review.nivel ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
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
                                i < review.deportividad ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
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
                                i < review.companerismo ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {review.comentario && <p className="text-sm text-gray-600 mb-1">{review.comentario}</p>}
                    <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString("es-ES")}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Contacts Section */}
        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-20 sm:mb-24">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Contactos</h3>
            <Button variant="outline" size="sm" onClick={handleContactsClick} className="bg-transparent text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Ver todos
            </Button>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <p className="text-gray-500 mb-3 sm:mb-4 text-sm">No hay contactos</p>
              <Button onClick={handleContactsClick} className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Buscar usuarios
              </Button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {contacts.slice(0, 5).map((contact) => {
                const contactName = `${contact.nombre} ${contact.apellido}`.trim() || "Usuario"
                const photo = contact.foto_perfil || contact.fotoPerfil

                return (
                  <div
                    key={contact.id}
                    onClick={() => handleContactClick(contact)}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <UserAvatar photo={photo} name={contact.nombre} surname={contact.apellido} className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{contactName}</p>
                        {contact.celular && (
                          <button
                            className="text-xs sm:text-sm text-gray-500 hover:text-green-600 transition-colors truncate block"
                            onClick={(e) => handlePhoneClick(contact.celular!, e)}
                          >
                            <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1" />
                            {contact.celular}
                          </button>
                        )}
                      </div>
                    </div>
                    {contact.isOnApp && <Badge className="bg-green-100 text-green-800">En la app</Badge>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Logout Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-24">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Sesión</h3>
          <Button onClick={handleLogout} variant="destructive" className="w-full py-3 rounded-xl">
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}

export default function ProfileScreen() {
  return <ProfileScreenInner />
}
export { ProfileScreenInner as ProfileScreen }
