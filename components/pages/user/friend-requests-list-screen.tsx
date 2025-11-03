"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, X, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { AmistadAPI, API_BASE } from "@/lib/api"
import { formatDateRegional } from "@/lib/utils"
import { LoadingSpinner, InlineSpinner } from "@/components/ui/loading-spinner"

interface FriendRequest {
  id: string
  solicitudId: string
  usuario: {
    id: string
    nombre: string
    apellido: string
    foto_perfil?: string
    posicion?: string
    celular?: string
  }
  fechaSolicitud: string
}

export function FriendRequestsListScreen() {
  const router = useRouter()
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadFriendRequests()
  }, [])

  const loadFriendRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      const user = AuthService.getUser()
      if (!user?.id) {
        throw new Error("Usuario no encontrado")
      }

      logger.log("[FriendRequestsList] Cargando solicitudes pendientes...")
      
      const response = await AmistadAPI.listarSolicitudesPendientes()
      logger.log("[FriendRequestsList] Solicitudes recibidas:", response)

      if (response.success && response.data) {
        // Mapear la respuesta del backend al formato esperado
        const mappedRequests: FriendRequest[] = response.data
          .filter((solicitud: any) => solicitud != null && solicitud.usuario != null)
          .map((solicitud: any) => ({
            id: solicitud.id || solicitud.solicitudId,
            solicitudId: solicitud.id || solicitud.solicitudId,
            usuario: {
              id: solicitud.usuario.id || solicitud.usuarioId,
              nombre: solicitud.usuario.nombre || "",
              apellido: solicitud.usuario.apellido || "",
              foto_perfil: solicitud.usuario.fotoPerfil || solicitud.usuario.foto_perfil,
              posicion: solicitud.usuario.posicion,
              celular: solicitud.usuario.celular,
            },
            fechaSolicitud: solicitud.fechaSolicitud || solicitud.fecha_solicitud || solicitud.createdAt || new Date().toISOString(),
          }))
        
        logger.log("[FriendRequestsList] Solicitudes mapeadas:", mappedRequests)
        setFriendRequests(mappedRequests)
      } else {
        setFriendRequests([])
      }
    } catch (error) {
      logger.error("[FriendRequestsList] Error:", error)
      setError(error instanceof Error ? error.message : "Error al cargar solicitudes")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (solicitudId: string) => {
    setProcessingId(solicitudId)
    try {
      logger.log("[FriendRequestsList] Aceptando solicitud:", solicitudId)
      
      const response = await AmistadAPI.aceptarSolicitud(solicitudId)
      
      if (response.success) {
        // Remover de la lista
        setFriendRequests(prev => prev.filter(req => req.solicitudId !== solicitudId))
        logger.log("[FriendRequestsList] Solicitud aceptada exitosamente")
      } else {
        throw new Error(response.message || "Error al aceptar solicitud")
      }
    } catch (error) {
      logger.error("[FriendRequestsList] Error aceptando solicitud:", error)
      alert("Error al aceptar solicitud: " + (error instanceof Error ? error.message : "Intenta nuevamente"))
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (solicitudId: string) => {
    setProcessingId(solicitudId)
    try {
      logger.log("[FriendRequestsList] Rechazando solicitud:", solicitudId)
      
      const response = await AmistadAPI.rechazarSolicitud(solicitudId)
      
      if (response.success) {
        // Remover de la lista
        setFriendRequests(prev => prev.filter(req => req.solicitudId !== solicitudId))
        logger.log("[FriendRequestsList] Solicitud rechazada exitosamente")
      } else {
        throw new Error(response.message || "Error al rechazar solicitud")
      }
    } catch (error) {
      logger.error("[FriendRequestsList] Error rechazando solicitud:", error)
      alert("Error al rechazar solicitud: " + (error instanceof Error ? error.message : "Intenta nuevamente"))
    } finally {
      setProcessingId(null)
    }
  }

  const handleBack = () => router.back()

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" variant="green" text="Cargando solicitudes..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-xl font-bold text-gray-900">Solicitudes de amistad</h1>
            {friendRequests.length > 0 && (
              <Badge className="bg-orange-100 text-orange-800">
                {friendRequests.length}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <Button 
              onClick={loadFriendRequests}
              className="w-full bg-red-600 hover:bg-red-700"
              size="sm"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* Empty State */}
        {friendRequests.length === 0 && !error && (
          <div className="text-center py-16">
            <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes solicitudes pendientes
            </h3>
            <p className="text-gray-600">
              Las solicitudes de amistad aparecerán aquí
            </p>
          </div>
        )}

        {/* Friend Requests List */}
        {friendRequests.length > 0 && (
          <div className="space-y-3">
            {friendRequests.map((request) => {
              if (!request?.usuario) return null;
              
              const fullName = `${request.usuario.nombre || ""} ${request.usuario.apellido || ""}`.trim() || "Usuario"
              const initials = `${request.usuario.nombre?.[0] || ""}${request.usuario.apellido?.[0] || ""}`.toUpperCase() || "?"
              const isProcessing = processingId === request.solicitudId

              return (
                <div
                  key={request.solicitudId}
                  className="bg-gray-50 rounded-2xl p-4 border border-gray-200"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      {request.usuario.foto_perfil ? (
                        <AvatarImage
                          src={`data:image/jpeg;base64,${request.usuario.foto_perfil}`}
                          alt={fullName}
                        />
                      ) : (
                        <AvatarFallback className="bg-orange-100">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {fullName}
                      </h3>
                      {request.usuario.posicion && (
                        <p className="text-sm text-gray-600 mb-1">
                          {request.usuario.posicion}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Solicitud enviada: {formatDateRegional(request.fechaSolicitud)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleAccept(request.solicitudId)}
                      disabled={isProcessing}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <InlineSpinner variant="white" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Aceptar
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleReject(request.solicitudId)}
                      disabled={isProcessing}
                      variant="outline"
                      className="flex-1 py-3 rounded-xl disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <InlineSpinner />
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Rechazar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
