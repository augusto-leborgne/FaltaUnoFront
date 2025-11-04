"use client"

import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Calendar, MapPin, Users, ChevronRight } from "lucide-react"
import { PartidoAPI, PartidoDTO, MensajeAPI } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { BottomNavigation } from "@/components/ui/bottom-navigation"

interface PartidoWithUnread extends PartidoDTO {
  unreadCount?: number
  lastMessage?: string
  lastMessageTime?: string
}

export function ChatsScreen() {
  const router = useRouter()
  const [partidos, setPartidos] = useState<PartidoWithUnread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const currentUser = AuthService.getUser()

  useEffect(() => {
    loadPartidos()
  }, [])

  const loadPartidos = async () => {
    if (!currentUser?.id) {
      setError("Usuario no encontrado")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError("")
      
      const response = await PartidoAPI.misPartidos(currentUser.id)
      
      if (!response.success || !response.data) {
        throw new Error(response.message || "Error al cargar partidos")
      }

      const partidosInscritos = response.data
      
      // Cargar mensajes para cada partido para detectar no leídos
      const partidosWithMessages = await Promise.all(
        partidosInscritos.map(async (partido) => {
          try {
            if (!partido.id) return partido
            
            const messagesResponse = await MensajeAPI.list(partido.id)
            if (messagesResponse.success && messagesResponse.data && messagesResponse.data.length > 0) {
              const messages = messagesResponse.data
              const lastMessage = messages[messages.length - 1]
              
              // Simular mensajes no leídos: contar mensajes de las últimas 24h que no son del usuario
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
              const recentMessages = messages.filter(m => {
                const messageDate = new Date(m.createdAt || '')
                return messageDate > oneDayAgo && m.usuarioId !== currentUser.id
              })
              
              return {
                ...partido,
                unreadCount: recentMessages.length,
                lastMessage: lastMessage.contenido?.substring(0, 50),
                lastMessageTime: lastMessage.createdAt
              } as PartidoWithUnread
            }
            return partido
          } catch (err) {
            logger.error(`[ChatsScreen] Error loading messages for partido ${partido.id}:`, err)
            return partido as PartidoWithUnread
          }
        })
      )
      
      // Ordenar: primero con no leídos, luego por fecha más reciente
      partidosWithMessages.sort((a, b) => {
        // Primero los que tienen mensajes no leídos
        const aUnread = (a as PartidoWithUnread).unreadCount || 0
        const bUnread = (b as PartidoWithUnread).unreadCount || 0
        
        if (aUnread > 0 && bUnread === 0) return -1
        if (aUnread === 0 && bUnread > 0) return 1
        
        // Luego por fecha
        const dateA = new Date((a.fecha || '') + 'T' + (a.hora || ''))
        const dateB = new Date((b.fecha || '') + 'T' + (b.hora || ''))
        return dateB.getTime() - dateA.getTime()
      })

      setPartidos(partidosWithMessages)
    } catch (err) {
      logger.error("[ChatsScreen] Error cargando partidos:", err)
      setError(err instanceof Error ? err.message : "Error al cargar chats")
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (partidoId: string | undefined) => {
    if (!partidoId) return
    router.push(`/matches/${partidoId}/chat`)
  }

  const formatDate = (dateString: string, timeString: string) => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      today.setHours(0, 0, 0, 0)
      tomorrow.setHours(0, 0, 0, 0)
      date.setHours(0, 0, 0, 0)

      if (date.getTime() === today.getTime()) {
        return `Hoy ${timeString.substring(0, 5)}`
      } else if (date.getTime() === tomorrow.getTime()) {
        return `Mañana ${timeString.substring(0, 5)}`
      } else {
        return date.toLocaleDateString("es-ES", { 
          day: "numeric", 
          month: "short",
          year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined
        }) + ` ${timeString.substring(0, 5)}`
      }
    } catch {
      return dateString
    }
  }

  const formatMessageTime = (timestamp: string | undefined) => {
    if (!timestamp) return ""
    
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return "Ahora"
      if (diffMins < 60) return `${diffMins}m`
      if (diffHours < 24) return `${diffHours}h`
      if (diffDays < 7) return `${diffDays}d`
      
      return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    } catch {
      return ""
    }
  }

  // ============================================
  // RENDER - LOADING
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }

  // ============================================
  // RENDER - MAIN
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-4 pt-16">
          <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
          <p className="text-sm text-gray-500 mt-1">
            Conversaciones de tus partidos
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 pt-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4">
        {partidos.length === 0 ? (
          // Estado vacío
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes chats activos
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Únete a un partido para empezar a conversar con otros jugadores
            </p>
            <button
              onClick={() => router.push('/matches')}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-md"
            >
              Buscar Partidos
            </button>
          </div>
        ) : (
          // Lista de chats
          <div className="space-y-2">
            {partidos.map((partido) => (
              <button
                key={partido.id}
                onClick={() => handleChatClick(partido.id)}
                className={`w-full bg-white rounded-xl p-4 border transition-all text-left group relative ${
                  (partido.unreadCount || 0) > 0 
                    ? 'border-blue-400 shadow-md hover:shadow-lg' 
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Tipo de partido con badge de no leídos */}
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-2 h-2 rounded-full ${
                          (partido.unreadCount || 0) > 0 ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                        }`}></div>
                        <span className={`text-sm font-bold ${
                          (partido.unreadCount || 0) > 0 ? 'text-gray-900' : 'text-gray-800'
                        }`}>
                          {partido.tipoPartido || partido.tipo_partido}
                        </span>
                      </div>
                      {(partido.unreadCount || 0) > 0 && (
                        <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                          {partido.unreadCount}
                        </div>
                      )}
                    </div>

                    {/* Último mensaje si existe */}
                    {partido.lastMessage && (
                      <div className="mb-2">
                        <p className={`text-sm truncate ${
                          (partido.unreadCount || 0) > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                        }`}>
                          {partido.lastMessage}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {formatMessageTime(partido.lastMessageTime)}
                        </span>
                      </div>
                    )}

                    {/* Información del partido */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{formatDate(partido.fecha || '', partido.hora || '')}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{partido.nombreUbicacion || partido.nombre_ubicacion}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          {partido.jugadoresActuales || partido.jugadores_actuales || 0}/{partido.cantidadJugadores || partido.cantidad_jugadores || 0} jugadores
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow icon */}
                  <div className="ml-3 flex-shrink-0">
                    <ChevronRight className={`w-5 h-5 transition-colors ${
                      (partido.unreadCount || 0) > 0 ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                    }`} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
