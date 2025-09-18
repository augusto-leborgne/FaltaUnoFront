"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Star, ArrowLeft, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"

// Mock player data
const mockPlayer = {
  id: 1,
  name: "Álvaro Torres",
  position: "Delantero",
  rating: 4.3,
  totalMatches: 47,
  avatar: "/placeholder.svg?height=120&width=120",
  age: 28,
  location: "Montevideo",
  bio: "Jugador experimentado, me gusta el fútbol rápido y técnico. Siempre puntual y con buena onda.",
  stats: {
    goals: 23,
    assists: 15,
    cleanSheets: 0,
  },
  reviews: [
    {
      id: 1,
      author: "Bruno S.",
      rating: 5,
      nivel: 5,
      deportividad: 4,
      companerismo: 5,
      comment: "Excelente jugador, muy técnico y buen compañero.",
      date: "Hace 2 días",
    },
    {
      id: 2,
      author: "Carlos V.",
      rating: 4,
      nivel: 4,
      deportividad: 4,
      companerismo: 4,
      comment: "Buen nivel, siempre da todo en la cancha.",
      date: "Hace 1 semana",
    },
    {
      id: 3,
      author: "Diego R.",
      rating: 4,
      nivel: 3,
      deportividad: 5,
      companerismo: 4,
      comment: "Puntual y con buena actitud. Recomendado.",
      date: "Hace 2 semanas",
    },
  ],
}

interface PlayerProfileProps {
  playerId: string
}

export function PlayerProfile({ playerId }: PlayerProfileProps) {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2 touch-manipulation">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Perfil del Jugador</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Player Info */}
        <div className="text-center mb-8">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src={mockPlayer.avatar || "/placeholder.svg"} />
            <AvatarFallback className="bg-green-100 text-green-700 text-2xl">
              {mockPlayer.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">{mockPlayer.name}</h2>

          <div className="flex items-center justify-center space-x-4 mb-4">
            <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">{mockPlayer.position}</Badge>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{mockPlayer.rating}</span>
              <span className="text-gray-500">({mockPlayer.totalMatches} partidos)</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <span>{mockPlayer.age} años</span>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{mockPlayer.location}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Sobre mí</h3>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-700">{mockPlayer.bio}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Estadísticas</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">{mockPlayer.stats.goals}</div>
              <div className="text-sm text-gray-600">Goles</div>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">{mockPlayer.stats.assists}</div>
              <div className="text-sm text-gray-600">Asistencias</div>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">{mockPlayer.totalMatches}</div>
              <div className="text-sm text-gray-600">Partidos</div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Reseñas</h3>
          <div className="space-y-4">
            {mockPlayer.reviews.map((review) => (
              <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{review.author}</span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{review.date}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Nivel</div>
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2.5 h-2.5 ${
                            i < review.nivel ? "fill-blue-400 text-blue-400" : "text-gray-300"
                          }`}
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
                          className={`w-2.5 h-2.5 ${
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
                          className={`w-2.5 h-2.5 ${
                            i < review.companerismo ? "fill-purple-400 text-purple-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-gray-700 text-sm">{review.comment}</p>
              </div>
            ))}
          </div>
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
