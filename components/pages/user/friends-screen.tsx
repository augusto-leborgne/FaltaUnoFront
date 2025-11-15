// components/pages/user/friends-screen.tsx
"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, UserPlus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"
import { API_BASE } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Friend {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
  posicion?: string
  celular?: string
}

interface User {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
  fotoPerfil?: string
  posicion?: string
}

type Tab = 'amigos' | 'contactos'

export function FriendsScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('amigos')
  const [friends, setFriends] = useState<Friend[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [contacts, setContacts] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactsPermissionDenied, setContactsPermissionDenied] = useState(false)

  useEffect(() => {
    loadFriends()
  }, [])

  useEffect(() => {
    // Cargar contactos del celular cuando cambia a la pestaña Contactos
    if (activeTab === 'contactos' && contacts.length === 0 && !contactsPermissionDenied) {
      loadPhoneContacts()
    }
  }, [activeTab])

  const loadFriends = async () => {
    try {
      const token = AuthService.getToken()
      
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_BASE}/api/amistades`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        const amistades = result.data || []
        
        // Extraer datos del amigo de cada amistad
        const currentUser = AuthService.getUser()
        const currentUserId = currentUser?.id
        
        logger.log("[FriendsScreen] Procesando amistades:", amistades.length)
        logger.log("[FriendsScreen] Usuario actual ID:", currentUserId)
        
        const amigos = amistades.map((amistad: any) => {
          // Determinar cuál es el amigo (el que no es el usuario actual)
          const esSolicitante = amistad.usuarioId === currentUserId
          const amigoData = esSolicitante ? amistad.amigo : amistad.usuario
          
          logger.log("[FriendsScreen] Amistad:", {
            usuarioId: amistad.usuarioId,
            amigoId: amistad.amigoId,
            esSolicitante,
            amigoDataId: amigoData?.id
          })
          
          return {
            id: amigoData?.id,
            nombre: amigoData?.nombre,
            apellido: amigoData?.apellido,
            foto_perfil: amigoData?.fotoPerfil,
            posicion: amigoData?.posicion
          }
        })
        .filter((amigo: any) => amigo.id && amigo.id !== currentUserId) // Filtrar amigos sin datos y al usuario actual
        
        // Eliminar duplicados basándose en el ID del amigo
        const uniqueAmigos = amigos.filter((amigo: any, index: number, self: any[]) => 
          index === self.findIndex((a: any) => a.id === amigo.id)
        )
        
        logger.log("[FriendsScreen] Amigos procesados (después de deduplicación):", uniqueAmigos.length)
        setFriends(uniqueAmigos)
      }
    } catch (error) {
      logger.error("Error cargando amigos:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadPhoneContacts = async () => {
    try {
      setLoadingContacts(true)
      
      // Verificar si la API de contactos está disponible
      if (!('contacts' in navigator) || !('ContactsManager' in window)) {
        logger.warn("[FriendsScreen] Contact Picker API no disponible en este navegador")
        setContactsPermissionDenied(true)
        return
      }

      // Solicitar permisos para acceder a contactos
      const props = ['name', 'tel']
      const opts = { multiple: true }
      
      try {
        // @ts-ignore - Contact Picker API
        const phoneContacts = await navigator.contacts.select(props, opts)
        
        logger.log("[FriendsScreen] Contactos del teléfono:", phoneContacts.length)
        
        // Extraer números de teléfono
        const phoneNumbers = phoneContacts.flatMap((contact: any) => 
          contact.tel ? contact.tel.map((t: string) => {
            // Limpiar formato del número: quitar espacios, guiones, paréntesis
            return t.replace(/[\s\-\(\)]/g, '')
          }) : []
        )
        
        logger.log("[FriendsScreen] Números extraídos:", phoneNumbers.length)
        
        if (phoneNumbers.length === 0) {
          setContacts([])
          return
        }

        // Buscar usuarios por números de teléfono
        const token = AuthService.getToken()
        if (!token) {
          router.push("/login")
          return
        }

        const response = await fetch(`${API_BASE}/api/usuarios/buscar-por-telefonos`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ telefonos: phoneNumbers })
        })

        if (response.ok) {
          const result = await response.json()
          const usuariosEncontrados = result.data || []
          
          // Excluir al usuario actual
          const currentUser = AuthService.getUser()
          const filteredContacts = usuariosEncontrados.filter((user: User) => 
            user.id !== currentUser?.id
          )
          
          logger.log("[FriendsScreen] Contactos encontrados en la app:", filteredContacts.length)
          setContacts(filteredContacts)
        } else {
          logger.error("[FriendsScreen] Error al buscar usuarios por teléfono:", response.status)
          setContacts([])
        }
        
      } catch (err) {
        logger.warn("[FriendsScreen] Usuario canceló o denegó acceso a contactos:", err)
        setContactsPermissionDenied(true)
        setContacts([])
      }
      
    } catch (error) {
      logger.error("[FriendsScreen] Error cargando contactos:", error)
      setContacts([])
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleBack = () => router.back()

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`)
  }

  const getFilteredData = () => {
    const data = activeTab === 'amigos' ? friends : contacts
    
    return (data as (Friend | User)[]).filter((item) => {
      const fullName = `${item.nombre} ${item.apellido}`.toLowerCase()
      return fullName.includes(searchQuery.toLowerCase())
    })
  }

  const filteredData = getFilteredData()
  const isLoading = activeTab === 'amigos' ? loading : loadingContacts
  const friendIds = new Set(friends.map(f => f.id))

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-12 sm:pt-16 pb-4 sm:pb-6 px-4 sm:px-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveTab('amigos')}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
              activeTab === 'amigos'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Amigos
            {friends.length > 0 && (
              <span className="ml-2 text-xs">({friends.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('contactos')}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
              activeTab === 'contactos'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Contactos
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={activeTab === 'amigos' ? "Buscar amigos..." : "Buscar usuarios..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 rounded-xl"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 pb-24 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" variant="green" text={`Cargando ${activeTab === 'amigos' ? 'amigos' : 'contactos'}...`} />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? `No se encontraron ${activeTab === 'amigos' ? 'amigos' : 'contactos'}`
                : activeTab === 'amigos'
                  ? "Aún no tienes amigos"
                  : contactsPermissionDenied
                    ? "No se pudo acceder a tus contactos"
                    : "No hay contactos en la app"
              }
            </p>
            {activeTab === 'amigos' && !searchQuery && (
              <Button
                onClick={() => setActiveTab('contactos')}
                className="bg-green-600 hover:bg-green-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Buscar en contactos
              </Button>
            )}
            {activeTab === 'contactos' && !searchQuery && (
              <div className="space-y-3">
                {contactsPermissionDenied ? (
                  <p className="text-sm text-gray-400">
                    Necesitas dar permiso para acceder a tus contactos. 
                    La Contact Picker API puede no estar disponible en este navegador.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-400">
                      Ninguno de tus contactos está en la app todavía.
                    </p>
                    <Button
                      onClick={loadPhoneContacts}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Volver a intentar
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredData.map((item) => {
              const fullName = `${item.nombre} ${item.apellido}`.trim() || "Usuario"
              const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase()
              const isFriend = friendIds.has(item.id)
              const photoField = (item as any).foto_perfil || (item as any).fotoPerfil
              
              return (
                <div
                  key={item.id}
                  onClick={() => handleUserClick(item.id)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      {photoField ? (
                        <AvatarImage src={`data:image/jpeg;base64,${photoField}`} />
                      ) : (
                        <AvatarFallback className="bg-gray-200">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{fullName}</p>
                      {item.posicion && (
                        <p className="text-sm text-gray-500">{item.posicion}</p>
                      )}
                    </div>
                  </div>
                  {isFriend && activeTab === 'contactos' && (
                    <Badge className="bg-green-100 text-green-800">Amigo</Badge>
                  )}
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