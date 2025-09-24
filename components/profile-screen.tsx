"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Star, Check, X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { FC } from "react"

interface Review {
  id: number
  autor_id: number
  autor_nombre: string
  rating: number
  comentario: string
  createdAt: string
}

interface FriendRequest {
  id: number
  nombre: string
  avatar?: string
  mutualFriends: number
}

interface Contact {
  id: number
  nombre: string
  telefono: string
  avatar?: string
  isOnApp: boolean
}

interface Usuario {
  id: number
  nombre: string
  edad: number
  altura: string
  peso: string
  rating: number
  partidos: number
  amigos: number
  miembroDesde: string
  avatar?: string
}

interface ProfileScreenProps {
  usuario: Usuario
  reviews: Review[]
  friendRequests: FriendRequest[]
  contacts: Contact[]
}

export const ProfileScreen: FC<ProfileScreenProps> = ({
  usuario,
  reviews,
  friendRequests,
  contacts,
}) => {
  const router = useRouter()

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "0"

  const handleReviewClick = (autorId: number) => {
    router.push(`/users/${autorId}`)
  }

  const handleFriendRequestAction = (requestId: number, action: "accept" | "reject") => {
    console.log(`${action} friend request ${requestId}`)
    // Lógica real para aceptar/rechazar
  }

  const handleSettingsClick = () => {
    router.push("/settings")
  }

  const handlePhoneClick = (telefono: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `tel:${telefono}`
  }

  const handleContactClick = (contact: Contact) => {
    if (contact.isOnApp) router.push(`/users/${contact.id}`)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 text-center border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Info usuario */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="w-20 h-20">
              {usuario.avatar ? (
                <AvatarImage src={usuario.avatar} />
              ) : (
                <AvatarFallback className="bg-orange-100 text-2xl">TU</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{usuario.nombre}</h2>
              <p className="text-gray-600">Medio • {usuario.rating.toFixed(1)}★</p>
              <p className="text-sm text-gray-500">Miembro desde {usuario.miembroDesde}</p>
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
              <div className="text-lg font-bold text-gray-900">{usuario.edad} años</div>
              <div className="text-sm text-gray-600">Edad</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{usuario.altura}</div>
              <div className="text-sm text-gray-600">Altura</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{usuario.peso}</div>
              <div className="text-sm text-gray-600">Peso</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{usuario.rating.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{usuario.partidos}</div>
              <div className="text-sm text-gray-600">Partidos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{usuario.amigos}</div>
              <div className="text-sm text-gray-600">Amigos</div>
            </div>
          </div>
        </div>

        {/* Solicitudes de amistad */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Solicitudes de amistad</h3>
            <Badge className="bg-red-100 text-red-800">{friendRequests.length}</Badge>
          </div>
          <div className="space-y-3">
            {friendRequests.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    {r.avatar ? <AvatarImage src={r.avatar} /> : <AvatarFallback className="bg-gray-200">{r.nombre.split(" ").map(n => n[0]).join("")}</AvatarFallback>}
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">{r.nombre}</p>
                    <p className="text-sm text-gray-500">{r.mutualFriends} amigos en común</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={() => handleFriendRequestAction(r.id, "accept")} className="bg-green-600 hover:bg-green-700 text-white p-2"><Check className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => handleFriendRequestAction(r.id, "reject")} className="p-2"><X className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contactos */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Contactos del celular</h3>
          <div className="space-y-3">
            {contacts.map(c => (
              <div key={c.id} className={`flex items-center justify-between p-3 bg-gray-50 rounded-xl ${c.isOnApp ? "cursor-pointer hover:bg-gray-100" : ""}`} onClick={() => handleContactClick(c)}>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    {c.avatar ? <AvatarImage src={c.avatar} /> : <AvatarFallback className="bg-gray-200">{c.nombre.split(" ").map(n => n[0]).join("")}</AvatarFallback>}
                  </Avatar>
                  <div>
                    <button className={`font-medium text-gray-900 ${c.isOnApp ? "hover:text-primary transition-colors" : ""}`} onClick={() => handleContactClick(c)}>{c.nombre}</button>
                    <button className="text-sm text-gray-500 hover:text-primary transition-colors block text-left" onClick={(e) => handlePhoneClick(c.telefono, e)}>{c.telefono}</button>
                  </div>
                </div>
                {c.isOnApp ? <Badge className="bg-green-100 text-green-800">En la app</Badge> : <Button size="sm" variant="outline" className="text-xs bg-transparent">Invitar</Button>}
              </div>
            ))}
          </div>
        </div>

        {/* Reseñas */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Reseñas</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{averageRating}</span>
              <span className="text-sm text-gray-500">({reviews.length})</span>
            </div>
          </div>
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors" onClick={() => handleReviewClick(r.autor_id)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{r.autor_nombre}</span>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{r.comentario}</p>
                <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4 bg-gray-50 border-gray-200">Ver todas las reseñas</Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}