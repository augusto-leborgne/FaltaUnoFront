"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { UserRegistrationGuard } from "@/components/user-registration-guard"
import { Clock, Calendar, Star, Bell, Newspaper, TrendingUp, Award } from "lucide-react"
import { useRouter } from "next/navigation"
import { PartidoAPI, ReviewAPI, PendingReviewFromAPI, Partido } from "@/lib/api"
import { AuthService } from "@/lib/auth"

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
  summary?: string
}

const newsUpdates: NewsUpdate[] = [
  {
    id: 1,
    type: "update",
    title: "Nueva funcionalidad: Sistema de reseñas mejorado",
    description:
      "Ahora puedes calificar a tus compañeros en 3 categorías: nivel técnico, deportividad y compañerismo. Las reseñas son obligatorias para mantener la calidad de la comunidad.",
    date: "Hace 2 horas",
    image: "/football-rating-system-with-stars.jpg",
    category: "Funcionalidad",
    author: "Equipo Falta Uno",
    readTime: "2 min",
    tags: ["Reseñas", "Calificaciones", "Comunidad"],
    summary: "Sistema completo de evaluación entre jugadores para mejorar la experiencia de juego",
  },
  {
    id: 2,
    type: "announcement",
    title: "Mantenimiento programado del servidor",
    description:
      "Realizaremos mejoras en la infraestructura para optimizar el rendimiento. Durante este tiempo, algunas funciones podrían no estar disponibles temporalmente.",
    date: "Hace 1 día",
    image: "/server-maintenance-technology.jpg",
    category: "Anuncio",
    author: "Equipo Técnico",
    readTime: "1 min",
    tags: ["Mantenimiento", "Servidor", "Mejoras"],
    summary: "Mejoras técnicas programadas para el domingo de 2:00 a 4:00 AM",
  },
  {
    id: 3,
    type: "feature",
    title: "Nuevas canchas premium en Carrasco",
    description:
      "Agregamos 3 canchas de última generación con césped sintético, iluminación LED y vestuarios renovados. Disponibles para reservar desde hoy con descuentos especiales.",
    date: "Hace 3 días",
    image: "/modern-football-field-with-led-lights.jpg",
    category: "Novedad",
    author: "Equipo de Expansión",
    readTime: "3 min",
    tags: ["Canchas", "Carrasco", "Premium"],
    summary: "Nuevas instalaciones deportivas de alta calidad en zona este",
  },
  {
    id: 4,
    type: "community",
    title: "¡Alcanzamos los 1,500 usuarios activos!",
    description:
      "Gracias a toda la comunidad por hacer crecer esta plataforma. Como celebración, todos los partidos de esta semana tendrán un 20% de descuento en el alquiler de canchas.",
    date: "Hace 5 días",
    image: "/football-community-celebration.jpg",
    category: "Comunidad",
    author: "Fundadores",
    readTime: "2 min",
    tags: ["Milestone", "Descuentos", "Celebración"],
    summary: "Celebramos el crecimiento de nuestra comunidad futbolística",
  },
  {
    id: 5,
    type: "update",
    title: "Notificaciones inteligentes disponibles",
    description:
      "Configurá qué notificaciones querés recibir: invitaciones, recordatorios de partidos, solicitudes de amistad y más. Personalizá tu experiencia desde Configuración.",
    date: "Hace 1 semana",
    image: "/mobile-notifications-settings.jpg",
    category: "Funcionalidad",
    author: "Equipo de Producto",
    readTime: "2 min",
    tags: ["Notificaciones", "Personalización", "UX"],
    summary: "Control total sobre las notificaciones que recibís en tu dispositivo",
  },
]

const communityStats = {
  activeUsers: 1247,
  matchesThisWeek: 89,
  newMembers: 23,
}

// Mapeos internos para que el JSX quede limpio
interface MatchView {
  id: string
  tipo_partido: string
  estado: string
  fecha: string
  hora: string
  nombre_ubicacion: string
  jugadores_actuales: number
  cantidad_jugadores: number
}

interface ReviewView {
  id: string
  tipo_partido: string
  fecha: string
  nombre_ubicacion: string
  jugadores_pendientes: number
}

export function HomeScreen() {
  const router = useRouter()
  const [upcomingMatches, setUpcomingMatches] = useState<MatchView[]>([])
  const [pendingReviews, setPendingReviews] = useState<ReviewView[]>([])
  const [isLoading, setIsLoading] = useState(true)

  if (!AuthService.isLoggedIn()) {
    console.log('not logged in');
    router.push('/matches');
    return;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [matchesRes, reviewsRes] = await Promise.all([
          PartidoAPI.listar(),
          ReviewAPI.getPendingReviews("current-user-id"),
        ])

        if (matchesRes.success) {
          const mappedMatches = matchesRes.data.map((m) => ({
            id: m.id,
            tipo_partido: m.tipo_partido,
            estado: m.estado,
            fecha: m.fecha,
            hora: m.hora,
            nombre_ubicacion: m.nombre_ubicacion,
            jugadores_actuales: m.jugadores_actuales ?? 0,
            cantidad_jugadores: m.cantidad_jugadores,
          }))
          setUpcomingMatches(mappedMatches)
        }

        if (reviewsRes.success) {
          const mappedReviews = reviewsRes.data.map((r) => ({
            id: r.partido_id,
            tipo_partido: r.tipo_partido,
            fecha: r.fecha,
            nombre_ubicacion: r.nombre_ubicacion,
            jugadores_pendientes: r.jugadores_pendientes.length,
          }))
          setPendingReviews(mappedReviews)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleMatchClick = (matchId: string) => router.push(`/matches/${matchId}`)
  const handleReviewMatch = (matchId: string) => router.push(`/matches/${matchId}/review`)
  const handleViewAllMatches = () => router.push("/matches")
  const handleViewAllNews = () => router.push("/news")
  const handleNotifications = () => router.push("/notifications")
  const handleNewsClick = (newsId: number) => router.push(`/news/${newsId}`)

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

  if (isLoading)
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    )

  return (
    <UserRegistrationGuard userId="current-user-id">
      <div className="min-h-screen bg-background flex flex-col">
        {/* HEADER + STATS */}
        <div className="pt-16 pb-6 px-6 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">¡Bienvenido a la comunidad!</h1>
              <p className="text-muted-foreground">Descubre lo que está pasando</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleNotifications}
                className="relative p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <Bell className="w-6 h-6 text-foreground" />
                {pendingReviews.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingReviews.length}
                  </span>
                )}
              </button>
              <Avatar className="w-12 h-12">
                <AvatarImage src="/placeholder.svg?height=48&width=48" />
                <AvatarFallback className="bg-primary/10 text-primary">U</AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-primary">{communityStats.activeUsers}</div>
              <div className="text-xs text-muted-foreground">Usuarios activos</div>
            </div>
            <div className="bg-card rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-foreground">{communityStats.matchesThisWeek}</div>
              <div className="text-xs text-muted-foreground">Partidos esta semana</div>
            </div>
            <div className="bg-card rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-foreground">{communityStats.newMembers}</div>
              <div className="text-xs text-muted-foreground">Nuevos miembros</div>
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
                  key={review.id}
                  onClick={() => handleReviewMatch(review.id)}
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
                      {review.jugadores_pendientes} jugadores por calificar
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
              <h2 className="text-xl font-bold text-foreground">Novedades de la plataforma</h2>
              <p className="text-sm text-muted-foreground">Mantente al día con las últimas actualizaciones</p>
            </div>
            <Button
              onClick={handleViewAllNews}
              variant="outline"
              size="sm"
              className="bg-transparent border-primary text-primary hover:bg-primary/10"
            >
              Ver todas
            </Button>
          </div>

          <div className="space-y-6">
            {newsUpdates.slice(0, 3).map((news) => (
              <div
                key={news.id}
                onClick={() => handleNewsClick(news.id)}
                className="bg-card rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 touch-manipulation active:scale-[0.98] border border-border/50"
              >
                <img src={news.image || "/placeholder.svg"} alt={news.title} className="w-full h-40 object-cover" />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getNewsIcon(news.type)}
                      <h3 className="font-bold text-foreground text-lg leading-tight">{news.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{news.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {news.tags?.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-muted-foreground">Por {news.author}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{news.date}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{news.readTime}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-primary">
                      <span className="text-sm font-medium">Leer más</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PRÓXIMOS PARTIDOS */}
        <div className="px-6 py-6">
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
    </UserRegistrationGuard>
  )
}