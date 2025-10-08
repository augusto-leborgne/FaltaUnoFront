"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, UserPlus, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface Contact {
  id: number
  name: string
  phone: string
  avatar?: string
  isOnApp: boolean
  userId?: number
}

const mockContacts: Contact[] = [
  { id: 1, name: "Juan Carlos Pérez", phone: "+598 99 123 456", avatar: "/placeholder.svg?height=40&width=40", isOnApp: true, userId: 101 },
  { id: 2, name: "María González", phone: "+598 99 654 321", avatar: "/placeholder.svg?height=40&width=40", isOnApp: false },
  { id: 3, name: "Diego Rodríguez", phone: "+598 99 789 012", avatar: "/placeholder.svg?height=40&width=40", isOnApp: true, userId: 102 },
  { id: 4, name: "Ana López", phone: "+598 99 345 678", avatar: "/placeholder.svg?height=40&width=40", isOnApp: false },
]

export function ContactsScreen() {
  const router = useRouter()
  const [invitedContacts, setInvitedContacts] = useState<number[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isSendingRequest, setIsSendingRequest] = useState(false)

  const handleBack = () => router.back()
  const handlePhoneClick = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `tel:${phone}`
  }

  const handleInviteContact = (contactId: number) => {
    if (!invitedContacts.includes(contactId)) {
      setInvitedContacts((prev) => [...prev, contactId])
    }
  }

  const handleSendFriendRequest = async () => {
    if (!selectedContact) return
    setIsSendingRequest(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSendingRequest(false)
    setSelectedContact(null)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Contactos del celular</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mb-6 text-center text-sm text-gray-600">
          Encuentra a tus amigos que ya están en Falta Uno e invita a los que aún no se han unido.
        </div>

        <div className="space-y-3">
          {mockContacts.map((contact) => {
            const isInvited = invitedContacts.includes(contact.id)
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
                    <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-200">
                      {contact.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <button
                      className="font-medium text-gray-900 hover:text-primary transition-colors"
                      onClick={() => contact.isOnApp && setSelectedContact(contact)}
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
            <div className="bg-white rounded-t-2xl w-full max-w-md p-6 transform transition-transform duration-300 translate-y-0">
              <div className="flex items-center justify-center mb-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={selectedContact.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-orange-100 text-2xl">
                    {selectedContact.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">{selectedContact.name}</h2>
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