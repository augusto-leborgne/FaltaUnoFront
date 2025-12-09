"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BetaBadge } from "@/components/ui/beta-badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Clock, Calendar, Star, Bell, Plus, Users, MapPin, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { API_BASE, InscripcionAPI, InscripcionEstado, getUserPhotoUrl } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useNotifications } from "@/hooks/use-notifications"
import { useCurrentUser } from "@/hooks/use-current-user"
import { apiCache } from "@/lib/api-cache-manager"
import { formatDateShort, formatMatchType, formatMatchDate, getSpotsLeftColor, formatSpotsLeft, formatLocation } from "@/lib/utils"

interface Partido {
  id: string
  tipo_partido: string
  genero?: string
  estado: string
  fecha: string
  hora: string
  duracion?: number
  nombre_ubicacion: string
  jugadores_actuales: number
  cantidad_jugadores: number
  precio_total?: number
}

interface PendingReview {
  partido_id: string
  tipo_partido: string
  fecha: string
  nombre_ubicacion: string
  jugadores_pendientes: any[]
}

interface UserStats {
  partidosJugados: number
  promedioRating: number
  partidosPendientes: number
}

export function HomeScreen() {
  const router = useRouter()
  const { count: notificationCount } = useNotifications()
  const { user: currentUser } = useCurrentUser()
  const [upcomingMatches, setUpcomingMatches] = useState<Partido[]>([])
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userStats, setUserStats] = useState<UserStats>({
    partidosJugados: 0,
    promedioRating: 0,
    partidosPendientes: 0
  })
  const [communityStats, setCommunityStats] = useState({
    activeUsers: 0,
    matchesThisWeek: 0,
    newMembers: 0,
  })

  useEffect(() => {
    // ⚡ CRITICAL: Check auth before loading any data
    const token = AuthService.getToken()
    if (!token || AuthService.isTokenExpired(token)) {
      router.replace("/login")
      return
    }

    const user = AuthService.getUser()
    if (!user?.id) {
      router.replace("/login")
      return
    }

    loadData()

    // Recargar cuando el usuario vuelve a la pantalla
    const handleFocus = () => {
      if (AuthService.isLoggedIn()) {
        loadData()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Double-check auth before making requests
      const token = AuthService.getToken()
      if (!token || AuthService.isTokenExpired(token)) {
        router.replace("/login")
        return
      }

      const user = AuthService.getUser()
      if (!user?.id) {
        router.replace("/login")
        return
      }

      const authHeaders = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }

      // ⚡ OPTIMIZACIÓN: Cargar datos en paralelo CON CACHÉ
      const [matchesResult, reviewsResult, statsResult] = await Promise.allSettled([
        // Cargar partidos del usuario (CACHED)
        apiCache.get(
          `partidos-usuario-${user.id}`,
          () => fetch(`${API_BASE}/api/partidos/usuario/${user.id}`, { headers: authHeaders })
            .then(res => res.ok ? res.json() : null)
        ),

        // Cargar reseñas pendientes (CACHED)
        apiCache.get(
          `pending-reviews-${user.id}`,
          () => fetch(`${API_BASE}/api/usuarios/${user.id}/pending-reviews`, { headers: authHeaders })
            .then(res => res.ok ? res.json() : null)
        ),

        // Cargar estadísticas de la comunidad (CACHED - más tiempo)
        apiCache.get(
          `stats-global`,
          () => fetch(`${API_BASE}/api/usuarios/stats`, { headers: authHeaders })
            .then(res => res.ok ? res.json() : null),
          { ttl: 10 * 60 * 1000 } // 10 minutos para stats globales
        )
      ])

      // Procesar partidos
      if (matchesResult.status === 'fulfilled' && matchesResult.value) {
        const matchesData = matchesResult.value
        const partidos = Array.isArray(matchesData.data) ? matchesData.data : []

        // Filtrar solo próximos partidos DISPONIBLES o CONFIRMADOS (excluir CANCELADO y COMPLETADO)
        const now = new Date()
        const proximos = partidos.filter((p: any) => {
          const fechaPartido = new Date(`${p.fecha}T${p.hora}`)
          const estadoValido = p.estado === 'DISPONIBLE' || p.estado === 'CONFIRMADO'
          return fechaPartido > now && estadoValido
        }).slice(0, 5)

        setUpcomingMatches(proximos)
      } else {
        setUpcomingMatches([])
      }

      // Procesar reseñas pendientes
      if (reviewsResult.status === 'fulfilled' && reviewsResult.value) {
        const reviewsData = reviewsResult.value
        // Defensive check: ensure data is an array before setting
        if (Array.isArray(reviewsData.data)) {
          // ✅ FIX: Agrupar por partido_id para mostrar solo UNA tarjeta por partido
          const uniquePartidos = new Map()
          reviewsData.data.forEach((review: any) => {
            if (!uniquePartidos.has(review.partido_id)) {
              uniquePartidos.set(review.partido_id, {
                partido_id: review.partido_id,
                tipo_partido: review.tipo_partido,
                fecha: review.fecha,
                nombre_ubicacion: review.nombre_ubicacion || 'Sin ubicación',
                // Guardar array de jugadores pendientes de calificar para este partido
                jugadores_pendientes: reviewsData.data.filter((r: any) => r.partido_id === review.partido_id)
              })
            }
          })
          setPendingReviews(Array.from(uniquePartidos.values()))
        } else if (reviewsData.success && reviewsData.data && Array.isArray(reviewsData.data)) {
          // Same logic for nested data structure
          const uniquePartidos = new Map()
          reviewsData.data.forEach((review: any) => {
            if (!uniquePartidos.has(review.partido_id)) {
              uniquePartidos.set(review.partido_id, {
                partido_id: review.partido_id,
                tipo_partido: review.tipo_partido,
                fecha: review.fecha,
                nombre_ubicacion: review.nombre_ubicacion || 'Sin ubicación',
                jugadores_pendientes: reviewsData.data.filter((r: any) => r.partido_id === review.partido_id)
              })
            }
          })
          setPendingReviews(Array.from(uniquePartidos.values()))
        } else {
          setPendingReviews([])
        }
      } else {
        setPendingReviews([])
      }

      // Procesar estadísticas
      if (statsResult.status === 'fulfilled' && statsResult.value) {
        const statsData = statsResult.value
        if (statsData.success && statsData.data) {
          setCommunityStats({
            activeUsers: statsData.data.usuariosActivos || 0,
            matchesThisWeek: statsData.data.totalPartidos || 0,
            newMembers: statsData.data.totalUsuarios || 0,
          })
        }
      }

    } catch (error) {
      logger.error("Error cargando datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMatchClick = async (matchId: string) => {
    // Verificar si el usuario está inscrito y aceptado
    const user = AuthService.getUser()
    if (user) {
      try {
        const estadoResponse = await InscripcionAPI.getEstado(matchId, user.id)
        if (estadoResponse.success && estadoResponse.data?.estado === InscripcionEstado.ACEPTADO) {
          router.push(`/my-matches/${matchId}`)
          return
        }
      } catch (err) {
        logger.error("[HomeScreen] Error verificando inscripción:", err)
      }
    }
    router.push(`/matches/${matchId}`)
  }
  const handleReviewMatch = (matchId: string) => router.push(`/matches/${matchId}/review`)
  const handleViewAllMatches = () => router.push("/matches")
  const handleNotifications = () => router.push("/notifications")
  const handleCreateMatch = () => router.push("/create-match")

  // ============================================
  // HELPERS DE FORMATO (idénticos a matches-listing)
  // ============================================

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

      const time = timeString.substring(0, 5)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')

      if (compareDate.getTime() === today.getTime()) {
        return `Hoy ${day}/${month} ${time}`
      } else if (compareDate.getTime() === tomorrow.getTime()) {
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

  const getSpotsLeftColor = (spotsLeft: number) => {
    if (spotsLeft === 0) return "bg-red-100 text-red-800"
    if (spotsLeft <= 3) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  const user = AuthService.getUser()

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-green-50 via-white to-orange-50 flex flex-col overflow-x-hidden scroll-safe-bottom">
      {/* HEADER - Estilo Falta Uno - Banner verde limpio sin decoraciones */}
      <div className="w-full bg-gradient-to-r from-green-500 via-green-600 to-green-500 safe-top pt-3 sm:pt-5 md:pt-7 pb-14 sm:pb-18 md:pb-22 px-3 xs:px-4 sm:px-5 md:px-6 relative overflow-hidden">
        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-lg xs:text-xl sm:text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
              Falta Uno
            </h1>
            <BetaBadge />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleNotifications}
              className="relative p-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg hover:bg-white/30 transition-all duration-200 touch-manipulation active:scale-95 min-w-[36px] xxs:min-w-[38px] xs:min-w-[40px] sm:min-w-[42px] md:min-w-[44px] xxs:min-w-[42px] xs:min-w-[44px] sm:min-w-[46px] md:min-w-[48px] min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] flex items-center justify-center"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-md border-2 border-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <UserAvatar
              userId={currentUser?.id}
              name={currentUser?.nombre}
              surname={currentUser?.apellido}
              className="w-11 h-11 sm:w-12 sm:h-12 cursor-pointer ring-3 ring-white shadow-lg hover:scale-105 transition-all duration-200"
              onClick={() => router.push("/profile")}
            />
          </div>
        </div>

        {/* Saludo */}
        <div className="relative z-10">
          <h2 className="text-base xs:text-lg sm:text-xl sm:text-2xl font-bold text-white mb-1">
            ¡Hola, {currentUser?.nombre || user?.nombre || "Jugador"}! ⚽
          </h2>
          <p className="text-green-50 text-sm sm:text-base font-medium">
            ¿Listo para tu próximo partido?
          </p>
        </div>
      </div>

      {/* QUICK ACTIONS - Tarjetas destacadas */}
      <div className="w-full px-4 sm:px-6 -mt-12 sm:-mt-16 relative z-20 mb-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Crear Partido */}
          <button
            onClick={handleCreateMatch}
            className="group bg-gradient-to-br from-green-500 to-green-600 rounded-xl xs:rounded-2xl p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 touch-manipulation"
          >
            <div className="bg-white/20 backdrop-blur-sm rounded-xl w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
              <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-white font-bold text-sm xs:text-base md:text-base sm:text-lg mb-1 text-left">Crear Partido</h3>
            <p className="text-green-50 text-xs sm:text-sm text-left">Organiza tu partido</p>
          </button>

          {/* Buscar Partidos */}
          <button
            onClick={handleViewAllMatches}
            className="group bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl xs:rounded-2xl p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 touch-manipulation"
          >
            <div className="bg-white/20 backdrop-blur-sm rounded-xl w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-white font-bold text-sm xs:text-base md:text-base sm:text-lg mb-1 text-left">Buscar Partidos</h3>
            <p className="text-orange-50 text-xs sm:text-sm text-left">Únete a un partido</p>
          </button>
        </div>
      </div>

      {/* COMMUNITY STATS */}
      <div className="w-full px-4 sm:px-6 mb-6">
        <div className="bg-white rounded-xl xs:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Comunidad Falta Uno</h3>
          <div className="grid grid-cols-3 gap-2 xs:gap-3 sm:gap-4">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="text-base xs:text-lg sm:text-xl sm:text-2xl font-bold text-gray-900">{communityStats.activeUsers}</div>
              <div className="text-xs text-gray-500 font-medium">Activos</div>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="text-base xs:text-lg sm:text-xl sm:text-2xl font-bold text-gray-900">{communityStats.matchesThisWeek}</div>
              <div className="text-xs text-gray-500 font-medium">Partidos</div>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
              <div className="text-base xs:text-lg sm:text-xl sm:text-2xl font-bold text-gray-900">{communityStats.newMembers}</div>
              <div className="text-xs text-gray-500 font-medium">Jugadores</div>
            </div>
          </div>
        </div>
      </div>

      {/* PENDING REVIEWS */}
      {pendingReviews.length > 0 && (
        <div className="w-full px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="text-sm xs:text-base md:text-base sm:text-lg md:text-xl font-bold text-foreground truncate">Por calificar</h2>
            </div>
            <Badge className="bg-orange-100 text-orange-800 text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 flex-shrink-0">
              {pendingReviews.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {pendingReviews.map((review) => (
              <div
                key={review.partido_id}
                onClick={() => handleReviewMatch(review.partido_id)}
                className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer active:shadow-lg active:border-orange-300 transition-all duration-200 touch-manipulation active:scale-[0.97]"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                    <Badge className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 truncate">{formatMatchType(review.tipo_partido)}</Badge>
                    <Badge className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 truncate">Pendiente</Badge>
                  </div>
                  <Star className="w-5 h-5 text-orange-600 fill-orange-600 flex-shrink-0 animate-pulse" />
                </div>
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <Calendar className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base leading-tight truncate">{formatDateShort(review.fecha)}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{review.nombre_ubicacion}</span>
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
                        {review.jugadores_pendientes?.length || 0} jugadores
                      </span>
                      <div className="flex items-center text-orange-600 font-semibold text-xs sm:text-sm flex-shrink-0">
                        <span className="hidden sm:inline">Calificar ahora</span>
                        <span className="sm:hidden">Calificar</span>
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRÓXIMOS PARTIDOS */}
      <div className="w-full px-2 xs:px-3 sm:px-4 md:px-6 py-3 xs:py-4 sm:py-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm xs:text-base md:text-base sm:text-lg md:text-xl font-bold text-foreground truncate">Próximos partidos</h2>
          </div>
          <Button
            onClick={handleViewAllMatches}
            variant="outline"
            size="sm"
            className="bg-transparent border-2 border-primary text-primary active:bg-primary active:text-white font-semibold transition-all duration-200 text-xs sm:text-sm px-2.5 sm:px-3 h-8 sm:h-9 flex-shrink-0"
          >
            Ver todos
          </Button>
        </div>

        {upcomingMatches.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {upcomingMatches.map((match) => {
              const spotsLeft = (match.cantidad_jugadores ?? 0) - (match.jugadores_actuales ?? 0)

              return (
                <div
                  key={match.id}
                  onClick={() => handleMatchClick(match.id)}
                  className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:border-green-200 transition-all duration-200 touch-manipulation active:scale-[0.98] active:shadow-md"
                >
                  {/* Header row - Badges */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                        {formatMatchType(match.tipo_partido)}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                        {match.genero || 'Mixto'}
                      </Badge>
                    </div>
                    <Badge className={`${getSpotsLeftColor(spotsLeft)} hover:bg-current text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1 whitespace-nowrap flex-shrink-0`}>
                      {formatSpotsLeft(spotsLeft)}
                    </Badge>
                  </div>

                  {/* Match Info */}
                  <div className="mb-3 sm:mb-4">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                      {formatMatchDate(match.fecha, match.hora)}
                    </h3>

                    {/* Price and Duration */}
                    <div className="flex flex-wrap items-center text-gray-600 text-xs sm:text-sm gap-x-3 gap-y-1 mb-2">
                      <div className="flex items-center space-x-1 font-medium">
                        <span className="text-green-600 text-sm sm:text-base">
                          ${match.precio_total && match.cantidad_jugadores
                            ? Math.round(match.precio_total / match.cantidad_jugadores)
                            : 0}
                        </span>
                        <span className="text-gray-500">/ jugador</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span>{match.duracion || 90} min</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-start text-gray-600 text-xs sm:text-sm">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2 sm:line-clamp-1">{formatLocation(match.nombre_ubicacion)}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs sm:text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{match.jugadores_actuales}</span>
                      <span className="text-gray-400">/{match.cantidad_jugadores}</span>
                    </span>
                    <span className="text-xs sm:text-sm text-green-600">
                      Ver detalles →
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 sm:py-12 bg-white rounded-xl sm:rounded-2xl border-2 border-dashed border-border">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h3 className="text-sm xs:text-base md:text-base sm:text-lg font-semibold text-foreground mb-2 px-4">No tienes partidos próximos</h3>
            <p className="text-muted-foreground mb-5 sm:mb-6 text-sm px-4">¡Es hora de unirte a un partido o crear uno nuevo!</p>
            <div className="flex flex-col gap-3 justify-center items-stretch px-6">
              <Button
                onClick={handleViewAllMatches}
                className="bg-gradient-to-r from-primary to-primary/90 active:from-primary/80 active:to-primary/70 text-white font-semibold shadow-lg active:shadow-md transition-all duration-200 w-full min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] text-sm sm:text-base touch-manipulation"
              >
                <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5 mr-2" />
                Buscar Partidos
              </Button>
              <Button
                onClick={handleCreateMatch}
                variant="outline"
                className="border-2 border-primary text-primary active:bg-primary active:text-white font-semibold transition-all duration-200 w-full min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] text-sm sm:text-base touch-manipulation"
              >
                <Plus className="w-4.5 h-4.5 sm:w-5 sm:h-5 mr-2" />
                Crear Partido
              </Button>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}