"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { calcularEdad } from "@/lib/utils"
import type { Usuario } from "@/lib/api"

interface Review { id: number; autor_id: number; autor_nombre: string; rating: number; comentario: string; createdAt: string }
interface FriendRequest { id: number; nombre: string; avatar?: string; mutualFriends: number }
interface Contact { id: number; nombre: string; telefono: string; avatar?: string; isOnApp: boolean }

interface ProfileScreenProps {
  usuario: Usuario
  reviews: Review[]
  friendRequests: FriendRequest[]
  contacts: Contact[]
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ usuario, reviews, friendRequests, contacts }) => {
  const router = useRouter()
  
  // Calcular edad dinámicamente
  const edad = calcularEdad(usuario.fechaNacimiento)

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
              {usuario.foto_perfil ? <AvatarImage src={usuario.foto_perfil} /> : <AvatarFallback className="bg-orange-100 text-2xl">{usuario.nombre?.charAt(0) || "U"}</AvatarFallback>}
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{usuario.nombre} {usuario.apellido}</h2>
              <p className="text-gray-600">{usuario.posicion || "Sin posición"} • {averageRating}★</p>
              <p className="text-sm text-gray-500">Miembro desde {usuario.created_at ? new Date(usuario.created_at).getFullYear() : "..."}</p>
            </div>
            <Button variant="outline" size="sm" className="bg-orange-50 border-orange-200" onClick={handleSettingsClick}><Settings className="w-4 h-4" /></Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Mostrar edad calculada */}
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{edad !== null ? `${edad} años` : "N/A"}</div>
              <div className="text-sm text-gray-600">Edad</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{usuario.altura ? `${usuario.altura} cm` : "N/A"}</div>
              <div className="text-sm text-gray-600">Altura</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{usuario.peso ? `${usuario.peso} kg` : "N/A"}</div>
              <div className="text-sm text-gray-600">Peso</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{averageRating}</div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
          </div>

          {/* Resto del componente... */}
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}