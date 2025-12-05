"use client"

import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Calendar, MapPin, Users, ChevronRight, Plus } from "lucide-react"
import { PartidoAPI, PartidoDTO, MensajeAPI, getUserPhotoUrl } from "@/lib/api"
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

      // ⚡ OPTIMIZACIÓN: Cargar partidos con caché corto para móvil (balance entre velocidad y frescura)
      const response = await apiCache.get(
        `mis-partidos-${currentUser.id}`,
        () => PartidoAPI.misPartidos(currentUser.id),
        { ttl: 5 * 1000 } // 5 segundos - mucho más fresco para móvil
      )

      if (!response.success || !response.data) {
        throw new Error(response.message || "Error al cargar partidos")
      }

      const partidosInscritos = response.data

      // ✅ FIX: Filtrar solo partidos DISPONIBLE o CONFIRMADO
      // No mostrar partidos CANCELADO ni COMPLETADO en chats
      const partidosActivos = partidosInscritos.filter(p =>
        p.estado === 'DISPONIBLE' || p.estado === 'CONFIRMADO'
      )

      if (partidosActivos.length === 0) {
        setPartidos([])
        setLoading(false)
        return
      }

      // ⚡ MEGA OPTIMIZACIÓN: Solo cargar último mensaje de primeros 20 partidos
      // El resto se muestra sin último mensaje (más rápido)
      const partidosToLoad = partidosActivos.slice(0, 20) // Aumentado a 20 para mejor UX

      const partidosWithMessages = await Promise.all(
        partidosToLoad.map(async (partido) => {
          try {
            if (!partido.id) return partido

            // ⚡ Cargar SOLO el último mensaje - MÁXIMA VELOCIDAD
            const messagesResponse = await apiCache.get(
              `ultimo-mensaje-${partido.id}`,
              async () => {
                const resp = await MensajeAPI.list(partido.id!)
                // Tomar SOLO el último mensaje
                if (resp.success && resp.data && resp.data.length > 0) {
                  return {
                    ...resp,
                    data: [resp.data[resp.data.length - 1]] // Solo el último
                  }
                }
                return resp
              },
              { ttl: 10 * 1000 } // 10 segundos - más cache para evitar requests repetidos
            )

            if (messagesResponse.success && messagesResponse.data && messagesResponse.data.length > 0) {
              const lastMessage = messagesResponse.data[0] // Solo hay 1 mensaje

              // ⚡ Detección rápida de no leídos (solo verificar último mensaje)
              const lastVisitKey = `chat_visit_${partido.id}`
              const lastVisitStr = localStorage.getItem(lastVisitKey)
              const lastVisit = lastVisitStr ? new Date(lastVisitStr) : new Date(0)

              const messageDate = new Date(lastMessage.createdAt || '')
              const isUnread = messageDate > lastVisit && lastMessage.usuarioId !== currentUser.id

              return {
                ...partido,
                unreadCount: isUnread ? 1 : 0,
                lastMessage: lastMessage.contenido?.substring(0, 60), // Aumentado a 60 caracteres
                lastMessageTime: lastMessage.createdAt
              } as PartidoWithUnread
            }
            return partido
          } catch (err) {
            // Silenciar errores para no bloquear carga
            return partido as PartidoWithUnread
          }
        })
      )

      // Agregar partidos restantes SIN mensajes (lazy - no bloquea UI)
      const remainingPartidos = partidosActivos.slice(20).map(p => p as PartidoWithUnread)
      const allPartidos = [...partidosWithMessages, ...remainingPartidos]

      // Ordenar: primero con no leídos, luego por fecha más reciente
      allPartidos.sort((a, b) => {
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

      setPartidos(allPartidos)
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
      // Parse yyyy-MM-dd format avoiding timezone issues
      let date: Date;
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateString);
      }

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
        return `Hoy ${time}`
      } else if (date.getTime() === tomorrow.getTime()) {
        return `Mañana ${time}`
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-18 xs:pb-20 sm:pb-22 md:pb-24">
        <LoadingSpinner size="lg" variant="green" text="Cargando chats..." />
      </div>
    )
  }

  // ============================================
  // RENDER - MAIN
  // ============================================
  return (
    <div className="min-h-screen bg-white flex flex-col pb-18 xs:pb-20 sm:pb-22 md:pb-24 safe-bottom">
      {/* Header Compacto como Partidos y Mis Partidos */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm safe-top">
        <div className="px-2 xs:px-3 sm:px-4 md:px-6 md:px-8 py-3 xs:py-3.5 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xs xs:text-sm sm:text-base md:text-lg md:text-xl md:text-2xl font-bold text-gray-900 truncate">Chats</h1>
            <button
              onClick={() => router.push('/create-match')}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full p-2 xs:p-2.5 flex items-center justify-center min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] min-w-[36px] xxs:min-w-[38px] xs:min-w-[40px] sm:min-w-[42px] md:min-w-[44px] xxs:min-w-[42px] xs:min-w-[44px] sm:min-w-[46px] md:min-w-[48px] xs:min-h-[48px] xs:min-w-[48px] touch-manipulation shadow-md transition-transform active:scale-95"
              aria-label="Crear partido"
            >
              <Plus className="w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-2 xs:px-3 sm:px-4 md:px-6 md:px-8 py-3 xs:py-4 overflow-y-auto pb-18 xs:pb-20 sm:pb-22 md:pb-24">
        {/* Error Message */}
        {error && (
          <div className="mb-3 xs:mb-4">
            <div className="p-3 xs:p-4 bg-red-50 border border-red-200 rounded-lg xs:rounded-xl text-red-600 text-xs xs:text-sm">
              {error}
            </div>
          </div>
        )}
        {partidos.length === 0 ? (
          // Estado vacío
          <div className="bg-gray-50 rounded-xl xs:rounded-2xl border border-gray-200 p-8 xs:p-10 sm:p-12 text-center">
            <MessageCircle className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 xs:mb-4" />
            <h3 className="text-sm xs:text-base md:text-base xs:text-lg font-semibold text-gray-900 mb-1.5 xs:mb-2">
              No tienes chats activos
            </h3>
            <p className="text-xs xs:text-sm text-gray-500 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
              Únete a un partido para empezar a conversar con otros jugadores
            </p>
            <button
              onClick={() => router.push('/matches')}
              className="px-5 xs:px-6 py-2.5 xs:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg xs:rounded-xl font-medium transition-all text-sm xs:text-base min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] touch-manipulation active:scale-95"
            >
              Buscar Partidos
            </button>
          </div>
        ) : (
          // Lista de chats
          <div className="space-y-2 xs:space-y-3">
            {partidos.map((partido) => {
              const spotsLeft = (partido.cantidadJugadores ?? 0) - (partido.jugadoresActuales ?? 0)

              return (
                <button
                  key={partido.id}
                  onClick={() => handleChatClick(partido.id)}
                  className={`w-full bg-white border rounded-xl xs:rounded-2xl p-3 xs:p-4 transition-all text-left hover:shadow-lg hover:border-green-200 active:scale-[0.98] touch-manipulation min-h-[88px] ${(partido.unreadCount || 0) > 0
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200'
                    }`}
                >
                  {/* Header row - Badges */}
                  <div className="flex items-start justify-between mb-1.5 xs:mb-2 gap-1.5 xs:gap-2">
                    <div className="flex gap-1 xs:gap-1.5 flex-wrap items-center">
                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-[10px] xs:text-xs px-1.5 xs:px-2 py-0.5">
                        {formatMatchType(partido.tipoPartido || partido.tipo_partido)}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] xs:text-xs px-1.5 xs:px-2 py-0.5">
                        {partido.genero || 'Mixto'}
                      </Badge>
                      {(partido.unreadCount || 0) > 0 && (
                        <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-[10px] xs:text-xs px-1.5 xs:px-2 py-0.5 ml-0.5 xs:ml-1">
                          {partido.unreadCount} {partido.unreadCount === 1 ? 'nuevo' : 'nuevos'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Título principal: Fecha y hora */}
                  <h3 className="text-xs xs:text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-1.5 xs:mb-2 truncate">
                    {formatDate(partido.fecha || '', partido.hora || '')}
                  </h3>

                  {/* Último mensaje si existe */}
                  {partido.lastMessage && (
                    <div className="mb-1.5 xs:mb-2">
                      <p className={`text-xs xs:text-sm truncate ${(partido.unreadCount || 0) > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                        }`}>
                        {partido.lastMessage}
                      </p>
                      <span className="text-[10px] xs:text-xs text-gray-400">
                        {formatMessageTime(partido.lastMessageTime)}
                      </span>
                    </div>
                  )}

                  {/* Información del partido compacta */}
                  <div className="flex items-center justify-between text-[10px] xs:text-xs text-gray-600">
                    <div className="flex items-center space-x-2 xs:space-x-3">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 xs:w-3.5 xs:h-3.5 flex-shrink-0" />
                        <span className="truncate max-w-[100px] xs:max-w-[120px] sm:max-w-[200px]">
                          {partido.nombreUbicacion || partido.nombre_ubicacion}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3 xs:w-3.5 xs:h-3.5 flex-shrink-0" />
                        <span>
                          {partido.jugadoresActuales || 0}/{partido.cantidadJugadores || 0}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 xs:w-4.5 xs:h-4.5 flex-shrink-0 ${(partido.unreadCount || 0) > 0 ? 'text-blue-600' : 'text-gray-400'
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
