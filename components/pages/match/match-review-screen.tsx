"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/lib/auth"
import { ReviewAPI } from "@/lib/api"
import { useJugadores } from "@/lib/api-hooks"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface MatchReviewScreenProps {
  matchId: string
}

interface PlayerReview {
  playerId: string
  nivel: number
  deportividad: number
  companerismo: number
  comentario: string
}

export function MatchReviewScreen({ matchId }: MatchReviewScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const user = AuthService.getUser()
  
  const { jugadores, loading } = useJugadores(matchId)
  const [reviews, setReviews] = useState<PlayerReview[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      router.push("/login")
      return
    }

    // Filtrar el usuario actual y inicializar reviews
    const otherPlayers = jugadores.filter(p => p.id !== user.id)
    
    if (otherPlayers.length > 0) {
      setReviews(otherPlayers.map(player => ({
        playerId: player.id,
        nivel: 0,
        deportividad: 0,
        companerismo: 0,
        comentario: "",
      })))
    }
  }, [jugadores, user?.id])

  const handleBack = () => {
    router.back()
  }

  const updateReview = (playerId: string, field: keyof PlayerReview, value: number | string) => {
    setReviews((prev) => 
      prev.map((review) => 
        review.playerId === playerId ? { ...review, [field]: value } : review
      )
    )
  }

  const renderStarRating = (
    playerId: string,
    category: "nivel" | "deportividad" | "companerismo",
    currentRating: number,
  ) => {
    return (
      <div className="flex space-x-1.5 xs:space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button 
            key={star} 
            type="button"
            onClick={() => updateReview(playerId, category, star)} 
            className="transition-colors touch-manipulation min-w-[40px] min-h-[40px] xs:min-w-[44px] xs:min-h-[44px] flex items-center justify-center active:scale-95"
          >
            <Star
              className={`w-7 h-7 xs:w-8 xs:h-8 ${
                star <= currentRating 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "text-gray-300 hover:text-yellow-300"
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

    if (!user?.id) {
      router.push("/login")
      return
    }

    setIsSubmitting(true)

    try {
      // Enviar cada review usando ReviewAPI
      const promises = reviews.map(review =>
        ReviewAPI.crear({
          partidoId: matchId,
          usuarioQueCalificaId: user.id,
          usuarioCalificadoId: review.playerId,
          nivel: review.nivel,
          deportividad: review.deportividad,
          companerismo: review.companerismo,
          comentario: review.comentario || undefined
        })
      )

      const results = await Promise.allSettled(promises)
      
      // Contar éxitos y fallos
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (successful > 0) {
        toast({
          title: failed === 0 ? "¡Reseñas enviadas!" : `${successful} reseñas enviadas`,
          description: failed === 0 ? "Gracias por tu feedback." : `${failed} reseña(s) no se pudieron enviar.`,
          variant: failed > 0 ? "default" : "default",
        })
        router.push("/home")
      } else {
        throw new Error("No se pudo enviar ninguna reseña")
      }
    } catch (error) {
      logger.error("Error enviando reseñas:", error)
      toast({
        title: "Error al enviar reseñas",
        description: error instanceof Error ? error.message : "Hubo un problema. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePlayerClick = (playerId: string) => {
    router.push(`/users/${playerId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-3 xs:px-4 sm:px-6">
        <LoadingSpinner size="xl" variant="green" text="Cargando reseña..." />
      </div>
    )
  }

  const otherPlayers = jugadores.filter(p => p.id !== user?.id)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-12 xs:pt-14 sm:pt-16 pb-4 xs:pb-5 sm:pb-6 px-3 xs:px-4 sm:px-6 border-b border-gray-100 safe-top">
        <div className="flex items-center space-x-3 xs:space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation active:scale-95 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-base xs:text-lg sm:text-xl font-bold text-gray-900">Calificar Jugadores</h1>
        </div>
      </div>

      <div className="flex-1 px-3 xs:px-4 sm:px-6 py-4 xs:py-5 sm:py-6 pb-20 xs:pb-24 sm:pb-28 safe-bottom">
        <div className="mb-4 xs:mb-5 sm:mb-6">
          <div className="bg-blue-50 rounded-lg xs:rounded-xl p-3 xs:p-4 mb-4 xs:mb-5 sm:mb-6">
            <h2 className="text-sm xs:text-base font-semibold text-blue-900 mb-2">¡Partido finalizado!</h2>
            <p className="text-xs xs:text-sm text-blue-800">
              Tu opinión es importante. Califica a cada jugador en las siguientes categorías:
            </p>
            <div className="mt-2.5 xs:mt-3 space-y-1 text-xs xs:text-sm text-blue-700">
              <p><strong>Nivel:</strong> Habilidad técnica y táctica</p>
              <p><strong>Deportividad:</strong> Fair play y respeto por las reglas</p>
              <p><strong>Compañerismo:</strong> Actitud y trabajo en equipo</p>
            </div>
          </div>
        </div>

        {otherPlayers.length === 0 ? (
          <div className="text-center py-10 xs:py-12">
            <p className="text-xs xs:text-sm sm:text-base text-gray-500">No hay jugadores para calificar</p>
            <Button onClick={() => router.push("/home")} className="mt-3 xs:mt-4 min-h-[48px] touch-manipulation active:scale-[0.98]">
              Volver al inicio
            </Button>
          </div>
        ) : (
          <div className="space-y-4 xs:space-y-5 sm:space-y-6">
            {otherPlayers.map((player) => {
              const playerReview = reviews.find((r) => r.playerId === player.id)
              if (!playerReview) return null
              
              const isComplete = isReviewComplete(playerReview)
              const fullName = `${player.nombre} ${player.apellido}`.trim()
              const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase()

              return (
                <div
                  key={player.id}
                  className={`bg-white border rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 ${
                    isComplete ? "border-green-200 bg-green-50/30" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 xs:space-x-3 mb-3 xs:mb-4">
                    <button
                      onClick={() => handlePlayerClick(player.id)}
                      className="flex items-center space-x-2.5 xs:space-x-3 hover:opacity-80 transition-opacity touch-manipulation active:scale-[0.98]"
                    >
                      <Avatar className="w-11 xs:w-12 sm:w-14 h-11 xs:h-12 sm:h-14">
                        {player.foto_perfil ? (
                          <AvatarImage src={`data:image/jpeg;base64,${player.foto_perfil}`} />
                        ) : (
                          <AvatarFallback className="bg-gray-200">{initials}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="text-sm xs:text-base font-semibold text-gray-900">{fullName}</h3>
                        <p className="text-xs xs:text-sm text-gray-600">{player.posicion || "Jugador"}</p>
                      </div>
                    </button>
                    {isComplete && (
                      <div className="ml-auto">
                        <div className="w-6 xs:w-7 h-6 xs:h-7 bg-primary rounded-full flex items-center justify-center">
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

                  <div className="space-y-3 xs:space-y-4">
                    {/* Nivel */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5 xs:mb-2">
                        <label className="text-xs xs:text-sm font-medium text-gray-700">Nivel</label>
                        <span className="text-[10px] xs:text-xs text-gray-500">
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
                        className="rounded-lg xs:rounded-xl resize-none text-xs xs:text-sm"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 xs:mt-8 space-y-3 xs:space-y-4">
          <div className="bg-gray-50 rounded-lg xs:rounded-xl p-3 xs:p-4 text-center">
            <p className="text-xs xs:text-sm text-gray-600">
              {allReviewsComplete
                ? "¡Todas las reseñas están completas! Puedes enviarlas ahora."
                : `Faltan ${reviews.filter((r) => !isReviewComplete(r)).length} reseñas por completar`}
            </p>
          </div>

          <Button
            onClick={handleSubmitReviews}
            disabled={!allReviewsComplete || isSubmitting}
            className={`w-full min-h-[48px] xs:min-h-[52px] text-sm xs:text-base sm:text-lg font-semibold rounded-xl xs:rounded-2xl touch-manipulation active:scale-[0.98] ${
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
            className="w-full min-h-[48px] xs:min-h-[52px] text-sm xs:text-base sm:text-lg font-semibold rounded-xl xs:rounded-2xl border-gray-300 bg-transparent touch-manipulation active:scale-[0.98]"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}