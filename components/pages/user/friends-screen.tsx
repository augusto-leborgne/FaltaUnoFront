// components/pages/user/friends-screen.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, UserPlus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"

interface Friend {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
  posicion?: string
  celular?: string
}

export function FriendsScreen() {
  const router = useRouter()
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFriends()
  }, [])

  const loadFriends = async () => {
    try {
      const token = AuthService.getToken()
      
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch("/api/usuarios", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        const currentUser = AuthService.getUser()
        const allUsers = result.data || []
        
        // Filtrar el usuario actual
        const otherUsers = allUsers.filter((u: any) => u.id !== currentUser?.id)
        setFriends(otherUsers)
      }
    } catch (error) {
      console.error("Error cargando amigos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.back()

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`)
  }

  const filteredFriends = friends.filter(friend => {
    const fullName = `${friend.nombre} ${friend.apellido}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4 mb-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Amigos</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar amigos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 rounded-xl"
          />
        </div>
      </div>

      <div className="flex-1 px-6 py-6 pb-24">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {searchQuery ? "No se encontraron amigos" : "Aún no tienes amigos"}
            </p>
            <Button
              onClick={() => router.push("/contacts")}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Buscar usuarios
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFriends.map((friend) => {
              const fullName = `${friend.nombre} ${friend.apellido}`.trim() || "Usuario"
              const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase()
              
              return (
                <div
                  key={friend.id}
                  onClick={() => handleUserClick(friend.id)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      {friend.foto_perfil ? (
                        <AvatarImage src={`data:image/jpeg;base64,${friend.foto_perfil}`} />
                      ) : (
                        <AvatarFallback className="bg-gray-200">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{fullName}</p>
                      {friend.posicion && (
                        <p className="text-sm text-gray-500">{friend.posicion}</p>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Amigo</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}