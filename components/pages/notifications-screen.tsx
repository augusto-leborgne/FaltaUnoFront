// app/screens/NotificationsScreen.tsx  (o donde tengas el componente)
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Check, X, Users, Calendar, MessageCircle, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { UsuarioAPI} from "@/lib/api"

type Notification = {
  id: string
  type: "match_invitation" | "friend_request" | "review_request" | "new_message" | "match_update"
  title: string
  message: string
  time: string
  read: boolean
  avatar?: string
  matchId?: string
  userId?: string
  matchTitle?: string
}

export function NotificationsScreen() {
  const router = useRouter()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const currentUserId = "current-user-id" // reemplazá por el id real desde auth / contexto

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true)

        // 1) reseñas pendientes
        const pendingRes = await UsuarioAPI.getPendingReviews(currentUserId)
        const reviewNotifications = (pendingRes.data || []).map((r: any) => ({
          id: `review-${r.partido_id}`,
          type: "review_request" as const,
          title: "Reseña pendiente",
          message: `Califica a los jugadores del partido '${r.nombre_ubicacion}'`,
          time: r.fecha,
          read: false,
          matchId: r.partido_id,
          matchTitle: r.nombre_ubicacion,
        }))

        // 2) invitaciones a partidos
        const invitesRes = await UsuarioAPI.getMatchInvitations(currentUserId)
        const inviteNotifications = (invitesRes.data || []).map((i: any) => ({
          id: `invite-${i.id}`,
          type: "match_invitation" as const,
          title: i.title || "Invitación a partido",
          message: i.message || `Te han invitado al partido ${i.matchId}`,
          time: i.time || i.createdAt,
          read: false,
          matchId: i.matchId,
        }))

        // 3) solicitudes de amistad
        const friendsRes = await UsuarioAPI.getFriendRequests(currentUserId)
        const friendNotifications = (friendsRes.data || []).map((f: any) => ({
          id: `friend-${f.id}`,
          type: "friend_request" as const,
          title: "Solicitud de amistad",
          message: `Usuario ${f.requesterId} quiere ser tu amigo`,
          time: f.createdAt,
          read: false,
          userId: f.requesterId,
        }))

        // 4) mensajes no leídos
        const messagesRes = await UsuarioAPI.getUnreadMessages(currentUserId)
        const messageNotifications = (messagesRes.data || []).map((m: any) => ({
          id: `message-${m.id}`,
          type: "new_message" as const,
          title: "Nuevo mensaje",
          message: m.message || m.contenido,
          time: m.createdAt,
          read: false,
          userId: m.senderId || m.remitenteId,
        }))

        // 5) match updates (opcional)
        const updatesRes = await UsuarioAPI.getMatchUpdates(currentUserId)
        const updateNotifications = (updatesRes.data || []).map((u: any) => ({
          id: `update-${u.partidoId || u.id}`,
          type: "match_update" as const,
          title: "Actualización de partido",
          message: u.message || "Cambio en los datos del partido",
          time: u.createdAt || u.updatedAt || "",
          read: false,
          matchId: u.partidoId,
        }))

        setNotifications([
          ...reviewNotifications,
          ...inviteNotifications,
          ...friendNotifications,
          ...messageNotifications,
          ...updateNotifications,
        ])
      } catch (err) {
        console.error(err)
        toast({ title: "Error", description: "No se pudieron cargar las notificaciones" })
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [toast])

  const unreadCount = notifications.filter((n) => !n.read).length

  // --- A partir de aquí puedes reutilizar exactamente tu JSX original para renderizar la lista ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="pt-16 pb-4 px-6 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
              {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} sin leer</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List: mantén tu JSX tal cual, usando "notifications" */}
      <div className="px-6 py-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay notificaciones</h3>
            <p className="text-gray-500">Cuando tengas nuevas notificaciones aparecerán aquí</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl p-4 border ${
                !notification.read ? "border-primary/20 bg-primary/5" : "border-gray-100"
              }`}
            >
              {/* usa aquí exactamente el markup que ya tenías (avatar, icono, botones) */}
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={notification.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-200">
                      {notification.title?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                    {/* icon mapping */}
                    {notification.type === "match_invitation" || notification.type === "match_update" ? (
                      <Calendar className="w-5 h-5 text-primary" />
                    ) : notification.type === "friend_request" ? (
                      <Users className="w-5 h-5 text-blue-600" />
                    ) : notification.type === "new_message" ? (
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Star className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => {
                      // marcar como leido y navegar
                      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n))
                      if (notification.type === "match_invitation" || notification.type === "match_update" || notification.type === "new_message") {
                        router.push(`/matches/${notification.matchId}`)
                      } else if (notification.type === "friend_request") {
                        router.push(`/users/${notification.userId}`)
                      } else if (notification.type === "review_request") {
                        router.push(`/matches/${notification.matchId}/review`)
                      }
                    }}>
                      <h3 className="font-medium text-gray-900 mb-1">
                        {notification.title}
                        {!notification.read && (
                          <span className="inline-block w-2 h-2 bg-primary rounded-full ml-2"></span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-400">{notification.time}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {notification.type === "match_invitation" && (
                    <div className="flex space-x-2 mt-3">
                      <Button size="sm" onClick={() => { /* aceptar: llamar InscripcionAPI.join o endpoint que corresponda */ }} className="bg-primary hover:bg-primary/90 text-white">
                        <Check className="w-4 h-4 mr-1" /> Aceptar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { /* rechazar */ }}>
                        <X className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  )}

                  {notification.type === "friend_request" && (
                    <div className="flex space-x-2 mt-3">
                      <Button size="sm" onClick={() => { /* aceptar amistad */ }} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Check className="w-4 h-4 mr-1" /> Aceptar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { /* rechazar amistad */ }}>
                        <X className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  )}

                  {notification.type === "review_request" && (
                    <div className="flex space-x-2 mt-3">
                      <Button size="sm" onClick={() => router.push(`/matches/${notification.matchId}/review`)} className="bg-orange-600 hover:bg-orange-700 text-white">
                        <Star className="w-4 h-4 mr-1" /> Calificar ahora
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}