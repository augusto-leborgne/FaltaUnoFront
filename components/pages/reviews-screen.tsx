"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Star } from "lucide-react"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"
import { API_BASE } from "@/lib/api"

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

      const response = await fetch(`${API_BASE}/api/reviews?usuarioCalificadoId=${user.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        setReviews(result.data || [])
      } else {
        console.error("Error response:", response.status)
        setReviews([])
      }
    } catch (error) {
      console.error("Error cargando reviews:", error)
      setReviews([]) // Set empty array on error to prevent crashes
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.back()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Mis Reseñas</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 pb-24">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aún no tienes reseñas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const avgRating = Math.round((review.nivel + review.deportividad + review.companerismo) / 3)
              
              return (
                <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">
                      Usuario {review.usuario_que_califica_id.substring(0, 8)}
                    </span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < avgRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Nivel</div>
                      <div className="flex justify-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.nivel
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Deportividad</div>
                      <div className="flex justify-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.deportividad
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Compañerismo</div>
                      <div className="flex justify-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.companerismo
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {review.comentario && (
                    <p className="text-sm text-gray-600 mb-1">{review.comentario}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}