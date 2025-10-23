"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, UserPlus, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { AuthService } from "@/lib/auth"
import { UsuarioAPI } from "@/lib/api"

interface Contact {
  id: string
  nombre: string
  apellido: string
  celular: string
  foto_perfil?: string
  isOnApp: boolean
}

export function ContactsScreen() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [invitedContacts, setInvitedContacts] = useState<string[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!AuthService.isLoggedIn()) {
        router.push("/login")
        return
      }

      const currentUser = AuthService.getUser()
      
      console.log("[ContactsScreen] Cargando usuarios...")
      
      // Usar UsuarioAPI en lugar de fetch directo
      const response = await UsuarioAPI.list()
      
      console.log("[ContactsScreen] Response:", response)

      if (!response.success || !response.data) {
        throw new Error(response.message || "No se pudieron cargar los usuarios")
      }

      const allUsers = response.data
      
      // Convertir usuarios a formato Contact, filtrando el usuario actual
      const contactsList: Contact[] = allUsers
        .filter((u: any) => u.id !== currentUser?.id) // Excluir usuario actual
        .map((u: any) => ({
          id: u.id,
          nombre: u.nombre || "",
          apellido: u.apellido || "",
          celular: u.celular || "",
          foto_perfil: u.foto_perfil || u.fotoPerfil,
          isOnApp: true // Todos los usuarios en la DB están en la app
        }))
      
      console.log("[ContactsScreen] Contactos procesados:", contactsList.length)
      setContacts(contactsList)
    } catch (error) {
      console.error("[ContactsScreen] Error cargando contactos:", error)
      setError(error instanceof Error ? error.message : "Error al cargar contactos")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.back()
  
  const handlePhoneClick = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `tel:${phone}`
  }

  const handleInviteContact = (contactId: string) => {
    if (!invitedContacts.includes(contactId)) {
      setInvitedContacts((prev) => [...prev, contactId])
      // Aquí podrías enviar una invitación real por SMS/WhatsApp
    }
  }

  const handleSendFriendRequest = async () => {
    if (!selectedContact) return
    
    setIsSendingRequest(true)
    try {
      const token = AuthService.getToken()
      // ✅ CORRECCIÓN: Backend espera el ID en la URL, no en el body
      const response = await fetch(`/api/amistades/${selectedContact.id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        alert("Solicitud de amistad enviada")
      }
    } catch (error) {
      console.error("Error enviando solicitud:", error)
      alert("Error al enviar solicitud")
    } finally {
      setIsSendingRequest(false)
      setSelectedContact(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando contactos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Contactos</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mb-6 text-center text-sm text-gray-600">
          Encuentra a tus amigos que ya están en Falta Uno e invita a los que aún no se han unido.
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <Button 
              onClick={loadContacts}
              className="w-full bg-red-600 hover:bg-red-700"
              size="sm"
            >
              Reintentar
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {contacts.map((contact) => {
            const isInvited = invitedContacts.includes(contact.id)
            const fullName = `${contact.nombre} ${contact.apellido}`.trim() || "Usuario"
            
            return (
              <div
                key={contact.id}
                onClick={() => contact.isOnApp && setSelectedContact(contact)}
                className={`flex items-center justify-between p-4 bg-gray-50 rounded-xl transition-colors ${
                  contact.isOnApp ? "cursor-pointer hover:bg-gray-100" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    {contact.foto_perfil ? (
                      <AvatarImage src={`data:image/jpeg;base64,${contact.foto_perfil}`} />
                    ) : (
                      <AvatarFallback className="bg-gray-200">
                        {fullName.split(" ").map((n) => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <button
                      className="font-medium text-gray-900 hover:text-primary transition-colors"
                      onClick={() => contact.isOnApp && setSelectedContact(contact)}
                    >
                      {fullName}
                    </button>
                    {contact.celular && (
                      <button
                        className="text-sm text-gray-500 hover:text-primary transition-colors block text-left"
                        onClick={(e) => handlePhoneClick(contact.celular, e)}
                      >
                        {contact.celular}
                      </button>
                    )}
                  </div>
                </div>

                {contact.isOnApp ? (
                  <Badge className="bg-green-100 text-green-800">En la app</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs bg-transparent flex items-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleInviteContact(contact.id)
                    }}
                    disabled={isInvited}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    {isInvited ? "Invitación enviada" : "Invitar"}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {contacts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron contactos
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          Los contactos que están en la app aparecen marcados. Toca para ver su perfil o enviar solicitud.
          <br />
          Toca el número de teléfono para llamar.
        </div>

        {/* Friend Request Modal */}
        {selectedContact && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-30">
            <div
              className="absolute inset-0"
              onClick={() => setSelectedContact(null)}
            ></div>
            <div className="bg-white rounded-t-2xl w-full max-w-md p-6 transform transition-transform duration-300 translate-y-0 relative z-10">
              <div className="flex items-center justify-center mb-4">
                <Avatar className="w-20 h-20">
                  {selectedContact.foto_perfil ? (
                    <AvatarImage src={`data:image/jpeg;base64,${selectedContact.foto_perfil}`} />
                  ) : (
                    <AvatarFallback className="bg-orange-100 text-2xl">
                      {`${selectedContact.nombre} ${selectedContact.apellido}`.split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                {selectedContact.nombre} {selectedContact.apellido}
              </h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                ¿Quieres enviar una solicitud de amistad?
              </p>

              <Button
                onClick={handleSendFriendRequest}
                disabled={isSendingRequest}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl mb-3 flex items-center justify-center"
              >
                <Check className="w-5 h-5 mr-2" />
                {isSendingRequest ? "Enviando..." : "Enviar solicitud"}
              </Button>

              <Button
                onClick={() => setSelectedContact(null)}
                variant="outline"
                className="w-full py-4 text-lg font-semibold rounded-2xl bg-transparent"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}