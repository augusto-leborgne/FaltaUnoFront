"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Clock, Calendar, Star, Bell, Newspaper, TrendingUp, Award, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { API_BASE, InscripcionAPI, InscripcionEstado, getUserPhotoUrl } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useNotifications } from "@/hooks/use-notifications"
import { useCurrentUser } from "@/hooks/use-current-user"
import { apiCache } from "@/lib/api-cache-manager"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface NewsUpdate {
  id: string
  type: "update" | "announcement" | "feature" | "community"
  title: string
  description: string
  date: string
  image?: string
  category?: string
  author?: string
  readTime?: string
  tags?: string[]
}

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

export function HomeScreen() {
  const router = useRouter()
  const { count: notificationCount } = useNotifications()
  const { user: currentUser } = useCurrentUser() // Obtener usuario con foto actualizada
  const [upcomingMatches, setUpcomingMatches] = useState<Partido[]>([])
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])
  const [newsUpdates, setNewsUpdates] = useState<NewsUpdate[]>([])
  const [isLoading, setIsLoading] = useState(false) // Cambiar a false para mostrar UI rápido
  const [selectedNews, setSelectedNews] = useState<NewsUpdate | null>(null)
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false)
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
      const [matchesResult, reviewsResult, statsResult, novedadesResult] = await Promise.allSettled([
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
        ),
        
        // Cargar novedades (CACHED - más tiempo)
        apiCache.get(
          `novedades-latest`,
          () => fetch(`${API_BASE}/api/novedades?limit=5`, { headers: authHeaders })
            .then(res => res.ok ? res.json() : null),
          { ttl: 15 * 60 * 1000 } // 15 minutos para novedades
        )
      ])

      // Procesar partidos
      if (matchesResult.status === 'fulfilled' && matchesResult.value) {
        const matchesData = matchesResult.value
        const partidos = matchesData.data || []
        
        // Filtrar solo próximos partidos
        const now = new Date()
        const proximos = partidos.filter((p: any) => {
          const fechaPartido = new Date(`${p.fecha}T${p.hora}`)
          return fechaPartido > now
        }).slice(0, 5)
        
        setUpcomingMatches(proximos)
      }

      // Procesar reseñas pendientes
      if (reviewsResult.status === 'fulfilled' && reviewsResult.value) {
        setPendingReviews(reviewsResult.value.data || [])
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

      // Procesar novedades
      if (novedadesResult.status === 'fulfilled' && novedadesResult.value) {
        const novedadesData = novedadesResult.value
        if (novedadesData.success && novedadesData.data) {
          setNewsUpdates(novedadesData.data)
        } else {
          setNewsUpdates(getDefaultNews())
        }
      } else {
        setNewsUpdates(getDefaultNews())
      }

    } catch (error) {
      logger.error("Error cargando datos:", error)
      setNewsUpdates(getDefaultNews())
    } finally {
      setIsLoading(false)
    }
  }

  // Helper para noticias por defecto
  const getDefaultNews = () => [{
    id: "default1",
    type: "feature" as const,
    title: "¡Bienvenido a Falta Uno!",
    description: "La plataforma para organizar partidos de fútbol entre amigos.",
    date: "Recientemente",
    author: "Equipo Falta Uno",
    tags: ["Bienvenida"]
  }]

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
  
  const handleNewsClick = (news: NewsUpdate) => {
    setSelectedNews(news)
    setIsNewsDialogOpen(true)
  }

  const getNewsIcon = (type: string) => {
    switch (type) {
      case "update":
        return <TrendingUp className="w-4 h-4" />
      case "announcement":
        return <Bell className="w-4 h-4" />
      case "feature":
        return <Award className="w-4 h-4" />
      default:
        return <Newspaper className="w-4 h-4" />
    }
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER + STATS */}
      <div className="pt-12 sm:pt-16 pb-3 sm:pb-6 px-3 sm:px-6 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">¡Bienvenido!</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">Descubre lo que está pasando</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <button
              onClick={handleNotifications}
              className="relative p-2 rounded-full hover:bg-white/20 transition-colors touch-manipulation"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            {/* ✅ OPTIMIZADO: UserAvatar con userId para carga automática de foto */}
            <UserAvatar 
              userId={currentUser?.id}
              name={currentUser?.nombre}
              surname={currentUser?.apellido}
              className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 cursor-pointer"
              onClick={() => router.push("/profile")}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-card rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
            <div className="text-base sm:text-lg md:text-xl font-bold text-green-600">{communityStats.activeUsers}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Activos ahora</div>
          </div>
          <div className="bg-card rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
            <div className="text-base sm:text-lg md:text-xl font-bold text-foreground">{communityStats.matchesThisWeek}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Total partidos</div>
          </div>
          <div className="bg-card rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
            <div className="text-base sm:text-lg md:text-xl font-bold text-foreground">{communityStats.newMembers}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Total usuarios</div>
          </div>
        </div>
      </div>

      {/* PENDING REVIEWS */}
      {pendingReviews.length > 0 && (
        <div className="px-3 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground">Partidos por calificar</h2>
            <Badge className="bg-orange-100 text-orange-800 text-xs">{pendingReviews.length}</Badge>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {pendingReviews.map((review) => (
              <div
                key={review.partido_id}
                onClick={() => handleReviewMatch(review.partido_id)}
                className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all duration-200 touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-1">
                    <Badge className="bg-orange-100 text-orange-800 text-[10px] sm:text-xs">{review.tipo_partido}</Badge>
                    <Badge className="bg-red-100 text-red-800 text-[10px] sm:text-xs">Reseña pendiente</Badge>
                  </div>
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base truncate">{review.fecha}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">{review.nombre_ubicacion}</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {review.jugadores_pendientes?.length || 0} jugadores por calificar
                  </span>
                  <div className="flex items-center text-orange-600">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="text-xs sm:text-sm font-medium">Toca para calificar</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTICIAS */}
      <div className="px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Novedades</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Últimas actualizaciones</p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-6">
          {newsUpdates.map((news) => (
            <div
              key={news.id}
              onClick={() => handleNewsClick(news)}
              className="bg-card rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 touch-manipulation active:scale-[0.98] border border-border/50"
            >
              <div className="p-3 sm:p-5">
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNewsIcon(news.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-xs sm:text-sm leading-snug line-clamp-2">
                      {news.title && news.title.length > 100 ? `${news.title.slice(0, 97)}...` : news.title}
                    </h3>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed line-clamp-3">{news.description}</p>
                {news.tags && news.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                    {news.tags.map((tag) => (
                      <span key={tag} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted text-muted-foreground text-[10px] sm:text-xs rounded-lg">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/50">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{news.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PRÓXIMOS PARTIDOS */}
      <div className="px-6 py-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Tus próximos partidos</h2>
          <Button
            onClick={handleViewAllMatches}
            variant="outline"
            size="sm"
            className="bg-transparent border-primary text-primary hover:bg-primary/10"
          >
            Ver todos
          </Button>
        </div>

        {upcomingMatches.length > 0 ? (
          <div className="space-y-4">
            {upcomingMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => handleMatchClick(match.id)}
                className="bg-card rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all duration-200 touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-muted text-muted-foreground hover:bg-muted">
                      {match.tipo_partido}
                    </Badge>
                    <Badge
                      className={`hover:bg-current ${
                        match.estado === "CONFIRMADO"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/20 text-secondary-foreground"
                      }`}
                    >
                      {match.estado === "CONFIRMADO" ? "Confirmado" : "Disponible"}
                    </Badge>
                  </div>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {match.fecha} {match.hora}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">{match.nombre_ubicacion}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {match.jugadores_actuales}/{match.cantidad_jugadores} jugadores
                  </span>
                  <span className="text-sm text-primary font-medium">Ver detalles</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-card rounded-2xl">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No tienes partidos próximos</p>
            <Button
              onClick={handleViewAllMatches}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Buscar Partidos
            </Button>
          </div>
        )}
      </div>

      {/* News Detail Dialog */}
      <Dialog open={isNewsDialogOpen} onOpenChange={setIsNewsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {selectedNews && getNewsIcon(selectedNews.type)}
              <DialogTitle className="text-xl sm:text-2xl">
                {selectedNews?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              Detalles de la novedad: {selectedNews?.title}
            </DialogDescription>
            {selectedNews?.tags && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedNews.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedNews?.description}
            </p>
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {selectedNews?.date}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  )
}