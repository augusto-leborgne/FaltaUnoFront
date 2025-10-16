"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Star, ArrowLeft, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { calcularEdad } from "@/lib/utils"

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
  foto_perfil?: string
  ubicacion?: string
  cedula?: string
  created_at?: string
}

interface UserProfileScreenProps {
  userId: string
}

export function UserProfileScreen({ userId }: UserProfileScreenProps) {
  const router = useRouter()

  const [user, setUser] = useState<Usuario | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [friendRequestSent, setFriendRequestSent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserProfile()
  }, [userId])

  const loadUserProfile = async () => {
    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      // Cargar usuario
      const userResponse = await fetch(`/api/usuarios/${userId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData.data)
      }

      // Cargar reviews
      const reviewsResponse = await fetch(`/api/reviews?usuarioCalificadoId=${userId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json()
        setReviews(reviewsData.data || [])
      }

    } catch (err) {
      console.error("Error cargando perfil:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.back()
  
  const handleSendFriendRequest = async () => {
    try {
      const token = AuthService.getToken()
      const response = await fetch("/api/amistades", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amigoId: userId
        })
      })

      if (response.ok) {
        setFriendRequestSent(true)
      }
    } catch (error) {
      console.error("Error enviando solicitud:", error)
    }
  }

  const handleUserClick = (id: string) => router.push(`/users/${id}`)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Usuario no encontrado</p>
          <Button onClick={handleBack}>Volver</Button>
        </div>
      </div>
    )
  }

  const fullName = `${user.nombre || ""} ${user.apellido || ""}`.trim() || "Usuario"
  const edad = calcularEdad(user.fechaNacimiento)
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.nivel + r.deportividad + r.companerismo) / 3, 0) / reviews.length).toFixed(1)
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

      <div className="flex-1 px-6 py-6">
        {/* User Info */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="w-20 h-20">
              {user.foto_perfil ? (
                <AvatarImage src={`data:image/jpeg;base64,${user.foto_perfil}`} />
              ) : (
                <AvatarFallback className="bg-muted text-2xl">
                  {fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
              <p className="text-muted-foreground">{user.posicion || "Sin posición"}</p>
              {user.ubicacion && (
                <p className="text-sm text-muted-foreground">{user.ubicacion}</p>
              )}
              {user.celular && (
                <p className="text-sm text-muted-foreground">{user.celular}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {edad !== null ? `${edad}` : "-"}
              </div>
              <div className="text-sm text-muted-foreground">Edad</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {user.altura ? `${user.altura}` : "-"}
              </div>
              <div className="text-sm text-muted-foreground">Altura</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {user.peso ? `${user.peso}` : "-"}
              </div>
              <div className="text-sm text-muted-foreground">Peso</div>
            </div>
          </div>

          {/* Friend Request Button */}
          <div className="space-y-3">
            <Button
              onClick={handleSendFriendRequest}
              disabled={friendRequestSent}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {friendRequestSent ? "Solicitud enviada" : "Enviar solicitud de amistad"}
            </Button>
            {friendRequestSent && (
              <p className="text-sm text-primary font-medium text-center">
                ✓ Solicitud enviada correctamente
              </p>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Reseñas</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{averageRating}</span>
              <span className="text-sm text-muted-foreground">({reviews.length})</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Este usuario aún no tiene reseñas
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const avgRating = Math.round((review.nivel + review.deportividad + review.companerismo) / 3)
                
                return (
                  <div
                    key={review.id}
                    className="border-b border-border last:border-b-0 pb-4 last:pb-0 cursor-pointer hover:bg-muted -mx-2 px-2 py-2 rounded-lg transition-colors"
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
                            className={`w-3 h-3 ${
                              i < avgRating 
                                ? "fill-accent text-accent" 
                                : "text-muted-foreground"
                            }`}
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
                              className={`w-3 h-3 ${
                                i < review.nivel 
                                  ? "fill-accent text-accent" 
                                  : "text-muted-foreground"
                              }`}
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
                                i < review.deportividad 
                                  ? "fill-accent text-accent" 
                                  : "text-muted-foreground"
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
                                i < review.companerismo 
                                  ? "fill-accent text-accent" 
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {review.comentario && (
                      <p className="text-sm text-muted-foreground mb-1">{review.comentario}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString('es-ES')}
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