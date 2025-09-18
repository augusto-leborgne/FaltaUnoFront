"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

const mockContacts = [
  {
    id: 1,
    name: "Juan Carlos Pérez",
    phone: "+598 99 123 456",
    avatar: "/placeholder.svg?height=40&width=40",
    isOnApp: true,
    userId: 101,
  },
  {
    id: 2,
    name: "María González",
    phone: "+598 99 654 321",
    avatar: "/placeholder.svg?height=40&width=40",
    isOnApp: false,
  },
  {
    id: 3,
    name: "Diego Rodríguez",
    phone: "+598 99 789 012",
    avatar: "/placeholder.svg?height=40&width=40",
    isOnApp: true,
    userId: 102,
  },
  {
    id: 4,
    name: "Ana López",
    phone: "+598 99 345 678",
    avatar: "/placeholder.svg?height=40&width=40",
    isOnApp: false,
  },
]

export function ContactsScreen() {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  const handleContactClick = (contact: (typeof mockContacts)[0]) => {
    if (contact.isOnApp && contact.userId) {
      router.push(`/users/${contact.userId}`)
    }
  }

  const handlePhoneClick = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `tel:${phone}`
  }

  const handleInviteContact = (contactId: number) => {
    console.log(`Inviting contact ${contactId}`)
    const button = document.querySelector(`[data-invite-${contactId}]`)
    if (button) {
      const message = document.createElement("p")
      message.textContent = "✓ Invitación enviada"
      message.className = "text-sm text-primary font-medium mt-1"
      button.parentNode?.appendChild(message)
      setTimeout(() => message.remove(), 3000)
    }
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
        <div className="mb-6">
          <p className="text-sm text-gray-600 text-center">
            Encuentra a tus amigos que ya están en Falta Uno e invita a los que aún no se han unido.
          </p>
        </div>

        <div className="space-y-3">
          {mockContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleContactClick(contact)}
              className={`flex items-center justify-between p-4 bg-gray-50 rounded-xl transition-colors ${
                contact.isOnApp ? "cursor-pointer hover:bg-gray-100" : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-gray-200">
                    {contact.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <button
                    className="font-medium text-gray-900 hover:text-primary transition-colors"
                    onClick={() => handleContactClick(contact)}
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
                  className="text-xs bg-transparent"
                  data-invite={contact.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleInviteContact(contact.id)
                  }}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Invitar
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Los contactos que están en la app aparecen marcados. Toca para ver su perfil.
            <br />
            Toca el número de teléfono para llamar.
          </p>
        </div>
      </div>
    </div>
  )
}
