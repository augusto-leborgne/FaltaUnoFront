"use client"
import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertTriangle, Star } from "lucide-react"
import { UsuarioAPI} from "@/lib/api"

interface PendingReview {
  matchId: string
  matchType: string
  date: string
  location: string
  playersToReview: { id: string; name: string; avatar?: string }[]
}

interface UserRegistrationGuardProps {
  children: React.ReactNode
  userId: string
}

export function UserRegistrationGuard({ children, userId }: UserRegistrationGuardProps) {
  const router = useRouter()
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    const fetchPendingReviews = async () => {
      try {
        const res = await UsuarioAPI.getPendingReviews(userId)
        const reviews: PendingReview[] = res.data.map((r: PendingReviewFromAPI) => ({
          matchId: r.partido_id,
          matchType: r.tipo_partido,
          date: r.fecha,
          location: r.nombre_ubicacion,
          playersToReview: r.jugadores_pendientes.map((u) => ({
            id: u.id,
            name: `${u.nombre} ${u.apellido}`,
            avatar: u.foto_perfil || "/placeholder.svg",
          })),
        }))
        setPendingReviews(reviews)
        setIsBlocked(reviews.length > 0)
      } catch (err) {
        console.error("Error fetching pending reviews:", err)
        setIsBlocked(false)
      }
    }
    fetchPendingReviews()
  }, [userId])

  const handleCompleteReviews = (matchId: string) => {
    router.push(`/matches/${matchId}/review`)
  }

  if (!isBlocked) return <>{children}</>

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center">
        <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">Reseñas pendientes</h1>
        <p className="text-muted-foreground mb-6">
          Debes completar las reseñas de tus partidos anteriores antes de poder inscribirte en nuevos partidos.
        </p>

        <div className="space-y-4 mb-6">
          {pendingReviews.map((review) => (
            <div key={review.matchId} className="bg-muted rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-orange-100 text-gray-800">{review.matchType}</Badge>
                <span className="text-sm text-muted-foreground">{review.date}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{review.location}</h3>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-sm text-muted-foreground">Jugadores por reseñar:</span>
                <div className="flex -space-x-2">
                  {review.playersToReview.slice(0, 3).map((player) => (
                    <Avatar key={player.id} className="w-6 h-6 border-2 border-background">
                      <AvatarImage src={player.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {player.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {review.playersToReview.length > 3 && (
                    <div className="w-6 h-6 bg-muted-foreground rounded-full flex items-center justify-center text-xs text-background border-2 border-background">
                      +{review.playersToReview.length - 3}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={() => handleCompleteReviews(review.matchId)} className="w-full bg-primary hover:bg-primary/90">
                <Star className="w-4 h-4 mr-2" />
                Completar reseñas
              </Button>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Las reseñas son obligatorias para mantener la calidad de la comunidad
        </p>
      </div>
    </div>
  )
}