"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Star, ArrowLeft, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"

interface Review { id: number; author: string; rating: number; nivel: number; deportividad: number; companerismo: number; comment: string; date: string }
interface Player {
  id: number
  name: string
  position: string
  rating: number
  totalMatches: number
  avatar?: string
  age: number
  location: string
  bio: string
  stats: { goals: number; assists: number; cleanSheets: number }
  reviews: Review[]
}

export const PlayerProfile: React.FC<{ player: Player }> = ({ player }) => {
  const router = useRouter()
  const handleBack = () => router.back()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <h1 className="text-xl font-bold text-gray-900">Perfil del Jugador</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="text-center mb-8">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            {player.avatar ? <AvatarImage src={player.avatar} /> : <AvatarFallback className="bg-green-100 text-green-700 text-2xl">{player.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>}
          </Avatar>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">{player.name}</h2>
          <div className="flex items-center justify-center space-x-4 mb-4">
            <span className="px-2 py-1 rounded-full bg-orange-100 text-gray-800">{player.position}</span>
            <div className="flex items-center space-x-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /><span className="font-semibold">{player.rating}</span></div>
          </div>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <span>{player.age} años</span>
            <span>•</span>
            <div className="flex items-center space-x-1"><MapPin className="w-3 h-3" /><span>{player.location}</span></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Sobre mí</h3>
          <div className="bg-gray-50 rounded-xl p-4"><p className="text-gray-700">{player.bio}</p></div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Estadísticas</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-gray-50 rounded-xl p-4"><div className="text-2xl font-bold text-gray-900">{player.stats.goals}</div><div className="text-sm text-gray-600">Goles</div></div>
            <div className="text-center bg-gray-50 rounded-xl p-4"><div className="text-2xl font-bold text-gray-900">{player.stats.assists}</div><div className="text-sm text-gray-600">Asistencias</div></div>
            <div className="text-center bg-gray-50 rounded-xl p-4"><div className="text-2xl font-bold text-gray-900">{player.totalMatches}</div><div className="text-sm text-gray-600">Partidos</div></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Reseñas</h3>
          <div className="space-y-4">
            {player.reviews.map(review => (
              <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{review.author}</span>
                    <div className="flex items-center space-x-1">{[...Array(5)].map((_, i) => (<Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />))}</div>
                  </div>
                  <span className="text-xs text-gray-500">{review.date}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center"><div className="text-xs text-gray-600 mb-1">Nivel</div></div>
                  <div className="text-center"><div className="text-xs text-gray-600 mb-1">Deportividad</div></div>
                  <div className="text-center"><div className="text-xs text-gray-600 mb-1">Compañerismo</div></div>
                </div>
                <p className="text-gray-700 text-sm">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pb-24">
          <Button onClick={handleBack} variant="outline" className="w-full py-4 text-lg font-semibold rounded-2xl border-gray-300 bg-transparent">Volver</Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}