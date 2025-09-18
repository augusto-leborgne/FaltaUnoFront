"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Settings, Star, Check, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

const mockReviews = [
  {
    id: 1,
    author: "Carlos M.",
    authorId: 1,
    rating: 5,
    nivel: 5,
    deportividad: 4,
    companerismo: 5,
    comment: "Excelente jugador, muy técnico y buen compañero",
    date: "Hace 2 días",
  },
  {
    id: 2,
    author: "Ana L.",
    authorId: 2,
    rating: 4,
    nivel: 4,
    deportividad: 4,
    companerismo: 4,
    comment: "Buen nivel de juego, siempre puntual",
    date: "Hace 1 semana",
  },
  {
    id: 3,
    author: "Diego R.",
    authorId: 3,
    rating: 4,
    nivel: 3,
    deportividad: 5,
    companerismo: 4,
    comment: "Juega bien en equipo, recomendado",
    date: "Hace 2 semanas",
  },
]

const mockFriendRequests = [
  {
    id: 1,
    name: "Pedro L.",
    avatar: "/placeholder.svg?height=40&width=40",
    mutualFriends: 3,
  },
  {
    id: 2,
    name: "Sofia R.",
    avatar: "/placeholder.svg?height=40&width=40",
    mutualFriends: 1,
  },
]

const mockContacts = [
  {
    id: 1,
    name: "Juan Carlos",
    phone: "+598 99 123 456",
    avatar: "/placeholder.svg?height=40&width=40",
    isOnApp: true,
  },
  {
    id: 2,
    name: "María González",
    phone: "+598 99 654 321",
    avatar: "/placeholder.svg?height=40&width=40",
    isOnApp: false,
  },
]

export function ProfileScreen() {
  const router = useRouter()

  const handleReviewClick = (authorId: number) => {
    router.push(`/users/${authorId}`)
  }

  const handleFriendRequestAction = (requestId: number, action: "accept" | "reject") => {
    console.log(`${action} friend request ${requestId}`)
    // Handle friend request action
  }

  const handleSettingsClick = () => {
    router.push("/settings")
  }

  const handlePhoneClick = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `tel:${phone}`
  }

  const handleContactClick = (contact: (typeof mockContacts)[0]) => {
    if (contact.isOnApp) {
      // Navigate to user profile if they're on the app
      router.push(`/users/${contact.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 text-center border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Profile Info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src="/placeholder.svg?height=80&width=80" />
              <AvatarFallback className="bg-orange-100 text-2xl">TU</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">Tu Usuario</h2>
              <p className="text-gray-600">Medio • 4.2★</p>
              <p className="text-sm text-gray-500">Miembro desde 2024</p>
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

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">25 años</div>
              <div className="text-sm text-gray-600">Edad</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">1.75m</div>
              <div className="text-sm text-gray-600">Altura</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">70kg</div>
              <div className="text-sm text-gray-600">Peso</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">4.2</div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">12</div>
              <div className="text-sm text-gray-600">Partidos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">8</div>
              <div className="text-sm text-gray-600">Amigos</div>
            </div>
          </div>
        </div>

        {/* Friend Requests Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Solicitudes de amistad</h3>
            <Badge className="bg-red-100 text-red-800">{mockFriendRequests.length}</Badge>
          </div>

          <div className="space-y-3">
            {mockFriendRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-200">
                      {request.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">{request.name}</p>
                    <p className="text-sm text-gray-500">{request.mutualFriends} amigos en común</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleFriendRequestAction(request.id, "accept")}
                    className="bg-green-600 hover:bg-green-700 text-white p-2"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFriendRequestAction(request.id, "reject")}
                    className="p-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone Contacts Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Contactos del celular</h3>

          <div className="space-y-3">
            {mockContacts.map((contact) => (
              <div
                key={contact.id}
                className={`flex items-center justify-between p-3 bg-gray-50 rounded-xl ${
                  contact.isOnApp ? "cursor-pointer hover:bg-gray-100" : ""
                }`}
                onClick={() => handleContactClick(contact)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-200">
                      {contact.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <button
                      className={`font-medium text-gray-900 ${
                        contact.isOnApp ? "hover:text-primary transition-colors" : ""
                      }`}
                      onClick={() => handleContactClick(contact)}
                    >
                      {contact.name}
                    </button>
                    <button
                      className="text-sm text-gray-500 hover:text-primary transition-colors block text-left"
                      onClick={(e) => handlePhoneClick(contact.phone, e)}
                    >
                      {contact.phone}
                    </button>
                  </div>
                </div>
                {contact.isOnApp ? (
                  <Badge className="bg-green-100 text-green-800">En la app</Badge>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs bg-transparent">
                    Invitar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Reseñas</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">4.2</span>
              <span className="text-sm text-gray-500">(12)</span>
            </div>
          </div>

          <div className="space-y-4">
            {mockReviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                onClick={() => handleReviewClick(review.authorId)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{review.author}</span>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Nivel</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2 h-2 ${i < review.nivel ? "fill-blue-400 text-blue-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Deportividad</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2 h-2 ${
                            i < review.deportividad ? "fill-green-400 text-green-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Compañerismo</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2 h-2 ${
                            i < review.companerismo ? "fill-purple-400 text-purple-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-1">{review.comment}</p>
                <span className="text-xs text-gray-500">{review.date}</span>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full mt-4 bg-gray-50 border-gray-200">
            Ver todas las reseñas
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
