"use client"

import React, { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Star, UserPlus, Phone, Users, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { calcularEdad } from "@/lib/utils"
import { AuthService } from "@/lib/auth"

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
  isOnApp: boolean
}

export function ProfileScreen() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const user = AuthService.getUser()

  useEffect(() => {
    if (!user?.id) {
      router.push("/login")
      return
    }
    loadProfileData()
  }, [user?.id])

  const loadProfileData = async () => {
    try {
      setLoading(true)
      const token = AuthService.getToken()
      if (!token || !user?.id) {
        router.push("/login")
        return
      }

      // Cargar reviews del usuario
      try {
        const reviewsResponse = await fetch(`/api/reviews?usuarioCalificadoId=${user.id}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json()
          setReviews(reviewsData.data || [])
        }
      } catch (e) {
        console.error("Error cargando reviews:", e)
      }

      // Cargar solicitudes de amistad
      try {
        const friendRequestsResponse = await fetch(`/api/usuarios/${user.id}/friend-requests`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        if (friendRequestsResponse.ok) {
          const friendRequestsData = await friendRequestsResponse.json()
          setFriendRequests(friendRequestsData.data || [])
        }
      } catch (e) {
        console.error("Error cargando solicitudes de amistad:", e)
      }

      // Cargar contactos
      try {
        const contactsResponse = await fetch("/api/usuarios", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json()
          const allUsers = contactsData.data || []
          
          // Filtrar usuarios que no sean el usuario actual
          const filteredContacts = allUsers
            .filter((u: any) => u.id !== user.id)
            .map((u: any) => ({
              id: u.id,
              nombre: u.nombre || "",
              apellido: u.apellido || "",
              celular: u.celular,
              foto_perfil: u.fotoPerfil || u.foto_perfil,
              isOnApp: true
            }))
          
          setContacts(filteredContacts)
        }
      } catch (e) {
        console.error("Error cargando contactos:", e)
      }

    } catch (error) {
      console.error("Error cargando datos del perfil:", error)
      setError("Error al cargar datos del perfil")
    } finally {
      setLoading(false)
    }
  }

  const handleReviewClick = (reviewId: string) => {
    // Navegar al perfil del usuario que hizo la review
    const review = reviews.find(r => r.id === reviewId)
    if (review) {
      router.push(`/users/${review.usuario_que_califica_id}`)
    }
  }

  const handleSettingsClick = () => router.push("/settings")
  const handleContactsClick = () => router.push("/contacts")
  const handleLogout = () => {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      AuthService.logout()
      router.push("/login")
    }
  }
  
  const handlePhoneClick = (telefono: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `tel:${telefono}`
  }

  const handleContactClick = (contact: Contact) => {
    if (contact.isOnApp) {
      router.push(`/users/${contact.id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
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

  // Calcular edad y rating promedio
  const edad = calcularEdad(user.fechaNacimiento)
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + (r.nivel + r.deportividad + r.companerismo) / 3, 0) / reviews.length).toFixed(1)
    : "0.0"

  const fullName = `${user.nombre || ""} ${user.apellido || ""}`.trim() || "Usuario"
  const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 text-center border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Profile Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="w-20 h-20">
              {user.foto_perfil ? (
                <AvatarImage src={`data:image/jpeg;base64,${user.foto_perfil}`} alt={fullName} />
              ) : (
                <AvatarFallback className="bg-orange-100 text-2xl">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
              <p className="text-gray-600">
                {user.posicion || "Sin posición"} • {averageRating}★
              </p>
              <p className="text-sm text-gray-500">
                Miembro desde {user.created_at ? new Date(user.created_at).getFullYear() : "..."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-orange-50 border-orange-200"
              onClick={handleSettingsClick}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-bold text-gray-900">
                {edad !== null ? `${edad}` : "N/A"}
              </div>
              <div className="text-sm text-gray-600">Edad</div>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-bold text-gray-900">
                {user.altura ? `${user.altura}` : "N/A"}
              </div>
              <div className="text-sm text-gray-600">Altura (cm)</div>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-bold text-gray-900">
                {user.peso ? `${user.peso}` : "N/A"}
              </div>
              <div className="text-sm text-gray-600">Peso (kg)</div>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-bold text-gray-900">{averageRating}</div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
          </div>
        </div>

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Solicitudes de amistad</h3>
              <Badge className="bg-orange-100 text-orange-800">
                {friendRequests.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {friendRequests.slice(0, 3).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-200">
                        <UserPlus className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">Nueva solicitud</p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/friend-request/${request.requesterId}`)}
                    className="bg-transparent"
                  >
                    Ver
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Reseñas</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{averageRating}</span>
              <span className="text-sm text-gray-500">({reviews.length})</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aún no tienes reseñas
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.slice(0, 3).map((review) => {
                const avgRating = Math.round((review.nivel + review.deportividad + review.companerismo) / 3)
                
                return (
                  <div
                    key={review.id}
                    onClick={() => handleReviewClick(review.id)}
                    className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        Usuario {review.usuario_que_califica_id.substring(0, 8)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < avgRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
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
                      <p className="text-sm text-gray-600 mb-1">{review.comentario}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Contacts Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Contactos</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleContactsClick}
              className="bg-transparent"
            >
              <Users className="w-4 h-4 mr-2" />
              Ver todos
            </Button>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No hay contactos</p>
              <Button
                onClick={handleContactsClick}
                className="bg-green-600 hover:bg-green-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Buscar usuarios
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.slice(0, 5).map((contact) => {
                const contactName = `${contact.nombre} ${contact.apellido}`.trim() || "Usuario"
                const contactInitials = contactName.split(" ").map(n => n[0]).join("").toUpperCase()
                
                return (
                  <div
                    key={contact.id}
                    onClick={() => handleContactClick(contact)}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        {contact.foto_perfil ? (
                          <AvatarImage 
                            src={`data:image/jpeg;base64,${contact.foto_perfil}`}
                            alt={contactName}
                          />
                        ) : (
                          <AvatarFallback className="bg-gray-200">
                            {contactInitials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{contactName}</p>
                        {contact.celular && (
                          <button
                            className="text-sm text-gray-500 hover:text-green-600 transition-colors"
                            onClick={(e) => handlePhoneClick(contact.celular!, e)}
                          >
                            <Phone className="w-3 h-3 inline mr-1" />
                            {contact.celular}
                          </button>
                        )}
                      </div>
                    </div>
                    {contact.isOnApp && (
                      <Badge className="bg-green-100 text-green-800">En la app</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Logout Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-24">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Sesión</h3>
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full py-3 rounded-xl"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}