"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Clock, Calendar, Star, Bell, Newspaper, TrendingUp, Award } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { API_BASE } from "@/lib/api"
import { useNotifications } from "@/hooks/use-notifications"

interface NewsUpdate {
  id: number
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

const newsUpdates: NewsUpdate[] = [
  {
    id: 1,
    type: "update",
    title: "Nueva funcionalidad: Sistema de reseñas mejorado",
    description: "Ahora puedes calificar a tus compañeros en 3 categorías: nivel técnico, deportividad y compañerismo.",
    date: "Hace 2 horas",
    category: "Funcionalidad",
    author: "Equipo Falta Uno",
    readTime: "2 min",
    tags: ["Reseñas", "Calificaciones", "Comunidad"],
  },
  {
    id: 2,
    type: "announcement",
    title: "Mantenimiento programado del servidor",
    description: "Realizaremos mejoras en la infraestructura para optimizar el rendimiento.",
    date: "Hace 1 día",
    category: "Anuncio",
    author: "Equipo Técnico",
    readTime: "1 min",
    tags: ["Mantenimiento", "Servidor"],
  },
  {
    id: 3,
    type: "feature",
    title: "Nuevas canchas premium en Carrasco",
    description: "Agregamos 3 canchas de última generación con césped sintético e iluminación LED.",
    date: "Hace 3 días",
    category: "Novedad",
    author: "Equipo de Expansión",
    readTime: "3 min",
    tags: ["Canchas", "Carrasco", "Premium"],
  },
]

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
  const [upcomingMatches, setUpcomingMatches] = useState<Partido[]>([])
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [communityStats, setCommunityStats] = useState({
    activeUsers: 0,
    matchesThisWeek: 0,
    newMembers: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      const user = AuthService.getUser()
      if (!user?.id) {
        router.push("/login")
        return
      }

      // Cargar partidos del usuario
      const matchesResponse = await fetch(`${API_BASE}/api/partidos/usuario/${user.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json()
        const partidos = matchesData.data || []
        
        // Filtrar solo próximos partidos
        const now = new Date()
        const proximos = partidos.filter((p: any) => {
          const fechaPartido = new Date(`${p.fecha}T${p.hora}`)
          return fechaPartido > now
        }).slice(0, 5)
        
        setUpcomingMatches(proximos)
      }

      // Cargar reseñas pendientes
      const reviewsResponse = await fetch(`${API_BASE}/api/usuarios/${user.id}/pending-reviews`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json()
        setPendingReviews(reviewsData.data || [])
      }

      // Cargar estadísticas de la comunidad
      const statsResponse = await fetch(`${API_BASE}/api/usuarios/stats`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success && statsData.data) {
          setCommunityStats({
            activeUsers: statsData.data.usuariosActivos || 0,
            matchesThisWeek: statsData.data.totalPartidos || 0,
            newMembers: statsData.data.totalUsuarios || 0,
          })
        }
      }

    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMatchClick = (matchId: string) => router.push(`/matches/${matchId}`)
  const handleReviewMatch = (matchId: string) => router.push(`/matches/${matchId}/review`)
  const handleViewAllMatches = () => router.push("/matches")
  const handleNotifications = () => router.push("/notifications")

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
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const user = AuthService.getUser()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER + STATS */}
      <div className="pt-16 pb-6 px-6 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">¡Bienvenido!</h1>
            <p className="text-muted-foreground">Descubre lo que está pasando</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleNotifications}
              className="relative p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <Bell className="w-6 h-6 text-foreground" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <Avatar className="w-12 h-12 cursor-pointer" onClick={() => router.push("/profile")}>
              {user?.foto_perfil ? (
                <AvatarImage src={`data:image/jpeg;base64,${user.foto_perfil}`} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.nombre?.[0] || "U"}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-green-600">{communityStats.activeUsers}</div>
            <div className="text-xs text-muted-foreground">Activos ahora</div>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-foreground">{communityStats.matchesThisWeek}</div>
            <div className="text-xs text-muted-foreground">Total partidos</div>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-foreground">{communityStats.newMembers}</div>
            <div className="text-xs text-muted-foreground">Total usuarios</div>
          </div>
        </div>
      </div>

      {/* PENDING REVIEWS */}
      {pendingReviews.length > 0 && (
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Partidos por calificar</h2>
            <Badge className="bg-orange-100 text-orange-800">{pendingReviews.length}</Badge>
          </div>
          <div className="space-y-3">
            {pendingReviews.map((review) => (
              <div
                key={review.partido_id}
                onClick={() => handleReviewMatch(review.partido_id)}
                className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all duration-200 touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-orange-100 text-orange-800">{review.tipo_partido}</Badge>
                    <Badge className="bg-red-100 text-red-800">Reseña pendiente</Badge>
                  </div>
                  <Star className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{review.fecha}</h3>
                <p className="text-sm text-muted-foreground mb-2">{review.nombre_ubicacion}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {review.jugadores_pendientes?.length || 0} jugadores por calificar
                  </span>
                  <div className="flex items-center text-orange-600">
                    <Star className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Toca para calificar</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTICIAS */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Novedades</h2>
            <p className="text-sm text-muted-foreground">Últimas actualizaciones</p>
          </div>
        </div>

        <div className="space-y-6">
          {newsUpdates.map((news) => (
            <div
              key={news.id}
              className="bg-card rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 touch-manipulation active:scale-[0.98] border border-border/50"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getNewsIcon(news.type)}
                    <h3 className="font-bold text-foreground text-lg leading-tight">{news.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{news.description}</p>
                {news.tags && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {news.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-muted-foreground">{news.author}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{news.date}</span>
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
                      {match.estado === "CONFIRMADO" ? "Confirmado" : "Pendiente"}
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

      <BottomNavigation />
    </div>
  )
}