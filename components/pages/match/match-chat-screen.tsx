"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send, AlertCircle, Users, MapPin, Clock, MoreVertical, Image as ImageIcon, Smile } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { MensajeAPI, PartidoAPI, InscripcionAPI, MensajeDTO } from '@/lib/api'
import { LoadingSpinner, InlineSpinner } from "@/components/ui/loading-spinner"
import { useSmartPolling } from "@/hooks/use-smart-polling"

interface MatchChatScreenProps {
  matchId: string
}

interface MatchInfo {
  tipo_partido: string
  fecha: string
  hora: string
  nombre_ubicacion: string
  jugadores_actuales: number
  jugadores_necesarios: number
}

interface DateSeparator {
  type: 'date-separator'
  date: string
}

type MessageOrSeparator = MensajeDTO | DateSeparator

function isDateSeparator(item: MessageOrSeparator): item is DateSeparator {
  return 'type' in item && item.type === 'date-separator'
}

export function MatchChatScreen({ matchId }: MatchChatScreenProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Estados
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<MensajeDTO[]>([])
  const [messagesWithSeparators, setMessagesWithSeparators] = useState<MessageOrSeparator[]>([])
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [replyingTo, setReplyingTo] = useState<MensajeDTO | null>(null)
  
  const currentUser = AuthService.getUser()
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ⚡ OPTIMIZACIÓN: Smart polling que pausa cuando tab está inactiva
  useSmartPolling(
    () => loadMessages(true), // true = silent
    {
      interval: 2000, // Más frecuente para mejor UX (2s)
      enabled: !loading, // Solo hacer polling después de carga inicial
      pauseWhenHidden: true, // Pausar cuando tab está oculta
      hiddenInterval: 30000, // 30s cuando está oculta (ahorra batería)
    }
  )

  useEffect(() => {
    // Cargar datos iniciales
    loadChatData()
  }, [matchId])

  useEffect(() => {
    // Añadir separadores de fecha a los mensajes
    const grouped = groupMessagesByDate(messages)
    setMessagesWithSeparators(grouped)
  }, [messages])

  useEffect(() => {
    // Auto-scroll al cargar nuevos mensajes solo si está cerca del final
    const container = messagesContainerRef.current
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
      if (isNearBottom) {
        scrollToBottom(false)
        setUnreadCount(0)
      } else {
        // Incrementar contador si hay nuevos mensajes y no está al final
        const newCount = messages.length - (messagesWithSeparators.filter(m => !isDateSeparator(m)).length)
        if (newCount > 0) {
          setUnreadCount(prev => prev + newCount)
        }
      }
    }
  }, [messagesWithSeparators])

  // Detectar scroll para mostrar botón "ir al final"
  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
      setShowScrollButton(!isNearBottom)
      
      if (isNearBottom) {
        setUnreadCount(0)
      }
    }
  }

  // Simular typing indicator
  const handleInputChange = (value: string) => {
    setMessage(value)
    
    // Simular indicador de "escribiendo..." (se puede implementar con WebSocket en el futuro)
    if (!isTyping) {
      setIsTyping(true)
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================

  const groupMessagesByDate = (msgs: MensajeDTO[]): MessageOrSeparator[] => {
    const result: MessageOrSeparator[] = []
    let lastDate = ''

    msgs.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString()
      
      if (msgDate !== lastDate) {
        result.push({
          type: 'date-separator',
          date: msgDate
        })
        lastDate = msgDate
      }
      
      result.push(msg)
    })

    return result
  }

  const loadChatData = async () => {
    try {
      setLoading(true)
      setError("")

      // Validar autenticación
      if (!AuthService.isLoggedIn()) {
        router.push("/login")
        return
      }

      const currentUser = AuthService.getUser()
      if (!currentUser?.id) {
        router.push("/login")
        return
      }

      // Cargar info del partido PRIMERO (necesitamos saber si es organizador)
      let isOrganizer = false
      try {
        const matchResponse = await PartidoAPI.get(matchId)
        if (matchResponse.success && matchResponse.data) {
          const matchData = matchResponse.data
          setMatchInfo({
            tipo_partido: matchData.tipoPartido || matchData.tipo_partido || "FUTBOL_5",
            fecha: matchData.fecha,
            hora: matchData.hora,
            nombre_ubicacion: matchData.nombreUbicacion || matchData.nombre_ubicacion || "Ubicación no especificada",
            jugadores_actuales: matchData.jugadoresActuales || matchData.jugadores_actuales || 0,
            jugadores_necesarios: matchData.cantidadJugadores || matchData.cantidad_jugadores || 0
          })
          
          // Verificar si el usuario es el organizador
          isOrganizer = matchData.organizadorId === currentUser.id
          logger.log("[MatchChat] ¿Es organizador?", isOrganizer, "- OrganizadorId:", matchData.organizadorId, "UserId:", currentUser.id)
        }
      } catch (err) {
        logger.warn("[MatchChat] Error cargando info del partido:", err)
      }

      // ✅ Si es organizador, permitir acceso directo al chat
      if (isOrganizer) {
        logger.log("[MatchChat] ✅✅ ACCESO DIRECTO: Usuario es el organizador del partido")
        // No verificar inscripción, continuar cargando mensajes
      } else {
        // ✅ Si NO es organizador, verificar estado de inscripción
        try {
          logger.log("[MatchChat] Verificando estado de inscripción - matchId:", matchId, "userId:", currentUser.id)
          logger.log("[MatchChat] 📞 Llamando a InscripcionAPI.getEstado...")
          const estadoData = await InscripcionAPI.getEstado(matchId, currentUser.id)
          
          logger.log("[MatchChat] 📥 Respuesta completa:", JSON.stringify(estadoData, null, 2))
          
          if (estadoData.success && estadoData.data) {
            const { inscrito, estado, inscripcionId } = estadoData.data
            
            logger.log("[MatchChat] 📊 Estado parseado:")
            logger.log("  - inscrito:", inscrito)
            logger.log("  - estado:", estado)
            logger.log("  - inscripcionId:", inscripcionId)
            logger.log("  - tipo de estado:", typeof estado)
            
            const estaInscrito = inscrito || !!inscripcionId
            
            logger.log("[MatchChat] ✅ Validación - estaInscrito:", estaInscrito, "estado:", estado)
            
            // Permitir acceso si está inscrito (sin importar el estado)
            // Si está inscrito = ya fue aceptado por el organizador
            if (!estaInscrito) {
              logger.warn("[MatchChat] ❌ Acceso denegado - no inscrito")
              
              setError("Debes inscribirte en el partido para acceder al chat")
              setLoading(false)
              
              setTimeout(() => {
                router.push(`/matches/${matchId}`)
              }, 3000)
              return
            }
            
            logger.log("[MatchChat] ✅ Acceso permitido - usuario inscrito")
          } else {
            logger.error("[MatchChat] Respuesta inválida de estado:", estadoData)
          }
        } catch (err) {
          logger.error("[MatchChat] Error verificando inscripción:", err)
          setError("Error al verificar permisos de acceso. Redirigiendo...")
          setLoading(false)
          setTimeout(() => {
            router.push(`/matches/${matchId}`)
          }, 3000)
          return
        }
      }

      // Cargar mensajes
      await loadMessages()

    } catch (err) {
      logger.error("[MatchChat] Error cargando chat:", err)
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
      logger.error("[MatchChat] Error cargando mensajes:", err)
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
    setIsTyping(false)

    const tempMessage = message.trim()

    try {
      // Limpiar input y reply inmediatamente para mejor UX
      setMessage("")
      setReplyingTo(null)
      
      // Auto-scroll al enviar
      scrollToBottom(true)

      // Enviar mensaje (usuarioId viene del token de autenticación)
      const response = await MensajeAPI.crear(matchId, {
        contenido: tempMessage
      })

      if (!response.success) {
        throw new Error(response.message || "Error al enviar mensaje")
      }

      // Recargar mensajes inmediatamente
      await loadMessages(true)
      
      // Enfocar input nuevamente
      inputRef.current?.focus()

    } catch (err) {
      logger.error("[MatchChat] Error enviando mensaje:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al enviar mensaje"
      setError(errorMessage)
      // Restaurar mensaje si falló
      setMessage(tempMessage)
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

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? "smooth" : "auto" 
    })
  }

  const scrollToBottomQuick = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
      setUnreadCount(0)
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

  const formatDateSeparator = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      today.setHours(0, 0, 0, 0)
      yesterday.setHours(0, 0, 0, 0)
      const compareDate = new Date(date)
      compareDate.setHours(0, 0, 0, 0)

      if (compareDate.getTime() === today.getTime()) {
        return "Hoy"
      } else if (compareDate.getTime() === yesterday.getTime()) {
        return "Ayer"
      } else {
        return date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined
        })
      }
    } catch {
      return dateStr
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
        <LoadingSpinner size="xl" variant="green" text="Cargando chat..." />
      </div>
    )
  }

  // ============================================
  // RENDER - ACCESS DENIED
  // ============================================

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="pt-16 pb-4 px-6 border-b border-gray-100 bg-white">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleBack} 
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">Chat del partido</h1>
            </div>
          </div>
        </div>

        {/* Error Message - Centro de la pantalla */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Acceso no permitido
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">
                Serás redirigido al partido en unos segundos...
              </p>
            </div>
            <Button
              onClick={() => router.push(`/matches/${matchId}`)}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white"
            >
              Volver al partido
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER - MAIN
  // ============================================

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header Moderno - Estilo WhatsApp */}
      <div className="pt-16 pb-3 px-4 bg-gradient-to-r from-green-600 to-green-700 shadow-lg">
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleBack} 
            className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          {/* Match avatar/icon */}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-white truncate">
              Grupo del partido
            </h1>
            {matchInfo && (
              <div className="flex items-center space-x-2 text-xs text-white/90">
                <Clock className="w-3 h-3" />
                <span className="truncate">
                  {formatDate(matchInfo.fecha, matchInfo.hora)} • {matchInfo.jugadores_actuales}/{matchInfo.jugadores_necesarios} jugadores
                </span>
              </div>
            )}
          </div>

          {/* More options button */}
          <button 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Más opciones"
          >
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && messages.length > 0 && (
        <div className="px-4 pt-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 animate-in slide-in-from-top duration-300 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages Container con wallpaper */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2398a6ad' fill-opacity='0.03'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#efeae2'
        }}
      >
        {messagesWithSeparators.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-sm mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-gray-700 font-semibold mb-2 text-lg">¡Comienza la conversación!</p>
              <p className="text-sm text-gray-500 mb-4">
                Este es el inicio del chat del grupo. Saluda a tus compañeros de juego.
              </p>
              <div className="inline-flex items-center space-x-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-full">
                <Users className="w-3.5 h-3.5" />
                <span>Grupo del partido</span>
              </div>
            </div>
          </div>
        ) : (
          messagesWithSeparators.map((item, index) => {
            // Separador de fecha
            if (isDateSeparator(item)) {
              return (
                <div key={`separator-${index}`} className="flex items-center justify-center my-5">
                  <div className="bg-white/95 backdrop-blur-sm text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                    {formatDateSeparator(item.date)}
                  </div>
                </div>
              )
            }

            // Mensaje normal
            const msg = item as MensajeDTO
            const isOwn = msg.usuarioId === currentUser?.id
            const userName = getUserName(msg.usuario?.nombre, msg.usuario?.apellido)
            const initials = getUserInitials(msg.usuario?.nombre, msg.usuario?.apellido)
            
            // Verificar si es el último mensaje del mismo usuario
            const prevItem = index > 0 ? messagesWithSeparators[index - 1] : null
            const nextItem = messagesWithSeparators[index + 1]
            
            const isFirstInGroup = !prevItem || isDateSeparator(prevItem) || 
              (prevItem as MensajeDTO).usuarioId !== msg.usuarioId
            const isLastInGroup = !nextItem || isDateSeparator(nextItem) || 
              (nextItem as MensajeDTO).usuarioId !== msg.usuarioId

            return (
              <div 
                key={msg.id} 
                className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}
              >
                <div
                  className={`group flex items-end space-x-2 max-w-[80%] relative ${
                    isOwn ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  {/* Avatar solo en último mensaje del grupo */}
                  {!isOwn && isLastInGroup ? (
                    <Avatar
                      className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform flex-shrink-0 ring-2 ring-white shadow-sm mb-0.5"
                      onClick={() => handleUserClick(msg.usuarioId)}
                    >
                      {msg.usuario?.foto_perfil ? (
                        <AvatarImage src={`data:image/jpeg;base64,${msg.usuario.foto_perfil}`} alt={userName} />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  ) : !isOwn ? (
                    <div className="w-8 flex-shrink-0" /> 
                  ) : null}
                  
                  {/* Mensaje bubble */}
                  <div className="relative flex-1">
                    {/* Opciones de mensaje (aparecen al hover) */}
                    <div className={`absolute top-1 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1 px-2`}>
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1.5 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-all hover:scale-110"
                        title="Responder"
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                      <button
                        className="p-1.5 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-all hover:scale-110"
                        title="Más opciones"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    <div
                      className={`inline-block rounded-2xl px-3 py-2 shadow-sm transition-all group-hover:shadow-md ${
                        isOwn 
                          ? `bg-gradient-to-br from-green-500 to-green-600 text-white ${
                              isLastInGroup ? 'rounded-br-sm' : ''
                            } ${isFirstInGroup ? 'rounded-tr-2xl' : ''}` 
                          : `bg-white text-gray-900 border border-gray-200 ${
                              isLastInGroup ? 'rounded-bl-sm' : ''
                            } ${isFirstInGroup ? 'rounded-tl-2xl' : ''}`
                      }`}
                    >
                      {/* Nombre solo en primer mensaje del grupo (para mensajes de otros) */}
                      {!isOwn && isFirstInGroup && (
                        <button
                          className="text-xs font-bold mb-1.5 block text-green-600 hover:text-green-700 transition-colors"
                          onClick={() => handleUserClick(msg.usuarioId)}
                        >
                          {userName}
                        </button>
                      )}
                      
                      {/* Contenido del mensaje */}
                      <p className="text-[15px] whitespace-pre-wrap break-words leading-[1.4] font-normal">
                        {msg.contenido}
                      </p>
                      
                      {/* Footer con hora y check marks */}
                      <div className="flex items-center justify-end space-x-1.5 mt-1 -mb-0.5">
                        <span className={`text-[11px] font-medium ${
                          isOwn ? "text-white/70" : "text-gray-500"
                        }`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {/* Check marks para mensajes propios */}
                        {isOwn && (
                          <div className="flex-shrink-0">
                            <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 13l4 4L23 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Botón flotante para scroll al final - Estilo WhatsApp */}
      {showScrollButton && (
        <div className="absolute bottom-28 right-4 z-10 animate-in slide-in-from-bottom duration-200">
          <button
            onClick={scrollToBottomQuick}
            className="bg-white hover:bg-gray-50 text-gray-700 rounded-full p-3 shadow-xl hover:shadow-2xl transition-all relative border border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </button>
        </div>
      )}

      {/* Message Input Mejorado - Estilo WhatsApp/Telegram */}
      <div className="border-t border-gray-300 bg-[#f0f0f0]">
        {/* Reply preview */}
        {replyingTo && (
          <div className="px-4 pt-3 pb-2 bg-white/80 backdrop-blur-sm">
            <div className="flex items-start justify-between bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-green-700 mb-1">
                  {getUserName(replyingTo.usuario?.nombre, replyingTo.usuario?.apellido)}
                </p>
                <p className="text-sm text-gray-700 truncate">
                  {replyingTo.contenido}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="ml-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <div className="p-2">
          <div className="flex items-end space-x-2">
            {/* Emoji button */}
            <button
              className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 mb-1"
              title="Emojis (próximamente)"
            >
              <Smile className="w-6 h-6" />
            </button>
            
            {/* Input container */}
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mensaje"
                className="rounded-3xl border-none focus:ring-2 focus:ring-green-500 py-2.5 px-4 pr-12 bg-white shadow-sm text-[15px]"
                disabled={sending}
                maxLength={500}
              />
              {message.length > 400 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                  {500 - message.length}
                </div>
              )}
            </div>

            {/* Attach/Send button */}
            {message.trim() ? (
              <Button
                onClick={handleSendMessage}
                disabled={sending}
                size="lg"
                className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full p-0 min-h-[48px] min-w-[48px] disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex-shrink-0 mb-1"
              >
                {sending ? (
                  <InlineSpinner variant="white" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            ) : (
              <button
                className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 mb-1"
                title="Adjuntar imagen (próximamente)"
              >
                <ImageIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}