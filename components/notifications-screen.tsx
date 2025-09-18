"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Check, X, Users, Calendar, MessageCircle, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

type NotificationsScreenProps = {}

// Mock notifications data
const mockNotifications = [
  {
    id: 1,
    type: "match_invitation",
    title: "Invitación a partido",
    message: "Carlos te invitó a jugar el partido 'Fútbol en Parque Central'",
    time: "Hace 5 min",
    read: false,
    avatar: "/placeholder.svg?height=40&width=40",
    matchId: "match-1",
    inviterId: "carlos-123",
  },
  {
    id: 2,
    type: "friend_request",
    title: "Solicitud de amistad",
    message: "María quiere ser tu amiga",
    time: "Hace 15 min",
    read: false,
    avatar: "/placeholder.svg?height=40&width=40",
    userId: "maria-456",
  },
  {
    id: 3,
    type: "match_update",
    title: "Actualización de partido",
    message: "El partido 'Fútbol 5 Pocitos' cambió de horario a las 19:00",
    time: "Hace 1 hora",
    read: true,
    avatar: "/placeholder.svg?height=40&width=40",
    matchId: "match-2",
  },
  {
    id: 4,
    type: "new_message",
    title: "Nuevo mensaje",
    message: "Tienes un nuevo mensaje en el chat del partido",
    time: "Hace 2 horas",
    read: true,
    avatar: "/placeholder.svg?height=40&width=40",
    matchId: "match-1",
  },
  {
    id: 5,
    type: "review_request",
    title: "Reseña pendiente",
    message: "Califica a los jugadores del partido 'Fútbol 5 Pocitos' que terminó ayer",
    time: "Hace 1 día",
    read: false,
    avatar: "/placeholder.svg?height=40&width=40",
    matchId: "match-3",
    matchTitle: "Fútbol 5 Pocitos",
  },
  {
    id: 6,
    type: "review_request",
    title: "Reseña pendiente",
    message: "No olvides calificar a los jugadores del partido 'Fútbol en Parque Central'",
    time: "Hace 2 días",
    read: false,
    avatar: "/placeholder.svg?height=40&width=40",
    matchId: "match-1",
    matchTitle: "Fútbol en Parque Central",
  },
]

export function NotificationsScreen({}: NotificationsScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState(mockNotifications)

  const handleBack = () => {
    router.back()
  }

  const handleAcceptInvitation = (notificationId: number, matchId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    toast({
      title: "¡Invitación aceptada!",
      description: "Te has unido al partido exitosamente",
    })
    // Navigate to match details
    router.push(`/matches/${matchId}`)
  }

  const handleRejectInvitation = (notificationId: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    toast({
      title: "Invitación rechazada",
      description: "Has rechazado la invitación al partido",
    })
  }

  const handleAcceptFriend = (notificationId: number, userId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    toast({
      title: "¡Nueva amistad!",
      description: "Ahora son amigos",
    })
  }

  const handleRejectFriend = (notificationId: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    toast({
      title: "Solicitud rechazada",
      description: "Has rechazado la solicitud de amistad",
    })
  }

  const handleReviewRequest = (notificationId: number, matchId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
    router.push(`/matches/${matchId}/review`)
  }

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))

    // Navigate based on type
    switch (notification.type) {
      case "match_update":
      case "new_message":
        router.push(`/matches/${notification.matchId}`)
        break
      case "friend_request":
        router.push(`/users/${notification.userId}`)
        break
      case "review_request":
        router.push(`/matches/${notification.matchId}/review`)
        break
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "match_invitation":
      case "match_update":
        return <Calendar className="w-5 h-5 text-primary" />
      case "friend_request":
        return <Users className="w-5 h-5 text-blue-600" />
      case "new_message":
        return <MessageCircle className="w-5 h-5 text-green-600" />
      case "review_request":
        return <Star className="w-5 h-5 text-orange-600" />
      default:
        return <Calendar className="w-5 h-5 text-gray-500" />
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="pt-16 pb-4 px-6 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={handleBack} className="p-2 -ml-2">
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
        {notifications.length === 0 ? (
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
                    <AvatarFallback className="bg-gray-200">{notification.title.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleNotificationClick(notification)}>
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

                  {/* Action buttons for invitations */}
                  {notification.type === "match_invitation" && (
                    <div className="flex space-x-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptInvitation(notification.id, notification.matchId)}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aceptar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRejectInvitation(notification.id)}>
                        <X className="w-4 h-4 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  )}

                  {notification.type === "friend_request" && (
                    <div className="flex space-x-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptFriend(notification.id, notification.userId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aceptar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRejectFriend(notification.id)}>
                        <X className="w-4 h-4 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  )}

                  {/* Action button for review requests */}
                  {notification.type === "review_request" && (
                    <div className="flex space-x-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleReviewRequest(notification.id, notification.matchId)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Calificar ahora
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
