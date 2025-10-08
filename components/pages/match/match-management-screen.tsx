"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Edit3,
  Check,
  X,
  MapPin,
  Users,
  DollarSign,
  MessageCircle,
  Share,
  UserMinus,
  Expand,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface MatchManagementScreenProps {
  matchId: string
}

const mockMatch = {
  id: 1,
  type: "F5",
  gender: "Hombres",
  date: "2024-01-15",
  time: "18:30",
  endTime: "20:00", // Added end time for match completion logic
  location: "Polideportivo Norte",
  coordinates: { lat: -34.9011, lng: -56.1645 },
  totalPlayers: 10,
  totalPrice: 80,
  description: "Partido rápido en pista cubierta. Trae camiseta oscura y puntualidad.",
  playersJoined: 9,
  shareableLink: `https://faltauno.app/matches/1`,
  status: "pending", // Added status: pending, confirmed, cancelled, completed
  captain: {
    id: "current-user-id", // This would be the actual captain's ID
    name: "Usuario Actual",
  },
  registeredPlayers: [
    {
      id: 1,
      name: "Juan P.",
      position: "Arquero",
      rating: 4.5,
      avatar: "/placeholder.svg?height=48&width=48",
      hasReviewed: false, // Added review tracking
    },
    {
      id: 2,
      name: "María G.",
      position: "Defensa",
      rating: 4.2,
      avatar: "/placeholder.svg?height=48&width=48",
      hasReviewed: false,
    },
  ],
  pendingRequests: [
    {
      id: 1,
      name: "Carlos M.",
      position: "Delantero",
      rating: 4.2,
      avatar: "/placeholder.svg?height=48&width=48",
      requestDate: "Hace 2 horas",
    },
    {
      id: 2,
      name: "Ana L.",
      position: "Medio",
      rating: 4.0,
      avatar: "/placeholder.svg?height=48&width=48",
      requestDate: "Hace 4 horas",
    },
  ],
  friends: [
    {
      id: 3,
      name: "Diego Rodríguez",
      position: "Delantero",
      rating: 4.1,
      avatar: "/placeholder.svg?height=48&width=48",
    },
    {
      id: 4,
      name: "Ana López",
      position: "Medio",
      rating: 4.3,
      avatar: "/placeholder.svg?height=48&width=48",
    },
    {
      id: 5,
      name: "Luis Pérez",
      position: "Defensa",
      rating: 3.9,
      avatar: "/placeholder.svg?height=48&width=48",
    },
  ],
}

export function MatchManagementScreen({ matchId }: MatchManagementScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [matchData, setMatchData] = useState(mockMatch)
  const [showExpandedMap, setShowExpandedMap] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<number[]>([])
  const [showFriendInvites, setShowFriendInvites] = useState(false)

  const currentUserId = "current-user-id" // This would come from auth context
  const isMatchOrganizer = matchData.captain.id === currentUserId

  useEffect(() => {
    if (!isMatchOrganizer) {
      toast({
        title: "Acceso denegado",
        description: "Solo el organizador del partido puede gestionar las solicitudes",
        variant: "destructive",
      })
      router.push(`/matches/${matchId}`)
      return
    }
  }, [isMatchOrganizer, matchId, router, toast])

  const getMatchStatus = () => {
    const now = new Date()
    const matchDateTime = new Date(`${matchData.date}T${matchData.time}`)
    const matchEndDateTime = new Date(`${matchData.date}T${matchData.endTime}`)
    const matchStartTime = matchDateTime

    const isFullyRegistered = matchData.registeredPlayers.length === matchData.totalPlayers
    const hasMatchStarted = now >= matchStartTime
    const hasMatchEnded = now >= matchEndDateTime

    if (hasMatchEnded) {
      return "completed"
    } else if (hasMatchStarted && isFullyRegistered) {
      return "confirmed"
    } else if (hasMatchStarted && !isFullyRegistered) {
      return "cancelled"
    } else {
      return "pending"
    }
  }

  const matchStatus = getMatchStatus()
  const canRemovePlayers = matchStatus === "pending"
  const hasMatchEnded = new Date() >= new Date(`${matchData.date}T${matchData.endTime}`)

  const handleBack = () => {
    router.back()
  }

  const handleSave = () => {
    setIsEditing(false)
    toast({
      title: "¡Partido actualizado!",
      description: "Los cambios se han guardado correctamente",
    })
  }

  const handleAcceptRequest = (requestId: number) => {
    if (!isMatchOrganizer) {
      toast({
        title: "Acceso denegado",
        description: "Solo el organizador del partido puede aceptar solicitudes",
        variant: "destructive",
      })
      return
    }

    console.log("Accepting request:", requestId)
    toast({
      title: "¡Solicitud aceptada!",
      description: "El jugador se ha unido al partido",
    })
    // Accept request logic here
  }

  const handleRejectRequest = (requestId: number) => {
    if (!isMatchOrganizer) {
      toast({
        title: "Acceso denegado",
        description: "Solo el organizador del partido puede rechazar solicitudes",
        variant: "destructive",
      })
      return
    }

    console.log("Rejecting request:", requestId)
    toast({
      title: "Solicitud rechazada",
      description: "La solicitud ha sido rechazada",
      variant: "destructive",
    })
    // Reject request logic here
  }

  const handleRemovePlayer = (playerId: number) => {
    if (!isMatchOrganizer) {
      toast({
        title: "Acceso denegado",
        description: "Solo el organizador del partido puede remover jugadores",
        variant: "destructive",
      })
      return
    }

    if (!canRemovePlayers) {
      toast({
        title: "No se puede remover",
        description: "No se pueden remover jugadores de un partido confirmado",
        variant: "destructive",
      })
      return
    }

    console.log("Removing player:", playerId)
    toast({
      title: "Jugador removido",
      description: "El jugador ha sido removido del partido",
      variant: "destructive",
    })
    // Remove player logic here
  }

  const handleEnterGroupChat = () => {
    router.push(`/matches/${matchId}/chat`)
  }

  const handleShareMatch = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Partido ${matchData.type} - ${matchData.date}`,
          text: `¡Únete a nuestro partido de ${matchData.type} el ${matchData.date} a las ${matchData.time}!`,
          url: `https://faltauno.app/matches/${matchId}`,
        })
        .then(() => {
          toast({
            title: "¡Partido compartido!",
            description: "El enlace se ha compartido exitosamente",
          })
        })
        .catch((error) => {
          console.log("Error sharing:", error)
          // Fallback to clipboard
          navigator.clipboard.writeText(`https://faltauno.app/matches/${matchId}`)
          toast({
            title: "Enlace copiado",
            description: "El enlace se ha copiado al portapapeles",
          })
        })
    } else {
      // Fallback for browsers that don't support native sharing
      navigator.clipboard.writeText(`https://faltauno.app/matches/${matchId}`)
      toast({
        title: "Enlace copiado",
        description: "El enlace se ha copiado al portapapeles",
      })
    }
  }

  const handlePlayerClick = (playerId: number) => {
    router.push(`/users/${playerId}`)
  }

  const getStatusBadge = () => {
    switch (matchStatus) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completado</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
    }
  }

  const handleInviteFriends = () => {
    setShowFriendInvites(true)
  }

  const toggleFriendSelection = (friendId: number) => {
    setSelectedFriends((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId)
      } else {
        return [...prev, friendId]
      }
    })
  }

  const sendInvitations = () => {
    // Logic to send invitations to selected friends
    console.log("Sending invitations to:", selectedFriends)
    toast({
      title: "Invitaciones enviadas",
      description: "Las invitaciones se han enviado correctamente",
    })
    setSelectedFriends([])
    setShowFriendInvites(false)
  }

  if (!isMatchOrganizer) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={handleBack} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Gestionar Partido</h1>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleShareMatch}
              variant="outline"
              size="sm"
              className="bg-secondary/10 border-secondary/20"
            >
              <Share className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              size="sm"
              className="bg-accent/10 border-accent/20"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Match Details */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Badge className="bg-orange-100 text-gray-800">{matchData.type}</Badge>
              <Badge className="bg-orange-100 text-gray-800">{matchData.gender}</Badge>
              {getStatusBadge()}
            </div>
            {isEditing && (
              <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                Guardar
              </Button>
            )}
          </div>

          {matchStatus === "cancelled" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-red-800 font-medium">Partido cancelado y eliminado</p>
                <p className="text-red-600 text-sm">
                  No se alcanzó la cantidad mínima de jugadores al momento del inicio
                </p>
              </div>
            </div>
          )}

          {matchStatus === "pending" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center space-x-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-yellow-800 font-medium">Cancelación automática</p>
                <p className="text-yellow-600 text-sm">
                  El partido se cancelará automáticamente al momento del inicio si no está completo
                </p>
              </div>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Fecha</label>
                  <Input
                    type="date"
                    value={matchData.date}
                    onChange={(e) => setMatchData({ ...matchData, date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Hora</label>
                  <Input
                    type="time"
                    value={matchData.time}
                    onChange={(e) => setMatchData({ ...matchData, time: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Ubicación</label>
                <Input
                  value={matchData.location}
                  onChange={(e) => setMatchData({ ...matchData, location: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Jugadores</label>
                  <Input
                    type="number"
                    value={matchData.totalPlayers}
                    onChange={(e) => setMatchData({ ...matchData, totalPlayers: Number.parseInt(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Precio total</label>
                  <Input
                    type="number"
                    value={matchData.totalPrice}
                    onChange={(e) => setMatchData({ ...matchData, totalPrice: Number.parseFloat(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Descripción</label>
                <Textarea
                  value={matchData.description}
                  onChange={(e) => setMatchData({ ...matchData, description: e.target.value })}
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {matchData.date} {matchData.time}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>{matchData.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>${(matchData.totalPrice / matchData.totalPlayers).toFixed(2)} / jugador</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {matchData.playersJoined}/{matchData.totalPlayers} jugadores
                  </span>
                </div>
              </div>
              <p className="text-gray-700">{matchData.description}</p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleEnterGroupChat}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat grupal
            </Button>
            <Button
              onClick={handleShareMatch}
              variant="outline"
              className="flex-1 border-primary text-primary hover:bg-primary/10 py-3 rounded-xl bg-transparent"
            >
              <Share className="w-4 h-4 mr-2" />
              Compartir
            </Button>
          </div>

          <Button
            onClick={handleInviteFriends}
            variant="outline"
            className="w-full mt-3 border-accent text-accent hover:bg-accent/10 py-3 rounded-xl bg-transparent"
          >
            <Users className="w-4 h-4 mr-2" />
            Invitar amigos
          </Button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Ubicación</h3>
            <Button
              onClick={() => setShowExpandedMap(!showExpandedMap)}
              variant="outline"
              size="sm"
              className="bg-muted border-border"
            >
              <Expand className="w-4 h-4 mr-2" />
              {showExpandedMap ? "Comprimir" : "Agrandar"}
            </Button>
          </div>

          <div
            className={`bg-gradient-to-br from-green-100 to-blue-100 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 ${showExpandedMap ? "h-64" : "h-32"}`}
            onClick={() => setShowExpandedMap(!showExpandedMap)}
          >
            <div className="text-center">
              <MapPin className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{matchData.location}</p>
              <p className="text-xs text-gray-500 mt-1">
                Lat: {matchData.coordinates.lat}, Lng: {matchData.coordinates.lng}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            Jugadores inscritos ({matchData.registeredPlayers.length})
          </h3>

          {matchData.registeredPlayers.length > 0 ? (
            <div className="space-y-4">
              {matchData.registeredPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div
                    className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={player.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-card">
                        {player.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">{player.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {player.position} • ⭐ {player.rating}
                      </div>
                      {hasMatchEnded && (
                        <div className="text-xs text-muted-foreground">
                          {player.hasReviewed ? "✅ Reseña completada" : "⏳ Pendiente de reseña"}
                        </div>
                      )}
                    </div>
                  </div>
                  {canRemovePlayers && (
                    <Button
                      onClick={() => handleRemovePlayer(player.id)}
                      size="sm"
                      variant="outline"
                      className="border-destructive/20 text-destructive hover:bg-destructive/10 p-2"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay jugadores inscritos</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            Solicitudes pendientes ({matchData.pendingRequests.length})
          </h3>

          {matchData.pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {matchData.pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div
                    className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => handlePlayerClick(request.id)}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={request.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-card">
                        {request.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">{request.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {request.position} • ⭐ {request.rating}
                      </div>
                      <div className="text-xs text-muted-foreground">{request.requestDate}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleAcceptRequest(request.id)}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground p-2"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleRejectRequest(request.id)}
                      size="sm"
                      variant="outline"
                      className="border-destructive/20 text-destructive hover:bg-destructive/10 p-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay solicitudes pendientes</p>
            </div>
          )}
        </div>

        {/* Friend Invitation Modal */}
        {showFriendInvites && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-card rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Invitar amigos</h3>
                <Button onClick={() => setShowFriendInvites(false)} variant="outline" size="sm" className="p-2">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3 mb-6">
                {matchData.friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => toggleFriendSelection(friend.id)}
                    className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      selectedFriends.includes(friend.id)
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={friend.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-card">
                        {friend.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{friend.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {friend.position} • ⭐ {friend.rating}
                      </div>
                    </div>
                    {selectedFriends.includes(friend.id) && <Check className="w-5 h-5 text-primary" />}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowFriendInvites(false)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={sendInvitations}
                  disabled={selectedFriends.length === 0}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Enviar invitaciones ({selectedFriends.length})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
