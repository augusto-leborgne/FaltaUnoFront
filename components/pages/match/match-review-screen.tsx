"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface MatchReviewScreenProps {
  matchId: string
}

const mockMatchPlayers = [
  {
    id: 1,
    name: "Juan Carlos",
    position: "Delantero",
    avatar: "/placeholder.svg?height=48&width=48",
  },
  {
    id: 2,
    name: "María González",
    position: "Medio",
    avatar: "/placeholder.svg?height=48&width=48",
  },
  {
    id: 3,
    name: "Diego Rodríguez",
    position: "Defensa",
    avatar: "/placeholder.svg?height=48&width=48",
  },
  {
    id: 4,
    name: "Ana López",
    position: "Arquero",
    avatar: "/placeholder.svg?height=48&width=48",
  },
]

interface PlayerReview {
  playerId: number
  nivel: number
  deportividad: number
  companerismo: number
  comentario: string
}

export function MatchReviewScreen({ matchId }: MatchReviewScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [reviews, setReviews] = useState<PlayerReview[]>(
    mockMatchPlayers.map((player) => ({
      playerId: player.id,
      nivel: 0,
      deportividad: 0,
      companerismo: 0,
      comentario: "",
    })),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBack = () => {
    router.back()
  }

  const updateReview = (playerId: number, field: keyof PlayerReview, value: number | string) => {
    setReviews((prev) => prev.map((review) => (review.playerId === playerId ? { ...review, [field]: value } : review)))
  }

  const renderStarRating = (
    playerId: number,
    category: "nivel" | "deportividad" | "companerismo",
    currentRating: number,
  ) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} onClick={() => updateReview(playerId, category, star)} className="transition-colors">
            <Star
              className={`w-6 h-6 ${
                star <= currentRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-300"
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  const isReviewComplete = (review: PlayerReview) => {
    return review.nivel > 0 && review.deportividad > 0 && review.companerismo > 0
  }

  const allReviewsComplete = reviews.every(isReviewComplete)

  const handleSubmitReviews = async () => {
    if (!allReviewsComplete) {
      toast({
        title: "Reseñas incompletas",
        description: "Por favor califica a todos los jugadores en todas las categorías",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      console.log("Submitting reviews:", reviews)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Here would be the actual API call to:
      // 1. Submit the reviews to the database
      // 2. Mark this match as reviewed for the current user
      // 3. Update user's pending reviews status

      toast({
        title: "¡Reseñas enviadas!",
        description: "Gracias por tu feedback. Ya puedes inscribirte en nuevos partidos.",
      })

      router.push("/")
    } catch (error) {
      toast({
        title: "Error al enviar reseñas",
        description: "Hubo un problema al enviar tus reseñas. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePlayerClick = (playerId: number) => {
    router.push(`/users/${playerId}`)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Calificar Jugadores</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mb-6">
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">¡Partido finalizado!</h2>
            <p className="text-sm text-blue-800">
              Tu opinión es importante. Califica a cada jugador en las siguientes categorías:
            </p>
            <div className="mt-3 space-y-1 text-sm text-blue-700">
              <p>
                <strong>Nivel:</strong> Habilidad técnica y táctica
              </p>
              <p>
                <strong>Deportividad:</strong> Fair play y respeto por las reglas
              </p>
              <p>
                <strong>Compañerismo:</strong> Actitud y trabajo en equipo
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {mockMatchPlayers.map((player) => {
            const playerReview = reviews.find((r) => r.playerId === player.id)!
            const isComplete = isReviewComplete(playerReview)

            return (
              <div
                key={player.id}
                className={`bg-white border rounded-2xl p-6 ${
                  isComplete ? "border-green-200 bg-green-50/30" : "border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <button
                    onClick={() => handlePlayerClick(player.id)}
                    className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={player.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gray-200">
                        {player.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">{player.name}</h3>
                      <p className="text-sm text-gray-600">{player.position}</p>
                    </div>
                  </button>
                  {isComplete && (
                    <div className="ml-auto">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Nivel */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Nivel</label>
                      <span className="text-xs text-gray-500">
                        {playerReview.nivel > 0 ? `${playerReview.nivel}/5` : "Obligatorio"}
                      </span>
                    </div>
                    {renderStarRating(player.id, "nivel", playerReview.nivel)}
                  </div>

                  {/* Deportividad */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Deportividad</label>
                      <span className="text-xs text-gray-500">
                        {playerReview.deportividad > 0 ? `${playerReview.deportividad}/5` : "Obligatorio"}
                      </span>
                    </div>
                    {renderStarRating(player.id, "deportividad", playerReview.deportividad)}
                  </div>

                  {/* Compañerismo */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Compañerismo</label>
                      <span className="text-xs text-gray-500">
                        {playerReview.companerismo > 0 ? `${playerReview.companerismo}/5` : "Obligatorio"}
                      </span>
                    </div>
                    {renderStarRating(player.id, "companerismo", playerReview.companerismo)}
                  </div>

                  {/* Comentario opcional */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Comentario <span className="text-gray-500 font-normal">(opcional)</span>
                    </label>
                    <Textarea
                      placeholder="Comparte tu experiencia jugando con este jugador..."
                      value={playerReview.comentario}
                      onChange={(e) => updateReview(player.id, "comentario", e.target.value)}
                      className="rounded-xl resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600">
              {allReviewsComplete
                ? "¡Todas las reseñas están completas! Puedes enviarlas ahora."
                : `Faltan ${reviews.filter((r) => !isReviewComplete(r)).length} reseñas por completar`}
            </p>
          </div>

          <Button
            onClick={handleSubmitReviews}
            disabled={!allReviewsComplete || isSubmitting}
            className={`w-full py-4 text-lg font-semibold rounded-2xl ${
              allReviewsComplete && !isSubmitting
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Enviando..." : allReviewsComplete ? "Enviar Reseñas" : "Completa todas las reseñas"}
          </Button>

          <Button
            onClick={handleBack}
            variant="outline"
            disabled={isSubmitting}
            className="w-full py-4 text-lg font-semibold rounded-2xl border-gray-300 bg-transparent"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
