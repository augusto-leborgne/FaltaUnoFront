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
  }, [])

  const loadData = async () => {
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
          setPendingReviews(reviewsData.data)
        } else if (reviewsData.success && reviewsData.data && Array.isArray(reviewsData.data)) {
          setPendingReviews(reviewsData.data)
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
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      {/* HERO HEADER */}
      <div className="pt-12 sm:pt-16 pb-6 sm:pb-8 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-2 mb-1 sm:mb-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ¡Bienvenido!
              </h1>
              <BetaBadge />
            </div>
            <p className="text-base sm:text-base text-muted-foreground">
              {currentUser?.nombre || user?.nombre || "Jugador"}
            </p>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-3 flex-shrink-0">
            <button
              onClick={handleNotifications}
              className="relative p-3 sm:p-2.5 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-200 touch-manipulation active:scale-95"
            >
              <Bell className="w-6 h-6 sm:w-6 sm:h-6 text-primary" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 sm:min-w-[20px] sm:h-5 bg-red-500 text-white text-sm sm:text-xs font-bold rounded-full flex items-center justify-center px-1.5 sm:px-1.5 shadow-md">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <UserAvatar 
              userId={currentUser?.id}
              name={currentUser?.nombre}
              surname={currentUser?.apellido}
              className="w-12 h-12 sm:w-12 sm:h-12 cursor-pointer ring-2 ring-white shadow-md hover:ring-primary transition-all duration-200"
              onClick={() => router.push("/profile")}
            />
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-6">
          <button
            onClick={handleCreateMatch}
            className="bg-gradient-to-r from-primary to-primary/90 active:from-primary/80 active:to-primary/70 text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg active:shadow-md transition-all duration-200 touch-manipulation active:scale-[0.97] group"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-2">
              <Plus className="w-6 h-6 sm:w-7 sm:h-7 group-active:rotate-90 transition-transform duration-300" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base sm:text-lg mb-1 sm:mb-1">Crear Partido</div>
              <div className="text-sm sm:text-sm text-white/80 leading-tight">Organiza un nuevo partido</div>
            </div>
          </button>

          <button
            onClick={handleViewAllMatches}
            className="bg-gradient-to-r from-secondary to-secondary/90 active:from-secondary/80 active:to-secondary/70 text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg active:shadow-md transition-all duration-200 touch-manipulation active:scale-[0.97] group"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-2">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 group-active:scale-110 transition-transform duration-300" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base sm:text-lg mb-1 sm:mb-1">Buscar Partidos</div>
              <div className="text-sm sm:text-sm text-white/80 leading-tight">Únete a un partido</div>
            </div>
          </button>
        </div>

        {/* COMMUNITY STATS */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-4 text-center shadow-md border border-primary/10">
            <div className="flex items-center justify-center mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-green-600 leading-none mb-1 sm:mb-1">{communityStats.activeUsers}</div>
            <div className="text-xs sm:text-xs text-muted-foreground font-medium leading-tight">Activos</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-4 text-center shadow-md border border-primary/10">
            <div className="flex items-center justify-center mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-foreground leading-none mb-1 sm:mb-1">{communityStats.matchesThisWeek}</div>
            <div className="text-xs sm:text-xs text-muted-foreground font-medium leading-tight">Partidos</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-4 text-center shadow-md border border-primary/10">
            <div className="flex items-center justify-center mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-foreground leading-none mb-1 sm:mb-1">{communityStats.newMembers}</div>
            <div className="text-xs sm:text-xs text-muted-foreground font-medium leading-tight">Usuarios</div>
          </div>
        </div>
      </div>

      {/* PENDING REVIEWS */}
      {pendingReviews.length > 0 && (
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-2">
              <div className="w-8 h-8 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 sm:w-4 sm:h-4 text-orange-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Por calificar</h2>
            </div>
            <Badge className="bg-orange-100 text-orange-800 text-sm sm:text-sm font-semibold px-3 sm:px-3 py-1 sm:py-1">
              {pendingReviews.length}
            </Badge>
          </div>
          <div className="space-y-3 sm:space-y-3">
            {pendingReviews.map((review) => (
              <div
                key={review.partido_id}
                onClick={() => handleReviewMatch(review.partido_id)}
                className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200/50 rounded-xl sm:rounded-2xl p-4 sm:p-4 cursor-pointer active:shadow-lg active:border-orange-300 transition-all duration-200 touch-manipulation active:scale-[0.97]"
              >
                <div className="flex items-start justify-between mb-3 sm:mb-3">
                  <div className="flex items-center gap-2 sm:gap-2 flex-wrap">
                    <Badge className="bg-orange-100 text-orange-800 text-sm sm:text-xs font-semibold">{review.tipo_partido}</Badge>
                    <Badge className="bg-red-100 text-red-800 text-sm sm:text-xs font-semibold">Pendiente</Badge>
                  </div>
                  <Star className="w-5 h-5 sm:w-5 sm:h-5 text-orange-600 fill-orange-600 flex-shrink-0 animate-pulse" />
                </div>
                <div className="flex items-start gap-3 sm:gap-3">
                  <div className="w-10 h-10 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <Calendar className="w-5 h-5 sm:w-5 sm:h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 sm:mb-1 text-sm sm:text-base leading-tight">{review.fecha}</h3>
                    <p className="text-sm sm:text-sm text-muted-foreground mb-2 sm:mb-2 flex items-center gap-1 truncate">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{review.nombre_ubicacion}</span>
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm sm:text-xs text-muted-foreground font-medium">
                        {review.jugadores_pendientes?.length || 0} jugadores
                      </span>
                      <div className="flex items-center text-orange-600 font-semibold text-sm sm:text-sm flex-shrink-0">
                        <span className="hidden sm:inline">Calificar ahora</span>
                        <span className="sm:hidden">Calificar</span>
                        <Star className="w-4 h-4 sm:w-4 sm:h-4 ml-1" />
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
      <div className="px-4 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-24">
        <div className="flex items-center justify-between mb-4 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-2">
            <div className="w-8 h-8 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 sm:w-4 sm:h-4 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Próximos partidos</h2>
          </div>
          <Button
            onClick={handleViewAllMatches}
            variant="outline"
            size="sm"
            className="bg-transparent border-2 border-primary text-primary active:bg-primary active:text-white font-semibold transition-all duration-200 text-sm sm:text-sm px-3 sm:px-3 h-9 sm:h-9"
          >
            Ver todos
          </Button>
        </div>

        {upcomingMatches.length > 0 ? (
          <div className="space-y-3 sm:space-y-3">
            {upcomingMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => handleMatchClick(match.id)}
                className="bg-white border-2 border-border/50 active:border-primary/50 rounded-xl sm:rounded-2xl p-4 sm:p-4 cursor-pointer active:shadow-lg transition-all duration-200 touch-manipulation active:scale-[0.97] group"
              >
                <div className="flex items-start justify-between mb-3 sm:mb-3">
                  <div className="flex items-center gap-2 sm:gap-2 flex-wrap">
                    <Badge className="bg-primary/10 text-primary active:bg-primary/20 font-semibold text-sm sm:text-xs">
                      {match.tipo_partido}
                    </Badge>
                    <Badge
                      className={`font-semibold text-sm sm:text-xs ${
                        match.estado === "CONFIRMADO"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {match.estado === "CONFIRMADO" ? "✓ Confirmado" : "Disponible"}
                    </Badge>
                  </div>
                  <Clock className="w-5 h-5 sm:w-5 sm:h-5 text-muted-foreground group-active:text-primary transition-colors flex-shrink-0" />
                </div>
                <div className="flex items-start gap-3 sm:gap-3">
                  <div className="w-12 h-12 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <Calendar className="w-6 h-6 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground mb-1 sm:mb-1 text-sm sm:text-base leading-tight">
                      {match.fecha} • {match.hora}
                    </h3>
                    <p className="text-sm sm:text-sm text-muted-foreground mb-3 sm:mb-3 flex items-center gap-1 truncate">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{match.nombre_ubicacion}</span>
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-2">
                        <Users className="w-4 h-4 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm sm:text-sm font-medium text-foreground">
                          {match.jugadores_actuales}/{match.cantidad_jugadores}
                        </span>
                        <span className="text-sm sm:text-xs text-muted-foreground hidden sm:inline">jugadores</span>
                      </div>
                      <span className="text-sm sm:text-sm text-primary font-semibold group-active:underline flex-shrink-0">
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
            <div className="w-16 h-16 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-4">
              <Calendar className="w-8 h-8 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h3 className="text-lg sm:text-lg font-semibold text-foreground mb-2 sm:mb-2 px-4">No tienes partidos próximos</h3>
            <p className="text-muted-foreground mb-6 sm:mb-6 text-sm sm:text-sm px-4">¡Es hora de unirte a un partido o crear uno nuevo!</p>
            <div className="flex flex-col gap-3 sm:gap-3 justify-center items-stretch px-6 sm:px-6">
              <Button
                onClick={handleViewAllMatches}
                className="bg-gradient-to-r from-primary to-primary/90 active:from-primary/80 active:to-primary/70 text-white font-semibold shadow-lg active:shadow-md transition-all duration-200 w-full h-12 sm:h-auto"
              >
                <Users className="w-5 h-5 mr-2" />
                Buscar Partidos
              </Button>
              <Button
                onClick={handleCreateMatch}
                variant="outline"
                className="border-2 border-primary text-primary active:bg-primary active:text-white font-semibold transition-all duration-200 w-full h-12 sm:h-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
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