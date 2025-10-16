"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Check, X, Users, Calendar, MessageCircle, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/lib/auth"

type NotificationType = "match_invitation" | "friend_request" | "review_request" | "new_message" | "match_update"

interface Notification {
  id: string
  type: NotificationType
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

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
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

      const allNotifications: Notification[] = []

      // 1. Reseñas pendientes
      try {
        const reviewsResponse = await fetch(`/api/usuarios/${user.id}/pending-reviews`, {
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        })
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json()
          const reviews = reviewsData.data || []
          reviews.forEach((r: any) => {
            allNotifications.push({
              id: `review-${r.partido_id}`,
              type: "review_request",
              title: "Reseña pendiente",
              message: `Califica a los jugadores del partido en ${r.nombre_ubicacion}`,
              time: r.fecha,
              read: false,
              matchId: r.partido_id,
              matchTitle: r.nombre_ubicacion,
            })
          })
        }
      } catch (e) {
        console.error("Error cargando reviews:", e)
      }

      // 2. Invitaciones a partidos
      try {
        const invitesResponse = await fetch(`/api/usuarios/${user.id}/match-invitations`, {
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        })
        if (invitesResponse.ok) {
          const invitesData = await invitesResponse.json()
          const invites = invitesData.data || []
          invites.forEach((i: any) => {
            allNotifications.push({
              id: `invite-${i.id}`,
              type: "match_invitation",
              title: i.title || "Invitación a partido",
              message: i.message || `Te han invitado a un partido`,
              time: i.time || i.createdAt,
              read: false,
              matchId: i.matchId,
            })
          })
        }
      } catch (e) {
        console.error("Error cargando invitaciones:", e)
      }

      // 3. Solicitudes de amistad
      try {
        const friendsResponse = await fetch(`/api/usuarios/${user.id}/friend-requests`, {
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        })
        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json()
          const friends = friendsData.data || []
          friends.forEach((f: any) => {
            allNotifications.push({
              id: `friend-${f.id}`,
              type: "friend_request",
              title: "Solicitud de amistad",
              message: `${f.requesterId} quiere ser tu amigo`,
              time: f.createdAt,
              read: false,
              userId: f.requesterId,
            })
          })
        }
      } catch (e) {
        console.error("Error cargando amistades:", e)
      }

      // 4. Mensajes no leídos
      try {
        const messagesResponse = await fetch(`/api/usuarios/${user.id}/messages`, {
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        })
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          const messages = messagesData.data || []
          messages.forEach((m: any) => {
            allNotifications.push({
              id: `message-${m.id}`,
              type: "new_message",
              title: "Nuevo mensaje",
              message: m.message || m.contenido,
              time: m.createdAt,
              read: false,
              userId: m.senderId || m.remitenteId,
            })
          })
        }
      } catch (e) {
        console.error("Error cargando mensajes:", e)
      }

      // 5. Actualizaciones de partidos
      try {
        const updatesResponse = await fetch(`/api/usuarios/${user.id}/match-updates`, {
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        })
        if (updatesResponse.ok) {
          const updatesData = await updatesResponse.json()
          const updates = updatesData.data || []
          updates.forEach((u: any) => {
            allNotifications.push({
              id: `update-${u.partidoId || u.id}`,
              type: "match_update",
              title: "Actualización de partido",
              message: u.message || "Cambio en los datos del partido",
              time: u.createdAt || u.updatedAt || "",
              read: false,
              matchId: u.partidoId,
            })
          })
        }
      } catch (e) {
        console.error("Error cargando actualizaciones:", e)
      }

      setNotifications(allNotifications)
    } catch (error) {
      console.error("Error cargando notificaciones:", error)
      toast({ title: "Error", description: "No se pudieron cargar las notificaciones" })
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    if (notification.type === "match_invitation" || notification.type === "match_update") {
      router.push(`/matches/${notification.matchId}`)
    } else if (notification.type === "friend_request" || notification.type === "new_message") {
      router.push(`/users/${notification.userId}`)
    } else if (notification.type === "review_request") {
      router.push(`/matches/${notification.matchId}/review`)
    }
  }

  const handleAcceptInvitation = async (notification: Notification) => {
    try {
      const token = AuthService.getToken()
      await fetch(`/api/inscripciones/${notification.matchId}/accept`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      })
      toast({ title: "Invitación aceptada" })
      loadNotifications()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo aceptar la invitación", variant: "destructive" })
    }
  }

  const handleRejectInvitation = async (notification: Notification) => {
    try {
      const token = AuthService.getToken()
      await fetch(`/api/inscripciones/${notification.matchId}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      })
      toast({ title: "Invitación rechazada" })
      loadNotifications()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo rechazar la invitación", variant: "destructive" })
    }
  }

  const handleAcceptFriend = async (notification: Notification) => {
    try {
      const token = AuthService.getToken()
      await fetch(`/api/amistades/${notification.id.replace('friend-', '')}/accept`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      })
      toast({ title: "Solicitud aceptada" })
      loadNotifications()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo aceptar la solicitud", variant: "destructive" })
    }
  }

  const handleRejectFriend = async (notification: Notification) => {
    try {
      const token = AuthService.getToken()
      await fetch(`/api/amistades/${notification.id.replace('friend-', '')}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      })
      toast({ title: "Solicitud rechazada" })
      loadNotifications()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo rechazar la solicitud", variant: "destructive" })
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

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

      {/* Notifications List */}
      <div className="px-6 py-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
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
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={notification.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-200">
                      {notification.title?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
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
                  <div 
                    className="cursor-pointer" 
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <h3 className="font-medium text-gray-900 mb-1">
                      {notification.title}
                      {!notification.read && (
                        <span className="inline-block w-2 h-2 bg-primary rounded-full ml-2"></span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    <p className="text-xs text-gray-400">{notification.time}</p>
                  </div>

                  {/* Action buttons */}
                  {notification.type === "match_invitation" && (
                    <div className="flex space-x-2 mt-3">
                      <Button 
                        size="sm" 
                        onClick={(e) => { 
                          e.stopPropagation()
                          handleAcceptInvitation(notification)
                        }} 
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        <Check className="w-4 h-4 mr-1" /> Aceptar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => { 
                          e.stopPropagation()
                          handleRejectInvitation(notification)
                        }}
                      >
                        <X className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  )}

                  {notification.type === "friend_request" && (
                    <div className="flex space-x-2 mt-3">
                      <Button 
                        size="sm" 
                        onClick={(e) => { 
                          e.stopPropagation()
                          handleAcceptFriend(notification)
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-1" /> Aceptar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => { 
                          e.stopPropagation()
                          handleRejectFriend(notification)
                        }}
                      >
                        <X className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  )}

                  {notification.type === "review_request" && (
                    <div className="flex space-x-2 mt-3">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/matches/${notification.matchId}/review`)
                        }} 
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
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