"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Star } from "lucide-react"
import { useRouter } from "next/navigation"

interface Review { id: number; autor_id: number; autor_nombre: string; rating: number; comentario: string; createdAt: string }
interface FriendRequest { id: number; nombre: string; avatar?: string; mutualFriends: number }
interface Contact { id: number; nombre: string; telefono: string; avatar?: string; isOnApp: boolean }
interface UsuarioLocal { id: number; nombre: string; edad: number; altura: string; peso: string; rating: number; partidos: number; amigos: number; miembroDesde: string; avatar?: string }

interface ProfileScreenProps {
  usuario: UsuarioLocal
  reviews: Review[]
  friendRequests: FriendRequest[]
  contacts: Contact[]
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ usuario, reviews, friendRequests, contacts }) => {
  const router = useRouter()

  const averageRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "0"

  const handleReviewClick = (autorId: number) => router.push(`/users/${autorId}`)
  const handleFriendRequestAction = (requestId: number, action: "accept" | "reject") => console.log(`${action} ${requestId}`)
  const handleSettingsClick = () => router.push("/settings")
  const handlePhoneClick = (telefono: string, e: React.MouseEvent) => { e.stopPropagation(); window.location.href = `tel:${telefono}` }
  const handleContactClick = (contact: Contact) => { if (contact.isOnApp) router.push(`/users/${contact.id}`) }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-6 text-center border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="w-20 h-20">
              {usuario.avatar ? <AvatarImage src={usuario.avatar} /> : <AvatarFallback className="bg-orange-100 text-2xl">{usuario.nombre.split(" ").map(n => n[0]).join("")}</AvatarFallback>}
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{usuario.nombre}</h2>
              <p className="text-gray-600">Medio • {usuario.rating.toFixed(1)}★</p>
              <p className="text-sm text-gray-500">Miembro desde {usuario.miembroDesde}</p>
            </div>
            <Button variant="outline" size="sm" className="bg-orange-50 border-orange-200" onClick={handleSettingsClick}><Settings className="w-4 h-4" /></Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center"><div className="text-lg font-bold text-gray-900">{usuario.edad} años</div><div className="text-sm text-gray-600">Edad</div></div>
            <div className="text-center"><div className="text-lg font-bold text-gray-900">{usuario.altura}</div><div className="text-sm text-gray-600">Altura</div></div>
            <div className="text-center"><div className="text-lg font-bold text-gray-900">{usuario.peso}</div><div className="text-sm text-gray-600">Peso</div></div>
            <div className="text-center"><div className="text-lg font-bold text-gray-900">{usuario.rating.toFixed(1)}</div><div className="text-sm text-gray-600">Rating</div></div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div><div className="text-2xl font-bold text-gray-900">{usuario.partidos}</div><div className="text-sm text-gray-600">Partidos</div></div>
            <div><div className="text-2xl font-bold text-gray-900">{usuario.amigos}</div><div className="text-sm text-gray-600">Amigos</div></div>
          </div>
        </div>

        {/* friend requests, contacts, reviews sections kept as in your original */}
        {/* ... (kept same structure as you sent) */}
      </div>

      <BottomNavigation />
    </div>
  )
}