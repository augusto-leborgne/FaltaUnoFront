"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { MensajeAPI, PartidoAPI } from '@/lib/api'

interface MatchChatScreenProps {
  matchId: string
}

interface Message {
  id: string
  usuario_id: string
  contenido: string
  created_at: string
  usuario?: {
    id: string
    nombre: string
    apellido: string
    foto_perfil?: string
  }
}

interface MatchInfo {
  tipo_partido: string
  fecha: string
  hora: string
  nombre_ubicacion: string
}

export function MatchChatScreen({ matchId }: MatchChatScreenProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const currentUser = AuthService.getUser()

  // Polling safe: setTimeout recursivo para evitar solapamiento de requests
  useEffect(() => {
    let mounted = true
    let timer: number | null = null

    const poll = async () => {
      try {
        if (!mounted) return
        await loadMessages()
      } catch (e) {
        console.error("Polling error", e)
      } finally {
        if (mounted) {
          timer = window.setTimeout(poll, 5000)
        }
      }
    }

    // Carga inicial de datos (match + mensajes) y arranca polling
    loadChatData().then(() => {
      if (mounted) {
        timer = window.setTimeout(poll, 5000)
      }
    }).catch((e) => {
      console.error("Error iniciando chat:", e)
    })

    return () => {
      mounted = false
      if (timer) clearTimeout(timer)
    }
  }, [matchId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadChatData = async () => {
    try {
      setLoading(true)
      const token = AuthService.getToken()
      
      if (!token) {
        router.push("/login")
        return
      }

      // Usar PartidoAPI para obtener info del partido
      try {
        const matchResult = await PartidoAPI.get(matchId)
        if (matchResult) {
          const data = matchResult.data ?? matchResult
          if (data) {
            setMatchInfo({
              tipo_partido: data.tipo_partido,
              fecha: data.fecha,
              hora: data.hora,
              nombre_ubicacion: data.nombre_ubicacion
            })
          }
        }
      } catch (err) {
        console.warn("No se pudo cargar info del partido:", err)
      }

      // Cargar mensajes
      await loadMessages()
    } catch (error) {
      console.error("Error cargando chat:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    try {
      const token = AuthService.getToken()
      if (!token) return

      // Usar MensajeAPI para obtener mensajes
      const resp = await MensajeAPI.list(matchId)
      if (!resp) return

      const data = resp.data ?? resp
      if (Array.isArray(data)) {
        setMessages(data)
      }
    } catch (error) {
      console.error("Error cargando mensajes:", error)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return

    setSending(true)
    try {
      const token = AuthService.getToken()
      if (!token || !currentUser?.id) {
        router.push("/login")
        return
      }

      // Usar MensajeAPI para crear mensaje
      const resp = await MensajeAPI.crear(matchId, {
        contenido: message.trim(),
        usuarioId: currentUser.id
      })

      if (!resp) {
        throw new Error("Respuesta inválida al enviar mensaje")
      }

      // Limpiar input y recargar mensajes
      setMessage("")
      await loadMessages()
    } catch (error) {
      console.error("Error enviando mensaje:", error)
      alert("No se pudo enviar el mensaje. Intenta nuevamente.")
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString("es-ES", { 
        hour: "2-digit", 
        minute: "2-digit" 
      })
    } catch {
      return ""
    }
  }

  const formatDate = (dateString: string, timeString: string) => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      today.setHours(0, 0, 0, 0)
      tomorrow.setHours(0, 0, 0, 0)
      const compareDate = new Date(date)
      compareDate.setHours(0, 0, 0, 0)

      if (compareDate.getTime() === today.getTime()) {
        return `Hoy ${timeString}`
      } else if (compareDate.getTime() === tomorrow.getTime()) {
        return `Mañana ${timeString}`
      } else {
        return `${date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        })} ${timeString}`
      }
    } catch {
      return `${dateString} ${timeString}`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-4 px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Chat del partido</h1>
            {matchInfo && (
              <p className="text-sm text-gray-500">
                {formatDate(matchInfo.fecha, matchInfo.hora)} • {matchInfo.nombre_ubicacion}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No hay mensajes aún</p>
              <p className="text-sm text-gray-400">Sé el primero en escribir</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.usuario_id === currentUser?.id
            const userName = msg.usuario 
              ? `${msg.usuario.nombre} ${msg.usuario.apellido}`
              : "Usuario"
            const initials = msg.usuario
              ? `${msg.usuario.nombre?.[0] || ""}${msg.usuario.apellido?.[0] || ""}`
              : "U"

            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex items-end space-x-2 max-w-[80%] ${
                    isOwn ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  {!isOwn && (
                    <Avatar
                      className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                      onClick={() => router.push(`/users/${msg.usuario_id}`)}
                    >
                      {msg.usuario?.foto_perfil ? (
                        <AvatarImage src={`data:image/jpeg;base64,${msg.usuario.foto_perfil}`} />
                      ) : (
                        <AvatarFallback className="bg-gray-200 text-xs">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {!isOwn && (
                      <button
                        className="text-xs font-medium mb-1 opacity-70 hover:opacity-100 transition-opacity block"
                        onClick={() => router.push(`/users/${msg.usuario_id}`)}
                      >
                        {userName}
                      </button>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.contenido}</p>
                    <p className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-6 border-t border-gray-100 bg-white">
        <div className="flex items-center space-x-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full border-gray-300"
            disabled={sending}
            maxLength={500}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 min-h-[44px] min-w-[44px] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {message.length > 450 && (
          <p className="text-xs text-gray-500 mt-2 text-right">
            {message.length}/500 caracteres
          </p>
        )}
      </div>
    </div>
  )
}