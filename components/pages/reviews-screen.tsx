"use client"

import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"
import { API_BASE } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageContainer, PageContent } from "@/components/ui/page-container"
import { PageHeader } from "@/components/ui/page-header"

interface Review {
  id: string
  usuario_que_califica_id: string
  nivel: number
  deportividad: number
  companerismo: number
  comentario?: string
  createdAt: string
}

export function ReviewsScreen() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      const token = AuthService.getToken()
      const user = AuthService.getUser()

      if (!token || !user?.id) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_BASE}/api/reviews/usuario/${user.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        setReviews(result.data || [])
      } else {
        logger.error("Error response:", response.status)
        setReviews([])
      }
    } catch (error) {
      logger.error("Error cargando reviews:", error)
      setReviews([]) // Set empty array on error to prevent crashes
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Mis Reseñas"
      />

      <PageContent>
        {loading ? (
          <div className="text-center py-16">
            <LoadingSpinner size="lg" variant="green" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-16 text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm xs:text-base">Aún no tienes reseñas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const avgRating = Math.round((review.nivel + review.deportividad + review.companerismo) / 3)

              return (
                <div key={review.id} className="bg-white border border-gray-200 rounded-xl xs:rounded-2xl p-4 xs:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-gray-900 text-sm xs:text-base">
                      Usuario {review.usuario_que_califica_id.substring(0, 8)}
                    </span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < avgRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                            }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-600 mb-2 font-medium">Nivel</div>
                      <div className="flex justify-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.nivel
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-center bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-600 mb-2 font-medium">Deportividad</div>
                      <div className="flex justify-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.deportividad
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-center bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-600 mb-2 font-medium">Compañerismo</div>
                      <div className="flex justify-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.companerismo
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {review.comentario && (
                    <p className="text-sm text-gray-700 mb-3 p-3 bg-gray-50 rounded-xl">{review.comentario}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </PageContent>

      <BottomNavigation />
    </PageContainer>
  )
}