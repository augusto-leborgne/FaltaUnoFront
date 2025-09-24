"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Star, ArrowLeft, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { UsuarioAPI, ReviewAPI, UsuarioMin, Review, Usuario } from "@/lib/api"

interface UserProfileScreenProps {
  userId: string
}

export function UserProfileScreen({ userId }: UserProfileScreenProps) {
  const router = useRouter()

  const [user, setUser] = useState<Usuario | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [contacts, setContacts] = useState<UsuarioMin[]>([])
  const [friendRequestSent, setFriendRequestSent] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await UsuarioAPI.obtener(userId)
        setUser(res.data)
      } catch (err) {
        console.error("Error fetching user:", err)
      }
    }

    const fetchReviews = async () => {
      try {
        const res = await ReviewAPI.listar()
        const userReviews = res.data.filter(r => r.usuario_calificado_id === userId)
        setReviews(userReviews)
      } catch (err) {
        console.error("Error fetching reviews:", err)
      }
    }

    const fetchContacts = async () => {
      try {
        const res = await UsuarioAPI.listar()
        const otherUsers: UsuarioMin[] = res.data
          .filter(u => u.id !== userId)
          .map(u => ({
            id: u.id,
            nombre: u.nombre,
            apellido: u.apellido,
            foto_perfil: u.foto_perfil ?? "/placeholder.svg", // <- forzamos string
          }))
        setContacts(otherUsers)
      } catch (err) {
        console.error("Error fetching contacts:", err)
      }
    }

    fetchUser()
    fetchReviews()
    fetchContacts()
  }, [userId])

  const handleBack = () => router.back()
  const handleSendFriendRequest = () => setFriendRequestSent(true)
  const handleUserClick = (id: string) => router.push(`/users/${id}`)
  const handleContactClick = (id: string) => router.push(`/users/${id}`)

  if (!user) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>

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
              <AvatarImage src={user.foto_perfil ?? "/placeholder.svg"} />
              <AvatarFallback className="bg-muted text-2xl">{user.nombre[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{user.nombre} {user.apellido}</h2>
              <p className="text-muted-foreground">{user.posicion}</p>
              <p className="text-sm text-muted-foreground">{user.ubicacion}</p>
              <p className="text-sm text-muted-foreground">{user.celular}</p>
            </div>
          </div>

          {/* Datos del usuario */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{user.edad} años</div>
              <div className="text-sm text-muted-foreground">Edad</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{user.altura} m</div>
              <div className="text-sm text-muted-foreground">Altura</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{user.peso} kg</div>
              <div className="text-sm text-muted-foreground">Peso</div>
            </div>
          </div>

          {/* Friend Request Section */}
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
              <p className="text-sm text-primary font-medium">✓ Solicitud enviada correctamente</p>
            )}
          </div>
        </div>

        {/* Contacts Section */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Amigos en común</h3>
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleContactClick(contact.id)}
                className="flex items-center space-x-3 p-3 hover:bg-muted rounded-xl cursor-pointer transition-colors"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={contact.foto_perfil} />
                  <AvatarFallback className="bg-muted">{contact.nombre[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{contact.nombre} {contact.apellido}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Reseñas</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-medium">
                {reviews.length
                  ? (reviews.reduce((a,b)=>a+(b.nivel+b.deportividad+b.companerismo)/3,0)/reviews.length).toFixed(1)
                  : 0
                }
              </span>
              <span className="text-sm text-muted-foreground">({reviews.length})</span>
            </div>
          </div>

          <div className="space-y-4">
            {reviews.map((review) => (
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
                    {review.usuario_que_califica_id}
                  </button>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < Math.round((review.nivel+review.deportividad+review.companerismo)/3) ? "fill-accent text-accent" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Nivel</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-2 h-2 ${i < review.nivel ? "fill-blue-400 text-blue-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Deportividad</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-2 h-2 ${i < review.deportividad ? "fill-green-400 text-green-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Compañerismo</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-2 h-2 ${i < review.companerismo ? "fill-purple-400 text-purple-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{review.comentario}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}