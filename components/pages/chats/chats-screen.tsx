"use client"

import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Calendar, MapPin, Users, Clock, ChevronRight } from "lucide-react"
import { PartidoAPI, PartidoDTO } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { BottomNavigation } from "@/components/ui/bottom-navigation"

export function ChatsScreen() {
  const router = useRouter()
  const [partidos, setPartidos] = useState<PartidoDTO[]>([])
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

      // Todos los partidos de misPartidos ya son partidos donde el usuario está inscripto
      const partidosInscritos = response.data
      
      // Ordenar por fecha más reciente
      partidosInscritos.sort((a, b) => {
        const dateA = new Date((a.fecha || '') + 'T' + (a.hora || ''))
        const dateB = new Date((b.fecha || '') + 'T' + (b.hora || ''))
        return dateB.getTime() - dateA.getTime()
      })

      setPartidos(partidosInscritos)
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
                className="w-full bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Tipo de partido */}
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-bold text-gray-900">
                          {partido.tipoPartido || partido.tipo_partido}
                        </span>
                      </div>
                    </div>

                    {/* Información del partido */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{formatDate(partido.fecha, partido.hora)}</span>
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
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
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
