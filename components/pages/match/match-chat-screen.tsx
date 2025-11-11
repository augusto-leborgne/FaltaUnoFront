"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send, AlertCircle, Users, MapPin, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { MensajeAPI, PartidoAPI, InscripcionAPI, MensajeDTO, getUserPhotoUrl } from '@/lib/api'
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

  // ⚡ SUPER OPTIMIZACIÓN: Polling ultra-rápido para chat en tiempo real
  useSmartPolling(
    () => loadMessages(true), // true = silent
    {
      interval: 1000, // 1 segundo (MÁXIMA velocidad para móvil)
      enabled: !loading, // Solo hacer polling después de carga inicial
      pauseWhenHidden: true, // Pausar cuando tab está oculta
      hiddenInterval: 10000, // 10s cuando está oculta
    }
  )

  // ⚡ OPTIMIZACIÓN: Memoizar URLs de fotos para evitar recrearlas en cada render
  // ⚡ Cache optimizado para URLs de fotos con timestamp para forzar recarga
  const getUserPhotoUrlMemo = useMemo(() => {
    const cache = new Map<string, string>()
    return (userId: string) => {
      if (!cache.has(userId)) {
        // Agregar timestamp para forzar recarga y evitar caché del navegador
        const url = `${getUserPhotoUrl(userId)}?t=${Date.now()}`
        cache.set(userId, url)
      }
      return cache.get(userId)!
    }
  }, [])

  useEffect(() => {
    // Cargar datos iniciales
    loadChatData()
    
    // ⚡ Marcar como visitado cuando entra al chat
    const visitKey = `chat_visit_${matchId}`
    localStorage.setItem(visitKey, new Date().toISOString())
    
    // ⚡ También marcar al salir (cleanup)
    return () => {
      localStorage.setItem(visitKey, new Date().toISOString())
    }
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

      // ⚡ MEGA OPTIMIZACIÓN: Cargar partido, inscripción y mensajes EN PARALELO
      const [matchResponse, estadoData, messagesData] = await Promise.allSettled([
        PartidoAPI.get(matchId),
        InscripcionAPI.getEstado(matchId, currentUser.id),
        MensajeAPI.list(matchId)
      ])

      // Procesar info del partido
      let isOrganizer = false
      if (matchResponse.status === 'fulfilled' && matchResponse.value.success && matchResponse.value.data) {
        const matchData = matchResponse.value.data
        setMatchInfo({
          tipo_partido: matchData.tipoPartido || matchData.tipo_partido || "FUTBOL_5",
          fecha: matchData.fecha,
          hora: matchData.hora,
          nombre_ubicacion: matchData.nombreUbicacion || matchData.nombre_ubicacion || "Ubicación no especificada",
          jugadores_actuales: matchData.jugadoresActuales || matchData.jugadores_actuales || 0,
          jugadores_necesarios: matchData.cantidadJugadores || matchData.cantidad_jugadores || 0
        })
        
        isOrganizer = matchData.organizadorId === currentUser.id
      }

      // Verificar acceso (solo si NO es organizador)
      if (!isOrganizer) {
        if (estadoData.status === 'fulfilled' && estadoData.value.success && estadoData.value.data) {
          const { inscrito, inscripcionId } = estadoData.value.data
          const estaInscrito = inscrito || !!inscripcionId
          
          if (!estaInscrito) {
            setError("Debes inscribirte en el partido para acceder al chat")
            setLoading(false)
            setTimeout(() => router.push(`/matches/${matchId}`), 3000)
            return
          }
        }
      }

      // Cargar mensajes (ya los tenemos del Promise.allSettled)
      if (messagesData.status === 'fulfilled' && messagesData.value.success && messagesData.value.data) {
        setMessages(messagesData.value.data)
      }

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      {/* Header Móvil - Ultra compacto y fijo */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 shadow-lg">
        <div className="safe-top" /> {/* Espacio para notch en iOS */}
        <div className="flex items-center px-2 sm:px-3 py-2">
          <button 
            onClick={handleBack} 
            className="p-2 hover:bg-white/20 rounded-lg transition-all flex-shrink-0 active:scale-95 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          
          {/* Match info ultra-compacto */}
          <button 
            onClick={() => router.push(`/matches/${matchId}`)}
            className="flex-1 min-w-0 text-left hover:bg-white/10 rounded-lg px-2 py-1 transition-all active:scale-[0.98] touch-manipulation"
          >
            <h1 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
              Chat del Partido
            </h1>
            {matchInfo && (
              <div className="flex items-center space-x-1.5 sm:space-x-2 text-[9px] sm:text-[10px] text-blue-100 mt-0.5">
                <div className="flex items-center space-x-0.5">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="truncate max-w-[100px] sm:max-w-[150px]">{formatDate(matchInfo.fecha, matchInfo.hora)}</span>
                </div>
                <span className="text-blue-300">•</span>
                <div className="flex items-center space-x-0.5">
                  <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{matchInfo.jugadores_actuales}/{matchInfo.jugadores_necesarios}</span>
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Error Message - Responsive */}
      {error && messages.length > 0 && (
        <div className="px-3 sm:px-4 pt-2 sm:pt-3">
          <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 animate-in slide-in-from-top duration-300 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-xs sm:text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700 text-base sm:text-lg leading-none touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages Container - Optimizado para móvil */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 px-2 sm:px-4 py-3 sm:py-4 space-y-0.5 overflow-y-auto bg-gradient-to-b from-gray-50 to-white overscroll-behavior-contain"
      >
        {messagesWithSeparators.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-xl max-w-sm mx-auto border-2 border-blue-100">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                <Send className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
              </div>
              <p className="text-gray-900 font-bold mb-2 sm:mb-3 text-base sm:text-xl">¡Empieza la conversación!</p>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                Este es el chat del grupo del partido. Coordina con tus compañeros, pregunta dudas y organízate mejor.
              </p>
              <div className="inline-flex items-center space-x-2 text-[10px] sm:text-xs font-semibold text-blue-600 bg-blue-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{matchInfo?.jugadores_actuales || 0} jugadores en el chat</span>
              </div>
            </div>
          </div>
        ) : (
          messagesWithSeparators.map((item, index) => {
            // Separador de fecha
            if (isDateSeparator(item)) {
              return (
                <div key={`separator-${index}`} className="flex items-center justify-center my-4 sm:my-6">
                  <div className="bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm">
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
                className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? 'mt-2 sm:mt-2' : 'mt-0.5'}`}
              >
                <div
                  className={`group flex items-end space-x-1.5 sm:space-x-2 max-w-[75%] sm:max-w-[75%] relative ${
                    isOwn ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  {/* Avatar con foto - SIEMPRE visible */}
                  {!isOwn ? (
                    <Avatar
                      className="w-6 h-6 sm:w-8 sm:h-8 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all flex-shrink-0 shadow-md touch-manipulation"
                      onClick={() => handleUserClick(msg.usuarioId)}
                    >
                      <AvatarImage 
                        src={getUserPhotoUrlMemo(msg.usuarioId)} 
                        alt={userName}
                        className="object-cover"
                        loading="eager"
                        onError={(e) => {
                          // Si falla la carga, ocultar el elemento para que se muestre el fallback
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[10px] sm:text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                  
                  {/* Mensaje bubble compacto */}
                  <div className="relative flex-1">
                    {/* Opciones de mensaje (aparecen al hover) */}
                    <div className={`absolute top-1 ${isOwn ? 'left-0 -translate-x-full pl-1.5' : 'right-0 translate-x-full pr-1.5'} opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center space-x-1`}>
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1.5 sm:p-1.5 bg-white hover:bg-blue-50 rounded-lg shadow-md border border-gray-200 transition-all hover:scale-105 touch-manipulation min-h-[36px] min-w-[36px] sm:min-h-[auto] sm:min-w-[auto]"
                        title="Responder"
                      >
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    </div>

                    <div
                      className={`inline-block px-2.5 sm:px-3 py-1.5 sm:py-1.5 transition-all group-hover:scale-[1.01] ${
                        isOwn 
                          ? `bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-md hover:shadow-lg ${
                              isFirstInGroup && isLastInGroup ? 'rounded-2xl' :
                              isFirstInGroup ? 'rounded-t-2xl rounded-bl-2xl rounded-br-md' :
                              isLastInGroup ? 'rounded-b-2xl rounded-tl-2xl rounded-tr-md' :
                              'rounded-l-2xl rounded-r-md'
                            }` 
                          : `bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md ${
                              isFirstInGroup && isLastInGroup ? 'rounded-2xl' :
                              isFirstInGroup ? 'rounded-t-2xl rounded-br-2xl rounded-bl-md' :
                              isLastInGroup ? 'rounded-b-2xl rounded-tr-2xl rounded-tl-md' :
                              'rounded-r-2xl rounded-l-md'
                            }`
                      }`}
                    >
                      {/* Nombre ultra-compacto - ESPACIO MÍNIMO - Fixed para móvil */}
                      {!isOwn && isFirstInGroup && (
                        <button
                          className="text-[10px] sm:text-[10px] font-bold block text-blue-600 hover:text-blue-700 transition-colors mb-0 touch-manipulation"
                          onClick={() => handleUserClick(msg.usuarioId)}
                        >
                          {userName}
                        </button>
                      )}
                      
                      {/* Contenido del mensaje - ESPACIADO MÍNIMO */}
                      <p className={`text-xs sm:text-sm whitespace-pre-wrap break-words leading-tight ${
                        isOwn ? 'font-normal' : 'font-normal'
                      } ${!isOwn && isFirstInGroup ? 'mt-0' : ''}`}>
                        {msg.contenido}
                      </p>
                      
                      {/* Footer con hora y check marks */}
                      <div className={`flex items-center space-x-1 mt-0.5 sm:mt-1 ${
                        isOwn ? 'justify-end' : 'justify-start'
                      }`}>
                        <span className={`text-[9px] sm:text-[9px] font-medium ${
                          isOwn ? "text-blue-200" : "text-gray-400"
                        }`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {/* Check mark para mensajes propios */}
                        {isOwn && (
                          <div className="flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
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

      {/* Botón flotante mejorado - Mobile friendly */}
      {showScrollButton && (
        <div className="absolute bottom-20 sm:bottom-28 right-3 sm:right-5 z-10 animate-in slide-in-from-bottom duration-200">
          <button
            onClick={scrollToBottomQuick}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full p-3 sm:p-3.5 shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-110 active:scale-95 relative border-2 border-blue-400 touch-manipulation"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {unreadCount > 0 && (
              <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full min-w-[20px] sm:min-w-[22px] h-[20px] sm:h-[22px] flex items-center justify-center px-1 sm:px-1.5 shadow-lg ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </button>
        </div>
      )}

      {/* Message Input - Mobile friendly */}
      <div className="border-t-2 border-blue-100 bg-white shadow-lg">
        {/* Reply preview mejorado - Mobile */}
        {replyingTo && (
          <div className="px-3 sm:px-4 pt-2 sm:pt-3 pb-1.5 sm:pb-2 bg-blue-50">
            <div className="flex items-start justify-between bg-white rounded-xl p-2.5 sm:p-3 border-l-4 border-blue-600 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-extrabold text-blue-700 mb-0.5 sm:mb-1">
                  {getUserName(replyingTo.usuario?.nombre, replyingTo.usuario?.apellido)}
                </p>
                <p className="text-xs sm:text-sm text-gray-700 truncate">
                  {replyingTo.contenido}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="ml-2 sm:ml-3 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors hover:bg-gray-100 active:bg-gray-200 rounded-full p-1.5 sm:p-1 touch-manipulation min-h-[36px] min-w-[36px] sm:min-h-[auto] sm:min-w-[auto]"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <div className="p-2.5 sm:p-3">
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Input container mejorado - Mobile */}
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 py-2.5 sm:py-3 px-3 sm:px-4 pr-10 sm:pr-12 bg-gray-50 hover:bg-white transition-colors text-sm sm:text-[15px] shadow-sm"
                disabled={sending}
                maxLength={500}
              />
              {message.length > 400 && (
                <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-bold text-white bg-blue-600 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1">
                  {500 - message.length}
                </div>
              )}
            </div>

            {/* Send button - Touch friendly */}
            <Button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white rounded-full p-0 min-h-[48px] min-w-[48px] sm:min-h-[50px] sm:min-w-[50px] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:shadow-md transition-all hover:scale-105 active:scale-95 flex-shrink-0 touch-manipulation"
            >
              {sending ? (
                <InlineSpinner variant="white" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}