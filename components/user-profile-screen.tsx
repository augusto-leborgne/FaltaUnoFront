"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Star, ArrowLeft, UserPlus, Check, X } from "lucide-react"
import { useRouter } from "next/navigation"

const mockUserData = {
  id: 1,
  name: "Carlos Martínez",
  position: "Delantero",
  rating: 4.3,
  avatar: "/placeholder.svg?height=80&width=80",
  memberSince: "2023",
  age: 28,
  height: "1.78m",
  weight: "75kg",
  totalMatches: 45,
  bio: "Jugador apasionado del fútbol, siempre busco mejorar mi técnica y disfrutar del juego en equipo.",
  location: "Montevideo, Uruguay",
  preferredPosition: "Delantero",
  isFriend: false,
  hasPendingRequest: false,
  hasReceivedRequest: false,
}

const mockReviews = [
  {
    id: 1,
    author: "Ana López",
    authorId: 2,
    rating: 5,
    nivel: 5,
    deportividad: 4,
    companerismo: 5,
    comment: "Excelente jugador, muy técnico y siempre positivo",
    date: "Hace 1 semana",
  },
  {
    id: 2,
    author: "Diego Rodríguez",
    authorId: 3,
    rating: 4,
    nivel: 4,
    deportividad: 4,
    companerismo: 4,
    comment: "Buen compañero de equipo, juega limpio",
    date: "Hace 2 semanas",
  },
]

const mockContacts = [
  {
    id: 4,
    name: "María González",
    position: "Defensa",
    rating: 4.2,
    avatar: "/placeholder.svg?height=48&width=48",
  },
  {
    id: 5,
    name: "Luis Pérez",
    position: "Medio",
    rating: 4.0,
    avatar: "/placeholder.svg?height=48&width=48",
  },
]

interface UserProfileScreenProps {
  userId: string
}

export function UserProfileScreen({ userId }: UserProfileScreenProps) {
  const router = useRouter()
  const [friendRequestSent, setFriendRequestSent] = useState(false)
  const [requestAccepted, setRequestAccepted] = useState(false)
  const [requestRejected, setRequestRejected] = useState(false)
  const [invitationSent, setInvitationSent] = useState(false)

  const handleBack = () => {
    router.back()
  }

  const handleSendFriendRequest = () => {
    console.log(`Sending friend request to user ${userId}`)
    setFriendRequestSent(true)
  }

  const handleAcceptRequest = () => {
    console.log(`Accepting friend request from user ${userId}`)
    setRequestAccepted(true)
  }

  const handleRejectRequest = () => {
    console.log(`Rejecting friend request from user ${userId}`)
    setRequestRejected(true)
  }

  const handleUserClick = (authorId: number) => {
    router.push(`/users/${authorId}`)
  }

  const handleContactClick = (contactId: number) => {
    router.push(`/users/${contactId}`)
  }

  const handleInviteToMatch = () => {
    console.log(`Inviting user ${userId} to match`)
    setInvitationSent(true)
    setTimeout(() => setInvitationSent(false), 3000)
  }

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
              <AvatarImage src={mockUserData.avatar || "/placeholder.svg"} />
              <AvatarFallback className="bg-muted text-2xl">
                {mockUserData.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{mockUserData.name}</h2>
              <p className="text-muted-foreground">
                {mockUserData.position} • {mockUserData.rating}★
              </p>
              <p className="text-sm text-muted-foreground">Miembro desde {mockUserData.memberSince}</p>
              <p className="text-sm text-muted-foreground">{mockUserData.location}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{mockUserData.age} años</div>
              <div className="text-sm text-muted-foreground">Edad</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{mockUserData.height}</div>
              <div className="text-sm text-muted-foreground">Altura</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{mockUserData.weight}</div>
              <div className="text-sm text-muted-foreground">Peso</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{mockUserData.totalMatches}</div>
              <div className="text-sm text-muted-foreground">Partidos</div>
            </div>
          </div>

          {/* Bio */}
          {mockUserData.bio && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground mb-2">Acerca de</h3>
              <p className="text-muted-foreground text-sm">{mockUserData.bio}</p>
            </div>
          )}

          {/* Friend Request Section */}
          {mockUserData.hasReceivedRequest ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  onClick={handleAcceptRequest}
                  disabled={requestAccepted || requestRejected}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aceptar solicitud
                </Button>
                <Button
                  onClick={handleRejectRequest}
                  disabled={requestAccepted || requestRejected}
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/10 py-3 rounded-xl bg-transparent"
                >
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>
              {requestAccepted && <p className="text-sm text-primary font-medium">✓ Solicitud aceptada</p>}
              {requestRejected && <p className="text-sm text-muted-foreground">Solicitud rechazada</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleSendFriendRequest}
                disabled={mockUserData.isFriend || mockUserData.hasPendingRequest || friendRequestSent}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {mockUserData.isFriend
                  ? "Ya son amigos"
                  : mockUserData.hasPendingRequest || friendRequestSent
                    ? "Solicitud enviada"
                    : "Enviar solicitud de amistad"}
              </Button>
              {friendRequestSent && (
                <p className="text-sm text-primary font-medium">✓ Solicitud enviada correctamente</p>
              )}
            </div>
          )}
        </div>

        {/* Contacts Section */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Amigos en común</h3>
          <div className="space-y-3">
            {mockContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleContactClick(contact.id)}
                className="flex items-center space-x-3 p-3 hover:bg-muted rounded-xl cursor-pointer transition-colors"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-muted">
                    {contact.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{contact.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {contact.position} • ⭐ {contact.rating}
                  </div>
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
              <span className="text-sm font-medium">{mockUserData.rating}</span>
              <span className="text-sm text-muted-foreground">({mockReviews.length})</span>
            </div>
          </div>

          <div className="space-y-4">
            {mockReviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-border last:border-b-0 pb-4 last:pb-0 cursor-pointer hover:bg-muted -mx-2 px-2 py-2 rounded-lg transition-colors"
                onClick={() => handleUserClick(review.authorId)}
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    className="font-medium text-foreground hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUserClick(review.authorId)
                    }}
                  >
                    {review.author}
                  </button>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < review.rating ? "fill-accent text-accent" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Nivel</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2 h-2 ${
                            i < review.nivel ? "fill-blue-400 text-blue-400" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Deportividad</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2 h-2 ${
                            i < review.deportividad ? "fill-green-400 text-green-400" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Compañerismo</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2 h-2 ${
                            i < review.companerismo ? "fill-purple-400 text-purple-400" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-1">{review.comment}</p>
                <span className="text-xs text-muted-foreground">{review.date}</span>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full mt-4 bg-muted border-border">
            Ver todas las reseñas
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
