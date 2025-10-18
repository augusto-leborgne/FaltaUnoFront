"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { MensajeAPI, PartidoAPI, MensajeDTO } from '@/lib/api'

interface MatchChatScreenProps {
  matchId: string
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
  const pollingIntervalRef = useRef<number | null>(null)
  
  // Estados
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<MensajeDTO[]>([])
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  
  const currentUser = AuthService.getUser()

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    // Cargar datos iniciales
    loadChatData()

    // Configurar polling para nuevos mensajes
    startPolling()

    // Cleanup
    return () => {
      stopPolling()
    }
  }, [matchId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // ============================================
  // POLLING
  // ============================================

  const startPolling = () => {
    // Polling cada 5 segundos
    pollingIntervalRef.current = window.setInterval(() => {
      loadMessages(true) // true = silent (sin mostrar loading)
    }, 5000)
  }

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================

  const loadChatData = async () => {
    try {
      setLoading(true)
      setError("")

      // Validar autenticación
      if (!AuthService.isLoggedIn()) {
        router.push("/login")
        return
      }

      // Cargar info del partido
      try {
        const matchResponse = await PartidoAPI.get(matchId)
        if (matchResponse.success && matchResponse.data) {
          setMatchInfo({
            tipo_partido: matchResponse.data.tipoPartido,
            fecha: matchResponse.data.fecha,
            hora: matchResponse.data.hora,
            nombre_ubicacion: matchResponse.data.nombreUbicacion
          })
        }
      } catch (err) {
        console.warn("[MatchChat] Error cargando info del partido:", err)
        // No es crítico, continuar
      }

      // Cargar mensajes
      await loadMessages()

    } catch (err) {
      console.error("[MatchChat] Error cargando chat:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al cargar el chat"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (silent = false) => {
    try {
      if (!silent && !messages.length) {
        // Mostrar loading solo en carga inicial
        setLoading(true)
      }

      // Validar autenticación
      if (!AuthService.isLoggedIn()) {
        return
      }

      // Cargar mensajes
      const response = await MensajeAPI.list(matchId)

      if (response.success && response.data) {
        setMessages(response.data)
      }

    } catch (err) {
      console.error("[MatchChat] Error cargando mensajes:", err)
      if (!silent) {
        const errorMessage = err instanceof Error ? err.message : "Error al cargar mensajes"
        setError(errorMessage)
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  // ============================================
  // HANDLERS
  // ============================================

  const handleBack = () => {
    router.back()
  }

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return

    // Validar usuario
    if (!currentUser?.id) {
      setError("Usuario no encontrado")
      return
    }

    setSending(true)
    setError("")

    try {
      // Enviar mensaje
      const response = await MensajeAPI.crear(matchId, {
        contenido: message.trim(),
        usuarioId: currentUser.id
      })

      if (!response.success) {
        throw new Error(response.message || "Error al enviar mensaje")
      }

      // Limpiar input
      setMessage("")

      // Recargar mensajes inmediatamente
      await loadMessages(true)

    } catch (err) {
      console.error("[MatchChat] Error enviando mensaje:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al enviar mensaje"
      setError(errorMessage)
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

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`)
  }

  // ============================================
  // HELPERS
  // ============================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
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

      const time = timeString.substring(0, 5) // HH:mm

      if (compareDate.getTime() === today.getTime()) {
        return `Hoy ${time}`
      } else if (compareDate.getTime() === tomorrow.getTime()) {
        return `Mañana ${time}`
      } else {
        return `${date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        })} ${time}`
      }
    } catch {
      return `${dateString} ${timeString}`
    }
  }

  const getUserInitials = (nombre?: string, apellido?: string): string => {
    const n = nombre?.[0] || ""
    const a = apellido?.[0] || ""
    return (n + a).toUpperCase() || "U"
  }

  const getUserName = (nombre?: string, apellido?: string): string => {
    return `${nombre || ""} ${apellido || ""}`.trim() || "Usuario"
  }

  // ============================================
  // RENDER - LOADING
  // ============================================

  if (loading && !messages.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando chat...</p>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER - MAIN
  // ============================================

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-4 px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleBack} 
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
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

      {/* Error Message */}
      {error && (
        <div className="px-6 pt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">No hay mensajes aún</p>
              <p className="text-sm text-gray-400">Sé el primero en escribir</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.usuarioId === currentUser?.id
            const userName = getUserName(msg.usuario?.nombre, msg.usuario?.apellido)
            const initials = getUserInitials(msg.usuario?.nombre, msg.usuario?.apellido)

            return (
              <div 
                key={msg.id} 
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex items-end space-x-2 max-w-[80%] ${
                    isOwn ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  {!isOwn && (
                    <Avatar
                      className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                      onClick={() => handleUserClick(msg.usuarioId)}
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
                      isOwn 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {!isOwn && (
                      <button
                        className="text-xs font-medium mb-1 opacity-70 hover:opacity-100 transition-opacity block"
                        onClick={() => handleUserClick(msg.usuarioId)}
                      >
                        {userName}
                      </button>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.contenido}
                    </p>
                    <p className={`text-xs mt-1 ${
                      isOwn ? "text-blue-100" : "text-gray-500"
                    }`}>
                      {formatTime(msg.createdAt)}
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
            {sending ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
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