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
import { formatDateShort, formatMatchType } from "@/lib/utils"

interface Partido {
  id: string
  tipo_partido: string
  estado: string
  fecha: string
  hora: string
  nombre_ubicacion: string
  jugadores_actuales: number
  cantidad_jugadores: number
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
        
        // Filtrar solo próximos partidos
        const now = new Date()
        const proximos = partidos.filter((p: any) => {
          const fechaPartido = new Date(`${p.fecha}T${p.hora}`)
          return fechaPartido > now
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  const user = AuthService.getUser()

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-primary/5 via-background to-background flex flex-col overflow-x-hidden">
      {/* HERO HEADER */}
      <div className="w-full pt-12 sm:pt-16 pb-6 sm:pb-8 px-4 sm:px-6 max-w-full">
        <div className="flex items-center justify-between mb-4 sm:mb-6 w-full">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
                ¡Bienvenido!
              </h1>
              <BetaBadge />
            </div>
            <p className="text-sm sm:text-base text-muted-foreground truncate">
              {currentUser?.nombre || user?.nombre || "Jugador"}
            </p>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={handleNotifications}
              className="relative p-2.5 sm:p-2.5 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-200 touch-manipulation active:scale-95 min-w-[44px] min-h-[44px]"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-md">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <UserAvatar 
              userId={currentUser?.id}
              name={currentUser?.nombre}
              surname={currentUser?.apellido}
              className="w-10 h-10 sm:w-12 sm:h-12 cursor-pointer ring-2 ring-white shadow-md hover:ring-primary transition-all duration-200"
              onClick={() => router.push("/profile")}
            />
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6">
          <button
            onClick={handleCreateMatch}
            className="w-full bg-gradient-to-r from-primary to-primary/90 active:from-primary/80 active:to-primary/70 text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg active:shadow-md transition-all duration-200 touch-manipulation active:scale-[0.97] group min-h-[90px] sm:min-h-[100px]"
          >
            <div className="flex items-center justify-between mb-2">
              <Plus className="w-6 h-6 sm:w-7 sm:h-7 group-active:rotate-90 transition-transform duration-300" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base sm:text-lg mb-1">Crear Partido</div>
              <div className="text-sm text-white/80 leading-tight">Organiza un nuevo partido</div>
            </div>
          </button>

          <button
            onClick={handleViewAllMatches}
            className="w-full bg-gradient-to-r from-secondary to-secondary/90 active:from-secondary/80 active:to-secondary/70 text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg active:shadow-md transition-all duration-200 touch-manipulation active:scale-[0.97] group min-h-[90px] sm:min-h-[100px]"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 group-active:scale-110 transition-transform duration-300" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base sm:text-lg mb-1">Buscar Partidos</div>
              <div className="text-sm text-white/80 leading-tight">Únete a un partido</div>
            </div>
          </button>
        </div>

        {/* COMMUNITY STATS */}
        <div className="w-full grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white rounded-lg sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-md border border-primary/10 min-h-[75px] sm:min-h-[90px] flex flex-col justify-center">
            <div className="flex items-center justify-center mb-1 sm:mb-1.5">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-green-600" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-green-600 leading-none mb-0.5 sm:mb-1">{communityStats.activeUsers}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Activos</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-md border border-primary/10 min-h-[75px] sm:min-h-[90px] flex flex-col justify-center">
            <div className="flex items-center justify-center mb-1 sm:mb-1.5">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-foreground leading-none mb-0.5 sm:mb-1">{communityStats.matchesThisWeek}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Partidos</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-md border border-primary/10 min-h-[75px] sm:min-h-[90px] flex flex-col justify-center">
            <div className="flex items-center justify-center mb-1 sm:mb-1.5">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-secondary" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-foreground leading-none mb-0.5 sm:mb-1">{communityStats.newMembers}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Nuevos</div>
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
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">Por calificar</h2>
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
      <div className="w-full px-4 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-24">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">Próximos partidos</h2>
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
          <div className="space-y-3">
            {upcomingMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => handleMatchClick(match.id)}
                className="bg-white border-2 border-border/50 active:border-primary/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer active:shadow-lg transition-all duration-200 touch-manipulation active:scale-[0.97] group"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                    <Badge className="bg-primary/10 text-primary active:bg-primary/20 font-semibold text-xs px-2 py-0.5 truncate">{formatMatchType(match.tipo_partido)}</Badge>
                    <Badge
                      className={`font-semibold text-xs px-2 py-0.5 truncate ${
                        match.estado === "CONFIRMADO"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {match.estado === "CONFIRMADO" ? "✓ Confirmado" : "Disponible"}
                    </Badge>
                  </div>
                  <Clock className="w-5 h-5 text-muted-foreground group-active:text-primary transition-colors flex-shrink-0" />
                </div>
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <Calendar className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground mb-1 text-sm sm:text-base leading-tight truncate">
                      {formatDateShort(match.fecha)} • {match.hora}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{match.nombre_ubicacion}</span>
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">
                          {match.jugadores_actuales}/{match.cantidad_jugadores}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">jugadores</span>
                      </div>
                      <span className="text-xs sm:text-sm text-primary font-semibold group-active:underline flex-shrink-0">
                        Ver detalles →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 sm:py-12 bg-white rounded-xl sm:rounded-2xl border-2 border-dashed border-border">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2 px-4">No tienes partidos próximos</h3>
            <p className="text-muted-foreground mb-5 sm:mb-6 text-sm px-4">¡Es hora de unirte a un partido o crear uno nuevo!</p>
            <div className="flex flex-col gap-3 justify-center items-stretch px-6">
              <Button
                onClick={handleViewAllMatches}
                className="bg-gradient-to-r from-primary to-primary/90 active:from-primary/80 active:to-primary/70 text-white font-semibold shadow-lg active:shadow-md transition-all duration-200 w-full min-h-[48px] text-sm sm:text-base touch-manipulation"
              >
                <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5 mr-2" />
                Buscar Partidos
              </Button>
              <Button
                onClick={handleCreateMatch}
                variant="outline"
                className="border-2 border-primary text-primary active:bg-primary active:text-white font-semibold transition-all duration-200 w-full min-h-[48px] text-sm sm:text-base touch-manipulation"
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