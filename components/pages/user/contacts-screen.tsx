"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, X, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { UsuarioAPI, AmistadAPI, Usuario } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function ContactsScreen() {
  const router = useRouter()
  const [amigos, setAmigos] = useState<Usuario[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Usuario[]>([])
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [loading, setLoading] = useState(false) // Cambiar a false para UI inmediata
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)

  useEffect(() => {
    loadAmigos()
  }, [])

  const loadAmigos = async () => {
    try {
      // Solo mostrar loading si no hay amigos cargados
      if (amigos.length === 0) {
        setLoading(true)
      }
      
      setError(null)
      
      if (!AuthService.isLoggedIn()) {
        router.push("/login")
        return
      }

      logger.log("[ContactsScreen] Cargando amigos...")
      
      const response = await AmistadAPI.listarAmigos()
      
      logger.log("[ContactsScreen] Amigos response:", response)

      if (!response.success || !response.data) {
        throw new Error(response.message || "No se pudieron cargar los amigos")
      }

      // Extraer los usuarios amigos de la relación de amistad
      const friendsList: Usuario[] = response.data
        .map((amistad: any) => amistad.amigo)
        .filter((amigo: any) => amigo != null && amigo.id && amigo.nombre && amigo.apellido) // ✅ Filter out null/undefined/invalid users
      
      logger.log("[ContactsScreen] Amigos procesados:", friendsList.length)
      setAmigos(friendsList)
    } catch (error) {
      logger.error("[ContactsScreen] Error cargando amigos:", error)
      setError(error instanceof Error ? error.message : "Error al cargar amigos")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (query.trim().length < 2) {
      setSearchResults([])
      setIsSearchMode(false)
      return
    }

    try {
      setSearching(true)
      setIsSearchMode(true)
      setError(null)
      
      const response = await UsuarioAPI.list()
      
      if (response.success && response.data) {
        const currentUser = AuthService.getUser()
        const filtered = response.data.filter((u: Usuario) => {
          // ✅ Filter out null/undefined/invalid users
          if (!u || !u.id || !u.nombre || !u.apellido) return false
          
          const fullName = `${u.nombre} ${u.apellido}`.toLowerCase()
          const matchesSearch = fullName.includes(query.toLowerCase())
          const isNotCurrentUser = u.id !== currentUser?.id
          return matchesSearch && isNotCurrentUser
        })
        setSearchResults(filtered)
      } else {
        setError(response.message || "No se pudieron cargar los usuarios")
      }
    } catch (error) {
      logger.error("[ContactsScreen] Error buscando usuarios:", error)
      setError(error instanceof Error ? error.message : "Error al buscar usuarios. Por favor intenta nuevamente.")
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setIsSearchMode(false)
  }

  const handleBack = () => router.back()

  const handleUserClick = (user: Usuario) => {
    setSelectedUser(user)
  }

  const handleSendFriendRequest = async () => {
    if (!selectedUser) return
    
    setIsSendingRequest(true)
    try {
      logger.log("[ContactsScreen] Enviando solicitud a:", selectedUser.id)
      const response = await AmistadAPI.enviarSolicitud(selectedUser.id!)
      
      if (response.success) {
        alert("Solicitud de amistad enviada. Se notificará al usuario.")
        setSelectedUser(null)
      } else {
        alert(response.message || "Error al enviar solicitud")
      }
    } catch (error) {
      logger.error("[ContactsScreen] Error enviando solicitud:", error)
      alert("Error al enviar solicitud")
    } finally {
      setIsSendingRequest(false)
    }
  }

  const renderUserCard = (user: Usuario, isFriend: boolean = false) => {
    const fullName = `${user.nombre || ""} ${user.apellido || ""}`.trim() || "Usuario"
    const initials = `${user.nombre?.[0] || ""}${user.apellido?.[0] || ""}`.toUpperCase()

    return (
      <div
        key={user.id}
        onClick={() => !isFriend && handleUserClick(user)}
        className={`flex items-center justify-between p-4 bg-gray-50 rounded-xl transition-colors ${
          !isFriend ? "cursor-pointer hover:bg-gray-100 active:scale-[0.98]" : ""
        }`}
      >
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12">
            {user.foto_perfil ? (
              <AvatarImage src={`data:image/jpeg;base64,${user.foto_perfil}`} />
            ) : (
              <AvatarFallback className="bg-orange-100">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <div className="font-medium text-gray-900">{fullName}</div>
            {user.celular && (
              <div className="text-sm text-gray-500">{user.celular}</div>
            )}
          </div>
        </div>

        {isFriend && (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Amigo</Badge>
        )}
        {!isFriend && !isSearchMode && (
          <UserPlus className="w-5 h-5 text-gray-400" />
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" variant="green" text="Cargando contactos..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4 mb-4">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Contactos</h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <Button 
              onClick={() => {
                setError(null)
                if (!isSearchMode) {
                  loadAmigos()
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700"
              size="sm"
            >
              {isSearchMode ? "Cerrar" : "Reintentar"}
            </Button>
          </div>
        )}

        {/* Search Mode - Results */}
        {isSearchMode && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-4">
              {searching ? "Buscando..." : `${searchResults.length} resultado${searchResults.length !== 1 ? "s" : ""}`}
            </div>

            {searching && (
              <div className="text-center py-8">
                <LoadingSpinner size="md" variant="green" />
              </div>
            )}

            {!searching && searchResults.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No se encontraron usuarios
              </div>
            )}

            {!searching && searchResults.map(user => renderUserCard(user, false))}
          </div>
        )}

        {/* Friends List */}
        {!isSearchMode && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-4">
              Tus amigos ({amigos.length})
            </div>

            {amigos.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No tienes amigos todavía</p>
                <p className="text-sm text-gray-400">
                  Usa el buscador para encontrar usuarios y enviar solicitudes de amistad
                </p>
              </div>
            ) : (
              amigos.map(amigo => renderUserCard(amigo, true))
            )}
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-30">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedUser(null)}
          ></div>
          <div className="bg-white rounded-t-2xl w-full max-w-md p-6 transform transition-transform duration-300 translate-y-0 relative z-10">
            <div className="flex items-center justify-center mb-4">
              <Avatar className="w-20 h-20">
                {selectedUser.foto_perfil ? (
                  <AvatarImage src={`data:image/jpeg;base64,${selectedUser.foto_perfil}`} />
                ) : (
                  <AvatarFallback className="bg-orange-100 text-2xl">
                    {`${selectedUser.nombre?.[0] || ""}${selectedUser.apellido?.[0] || ""}`.toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              {selectedUser.nombre} {selectedUser.apellido}
            </h2>
            {selectedUser.celular && (
              <p className="text-sm text-gray-600 text-center mb-2">
                {selectedUser.celular}
              </p>
            )}
            <p className="text-sm text-gray-500 text-center mb-6">
              ¿Quieres enviar una solicitud de amistad?
            </p>

            <Button
              onClick={handleSendFriendRequest}
              disabled={isSendingRequest}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl mb-3"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {isSendingRequest ? "Enviando..." : "Enviar solicitud"}
            </Button>

            <Button
              onClick={() => setSelectedUser(null)}
              variant="outline"
              className="w-full py-4 text-lg font-semibold rounded-2xl"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
