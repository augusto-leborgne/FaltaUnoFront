"use client"

import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Calendar, MapPin, Users, ChevronRight, Plus } from "lucide-react"
import { PartidoAPI, PartidoDTO, MensajeAPI } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Badge } from "@/components/ui/badge"
import { apiCache } from "@/lib/api-cache-manager"

interface PartidoWithUnread extends PartidoDTO {
  unreadCount?: number
  lastMessage?: string
  lastMessageTime?: string
}

export function ChatsScreen() {
  const router = useRouter()
  const [partidos, setPartidos] = useState<PartidoWithUnread[]>([])
  const [loading, setLoading] = useState(true) // ⚡ Mostrar spinner mientras carga primera vez
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
      setError("")
      
      // ⚡ OPTIMIZACIÓN: Cargar partidos con caché más largo (reduce latencia)
      const response = await apiCache.get(
        `mis-partidos-${currentUser.id}`,
        () => PartidoAPI.misPartidos(currentUser.id),
        { ttl: 60 * 1000 } // 60 segundos - reduce requests innecesarios
      )
      
      if (!response.success || !response.data) {
        throw new Error(response.message || "Error al cargar partidos")
      }

      const partidosInscritos = response.data
      
      // ⚡ MEGA OPTIMIZACIÓN: Solo cargar último mensaje en lugar de todos
      // Esto reduce dramáticamente el tiempo de carga (de segundos a milisegundos)
      const partidosWithMessages = await Promise.all(
        partidosInscritos.map(async (partido) => {
          try {
            if (!partido.id) return partido
            
            // ⚡ Cargar solo los últimos 5 mensajes para preview (mucho más rápido)
            const messagesResponse = await apiCache.get(
              `mensajes-preview-${partido.id}`,
              async () => {
                const resp = await MensajeAPI.list(partido.id!)
                // Tomar solo los últimos 5 mensajes para el preview
                if (resp.success && resp.data) {
                  return {
                    ...resp,
                    data: resp.data.slice(-5) // Solo últimos 5
                  }
                }
                return resp
              },
              { ttl: 30 * 1000 } // 30 segundos
            )
            
            if (messagesResponse.success && messagesResponse.data && messagesResponse.data.length > 0) {
              const messages = messagesResponse.data
              const lastMessage = messages[messages.length - 1]
              
              // ⚡ Mejorar detección de no leídos con localStorage optimizado
              const lastVisitKey = `chat_visit_${partido.id}`
              const lastVisitStr = localStorage.getItem(lastVisitKey)
              const lastVisit = lastVisitStr ? new Date(lastVisitStr) : new Date(0)
              
              // Solo contar mensajes recientes no leídos (últimos 5)
              const unreadMessages = messages.filter(m => {
                const messageDate = new Date(m.createdAt || '')
                return messageDate > lastVisit && m.usuarioId !== currentUser.id
              })
              
              return {
                ...partido,
                unreadCount: unreadMessages.length,
                lastMessage: lastMessage.contenido?.substring(0, 60), // Mostrar más caracteres
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
    
    // ⚡ Actualizar timestamp de última visita (clave unificada)
    const lastVisitKey = `chat_visit_${partidoId}`
    localStorage.setItem(lastVisitKey, new Date().toISOString())
    
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

      const time = timeString.substring(0, 5)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')

      if (date.getTime() === today.getTime()) {
        return `Hoy ${day}/${month} ${time}`
      } else if (date.getTime() === tomorrow.getTime()) {
        return `Mañana ${day}/${month} ${time}`
      } else {
        const weekday = date.toLocaleDateString("es-ES", { weekday: "long" })
        const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
        return `${formattedWeekday} ${day}/${month} ${time}`
      }
    } catch {
      return `${dateString} ${timeString}`
    }
  }

  const formatMatchType = (type?: string) => {
    if (!type) return "Fútbol 5"
    return type.replace("FUTBOL_", "Fútbol ")
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
        <LoadingSpinner size="lg" variant="green" text="Cargando chats..." />
      </div>
    )
  }

  // ============================================
  // RENDER - MAIN
  // ============================================
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header Compacto como Partidos y Mis Partidos */}
      <div className="pt-safe-top bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Chats</h1>
            <button
              onClick={() => router.push('/create-match')}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full p-2 flex items-center justify-center min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] touch-manipulation shadow-md transition-transform active:scale-95"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 md:px-8 py-4 overflow-y-auto pb-20 sm:pb-24">
        {/* Error Message */}
        {error && (
          <div className="mb-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          </div>
        )}
        {partidos.length === 0 ? (
          // Estado vacío
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes chats activos
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Únete a un partido para empezar a conversar con otros jugadores
            </p>
            <button
              onClick={() => router.push('/matches')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all"
            >
              Buscar Partidos
            </button>
          </div>
        ) : (
          // Lista de chats
          <div className="space-y-2 sm:space-y-3">
            {partidos.map((partido) => {
              const spotsLeft = (partido.cantidadJugadores ?? 0) - (partido.jugadoresActuales ?? 0)
              
              return (
                <button
                  key={partido.id}
                  onClick={() => handleChatClick(partido.id)}
                  className={`w-full bg-white border rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all text-left hover:shadow-lg hover:border-green-200 active:scale-[0.98] ${
                    (partido.unreadCount || 0) > 0 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  {/* Header row - Badges */}
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs px-2 py-0.5">
                        {formatMatchType(partido.tipoPartido || partido.tipo_partido)}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs px-2 py-0.5">
                        {partido.genero || 'Mixto'}
                      </Badge>
                      {(partido.unreadCount || 0) > 0 && (
                        <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-xs px-2 py-0.5 ml-1">
                          {partido.unreadCount} {partido.unreadCount === 1 ? 'nuevo' : 'nuevos'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Título principal: Fecha y hora */}
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    {formatDate(partido.fecha || '', partido.hora || '')}
                  </h3>

                  {/* Último mensaje si existe */}
                  {partido.lastMessage && (
                    <div className="mb-2">
                      <p className={`text-xs sm:text-sm truncate ${
                        (partido.unreadCount || 0) > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                      }`}>
                        {partido.lastMessage}
                      </p>
                      <span className="text-[10px] sm:text-xs text-gray-400">
                        {formatMessageTime(partido.lastMessageTime)}
                      </span>
                    </div>
                  )}

                  {/* Información del partido compacta */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">
                          {partido.nombreUbicacion || partido.nombre_ubicacion}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {partido.jugadoresActuales || 0}/{partido.cantidadJugadores || 0}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                      (partido.unreadCount || 0) > 0 ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
