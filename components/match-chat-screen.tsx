"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send } from "lucide-react"
import { useRouter } from "next/navigation"

interface MatchChatScreenProps {
  matchId: string
}

// Mock chat messages
const mockMessages = [
  {
    id: 1,
    author: "Marta",
    message: "¡Hola equipo! Nos vemos mañana a las 18:30",
    time: "14:30",
    isOwn: false,
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 2,
    author: "Carlos",
    message: "Perfecto, ahí estaré puntual",
    time: "14:32",
    isOwn: false,
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 3,
    author: "Tú",
    message: "¡Genial! ¿Hay que llevar algo específico?",
    time: "14:35",
    isOwn: true,
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 4,
    author: "Marta",
    message: "Solo camiseta blanca y muchas ganas de jugar 😄",
    time: "14:36",
    isOwn: false,
    avatar: "/placeholder.svg?height=32&width=32",
  },
]

export function MatchChatScreen({ matchId }: MatchChatScreenProps) {
  const router = useRouter()
  const [message, setMessage] = useState("")

  const handleBack = () => {
    router.back()
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log("Sending message:", message)
      setMessage("")
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-4 px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src="/placeholder.svg?height=40&width=40" />
              <AvatarFallback className="bg-orange-100">M</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Chat del partido</h1>
              <p className="text-sm text-gray-500">Mañana 18:30</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
        {mockMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
            <div
              className={`flex items-end space-x-2 max-w-[80%] ${msg.isOwn ? "flex-row-reverse space-x-reverse" : ""}`}
            >
              {!msg.isOwn && (
                <Avatar
                  className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => router.push(`/users/${msg.author}`)}
                >
                  <AvatarImage src={msg.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-gray-200 text-xs">
                    {msg.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-2xl px-4 py-2 ${
                  msg.isOwn ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                }`}
              >
                {!msg.isOwn && (
                  <button
                    className="text-xs font-medium mb-1 opacity-70 hover:opacity-100 transition-opacity"
                    onClick={() => router.push(`/users/${msg.author}`)}
                  >
                    {msg.author}
                  </button>
                )}
                <p className="text-sm">{msg.message}</p>
                <p className={`text-xs mt-1 ${msg.isOwn ? "text-blue-100" : "text-gray-500"}`}>{msg.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-6 border-t border-gray-100 bg-white">
        <div className="flex items-center space-x-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full border-gray-300"
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 min-h-[44px] min-w-[44px]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
