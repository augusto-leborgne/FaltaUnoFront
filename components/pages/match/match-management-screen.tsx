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
  Clock,
  AlertTriangle,
  Calendar,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/lib/auth"
import { CompressedMap } from "@/components/google-maps/compressed-map"

interface MatchManagementScreenProps {
  matchId: string
}

interface Jugador {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
  posicion?: string
  rating?: number
}

interface SolicitudPendiente {
  id: string
  usuario_id: string
  fecha_solicitud: string
  usuario?: Jugador
}

interface Partido {
  id: string
  tipo_partido: string
  nivel: string
  genero: string
  fecha: string
  hora: string
  duracion_minutos: number
  nombre_ubicacion: string
  direccion_ubicacion?: string
  latitud?: number
  longitud?: number
  cantidad_jugadores: number
  jugadores_actuales: number
  precio_total: number
  precio_por_jugador: number
  descripcion?: string
  estado: string
  organizador_id: string
  jugadores?: Jugador[]
  solicitudes_pendientes?: SolicitudPendiente[]
}

export function MatchManagementScreen({ matchId }: MatchManagementScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [match, setMatch] = useState<Partido | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [editData, setEditData] = useState({
    fecha: "",
    hora: "",
    nombre_ubicacion: "",
    cantidad_jugadores: 10,
    precio_total: 0,
    descripcion: "",
  })

  const currentUser = AuthService.getUser()
  const isMatchOrganizer = currentUser?.id === match?.organizador_id

  useEffect(() => {
    loadMatchData()
  }, [matchId])

  useEffect(() => {
    if (!loading && !isMatchOrganizer) {
      toast({
        title: "Acceso denegado",
        description: "Solo el organizador del partido puede gestionar las solicitudes",
        variant: "destructive",
      })
      router.push(`/matches/${matchId}`)
    }
  }, [isMatchOrganizer, loading, matchId, router, toast])

  const loadMatchData = async () => {
    try {
      setLoading(true)
      const token = AuthService.getToken()
      
      if (!token) {
        router.push("/login")
        return
      }

      // Cargar datos del partido
      const matchResponse = await fetch(`/api/partidos/${matchId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (matchResponse.ok) {
        const matchResult = await matchResponse.json()
        if (matchResult.success && matchResult.data) {
          const matchData = matchResult.data
          setMatch(matchData)
          
          // Inicializar datos de edición
          setEditData({
            fecha: matchData.fecha,
            hora: matchData.hora,
            nombre_ubicacion: matchData.nombre_ubicacion,
            cantidad_jugadores: matchData.cantidad_jugadores,
            precio_total: matchData.precio_total,
            descripcion: matchData.descripcion || "",
          })
        }
      }

      // Cargar solicitudes pendientes
      const solicitudesResponse = await fetch(`/api/partidos/${matchId}/solicitudes`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (solicitudesResponse.ok) {
        const solicitudesResult = await solicitudesResponse.json()
        if (solicitudesResult.success && solicitudesResult.data) {
          setMatch(prev => prev ? {
            ...prev,
            solicitudes_pendientes: solicitudesResult.data
          } : null)
        }
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del partido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!match) return

    setIsSaving(true)
    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`/api/partidos/${matchId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        await loadMatchData()
        setIsEditing(false)
        toast({
          title: "¡Partido actualizado!",
          description: "Los cambios se han guardado correctamente",
        })
      } else {
        throw new Error("Error al actualizar")
      }
    } catch (error) {
      console.error("Error guardando:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAcceptRequest = async (solicitudId: string) => {
    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`/api/inscripciones/${solicitudId}/aceptar`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        toast({
          title: "¡Solicitud aceptada!",
          description: "El jugador se ha unido al partido",
        })
        await loadMatchData()
      } else {
        throw new Error("Error al aceptar")
      }
    } catch (error) {
      console.error("Error aceptando:", error)
      toast({
        title: "Error",
        description: "No se pudo aceptar la solicitud",
        variant: "destructive",
      })
    }
  }

  const handleRejectRequest = async (solicitudId: string) => {
    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`/api/inscripciones/${solicitudId}/rechazar`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        toast({
          title: "Solicitud rechazada",
          description: "La solicitud ha sido rechazada",
        })
        await loadMatchData()
      } else {
        throw new Error("Error al rechazar")
      }
    } catch (error) {
      console.error("Error rechazando:", error)
      toast({
        title: "Error",
        description: "No se pudo rechazar la solicitud",
        variant: "destructive",
      })
    }
  }

  const handleRemovePlayer = async (jugadorId: string) => {
    if (match?.estado !== "PENDIENTE") {
      toast({
        title: "No se puede remover",
        description: "No se pueden remover jugadores de un partido confirmado",
        variant: "destructive",
      })
      return
    }

    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`/api/partidos/${matchId}/jugadores/${jugadorId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        toast({
          title: "Jugador removido",
          description: "El jugador ha sido removido del partido",
        })
        await loadMatchData()
      } else {
        throw new Error("Error al remover")
      }
    } catch (error) {
      console.error("Error removiendo:", error)
      toast({
        title: "Error",
        description: "No se pudo remover al jugador",
        variant: "destructive",
      })
    }
  }

  const handleEnterGroupChat = () => {
    router.push(`/matches/${matchId}/chat`)
  }

  const handleShareMatch = async () => {
    const shareData = {
      title: `Partido ${match?.tipo_partido} - ${match?.fecha}`,
      text: `¡Únete a nuestro partido de ${match?.tipo_partido}!`,
      url: `${window.location.origin}/matches/${matchId}`,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        toast({
          title: "¡Partido compartido!",
          description: "El enlace se ha compartido exitosamente",
        })
      } catch (error) {
        // Fallback a clipboard
        try {
          await navigator.clipboard.writeText(shareData.url)
          toast({
            title: "Enlace copiado",
            description: "El enlace se ha copiado al portapapeles",
          })
        } catch (e) {
          console.error("Error copying:", e)
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url)
        toast({
          title: "Enlace copiado",
          description: "El enlace se ha copiado al portapapeles",
        })
      } catch (error) {
        console.error("Error copying:", error)
      }
    }
  }

  const handlePlayerClick = (playerId: string) => {
    router.push(`/users/${playerId}`)
  }

  const handleBack = () => {
    router.back()
  }

  const getStatusBadge = () => {
    if (!match) return null

    const statusMap: { [key: string]: { label: string; className: string } } = {
      CONFIRMADO: { label: "Confirmado", className: "bg-green-100 text-green-800" },
      CANCELADO: { label: "Cancelado", className: "bg-red-100 text-red-800" },
      COMPLETADO: { label: "Completado", className: "bg-blue-100 text-blue-800" },
      PENDIENTE: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
    }

    const status = statusMap[match.estado] || statusMap.PENDIENTE

    return <Badge className={status.className}>{status.label}</Badge>
  }

  const formatMatchType = (type: string) => {
    return type.replace("FUTBOL_", "F")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!match || !isMatchOrganizer) {
    return null
  }

  const canRemovePlayers = match.estado === "PENDIENTE"
  const spotsLeft = match.cantidad_jugadores - match.jugadores_actuales

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

      <div className="flex-1 px-6 py-6 overflow-y-auto pb-24">
        {/* Match Details */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-orange-100 text-gray-800">
                {formatMatchType(match.tipo_partido)}
              </Badge>
              <Badge className="bg-orange-100 text-gray-800">{match.genero}</Badge>
              {getStatusBadge()}
            </div>
            {isEditing && (
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </div>

          {match.estado === "CANCELADO" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Partido cancelado</p>
                <p className="text-red-600 text-sm">
                  No se alcanzó la cantidad mínima de jugadores
                </p>
              </div>
            </div>
          )}

          {match.estado === "PENDIENTE" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center space-x-3">
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-yellow-800 font-medium">Cancelación automática</p>
                <p className="text-yellow-600 text-sm">
                  El partido se cancelará si no está completo al momento del inicio
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
                    value={editData.fecha}
                    onChange={(e) => setEditData({ ...editData, fecha: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Hora</label>
                  <Input
                    type="time"
                    value={editData.hora}
                    onChange={(e) => setEditData({ ...editData, hora: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Ubicación</label>
                <Input
                  value={editData.nombre_ubicacion}
                  onChange={(e) => setEditData({ ...editData, nombre_ubicacion: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Jugadores</label>
                  <Input
                    type="number"
                    value={editData.cantidad_jugadores}
                    onChange={(e) => setEditData({ ...editData, cantidad_jugadores: Number.parseInt(e.target.value) })}
                    className="rounded-xl"
                    min={match.jugadores_actuales}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Precio total</label>
                  <Input
                    type="number"
                    value={editData.precio_total}
                    onChange={(e) => setEditData({ ...editData, precio_total: Number.parseFloat(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Descripción</label>
                <Textarea
                  value={editData.descripcion}
                  onChange={(e) => setEditData({ ...editData, descripcion: e.target.value })}
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {match.fecha} {match.hora}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>{match.nombre_ubicacion}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>${match.precio_por_jugador} / jugador</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {match.jugadores_actuales}/{match.cantidad_jugadores} jugadores
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{match.duracion_minutos || 90} min</span>
                </div>
              </div>
              {match.descripcion && (
                <p className="text-gray-700 text-sm bg-gray-50 rounded-xl p-3">{match.descripcion}</p>
              )}
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
        </div>

        {/* Map */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Ubicación</h3>
          <CompressedMap
            location={match.nombre_ubicacion}
            lat={match.latitud}
            lng={match.longitud}
          />
        </div>

        {/* Registered Players */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            Jugadores inscritos ({match.jugadores?.length || 0})
          </h3>

          {match.jugadores && match.jugadores.length > 0 ? (
            <div className="space-y-4">
              {match.jugadores.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div
                    className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <Avatar className="w-12 h-12">
                      {player.foto_perfil ? (
                        <AvatarImage src={`data:image/jpeg;base64,${player.foto_perfil}`} />
                      ) : (
                        <AvatarFallback className="bg-card">
                          {player.nombre[0]}{player.apellido[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">{player.nombre} {player.apellido}</div>
                      <div className="text-sm text-muted-foreground">
                        {player.posicion && `${player.posicion} • `}
                        {player.rating && `⭐ ${player.rating}`}
                      </div>
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
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay jugadores inscritos aún</p>
            </div>
          )}
        </div>

        {/* Pending Requests */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            Solicitudes pendientes ({match.solicitudes_pendientes?.length || 0})
          </h3>

          {match.solicitudes_pendientes && match.solicitudes_pendientes.length > 0 ? (
            <div className="space-y-4">
              {match.solicitudes_pendientes.map((request) => {
                const usuario = request.usuario
                if (!usuario) return null

                return (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                    <div
                      className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                      onClick={() => handlePlayerClick(usuario.id)}
                    >
                      <Avatar className="w-12 h-12">
                        {usuario.foto_perfil ? (
                          <AvatarImage src={`data:image/jpeg;base64,${usuario.foto_perfil}`} />
                        ) : (
                          <AvatarFallback className="bg-card">
                            {usuario.nombre[0]}{usuario.apellido[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground">{usuario.nombre} {usuario.apellido}</div>
                        <div className="text-sm text-muted-foreground">
                          {usuario.posicion && `${usuario.posicion} • `}
                          {usuario.rating && `⭐ ${usuario.rating}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(request.fecha_solicitud).toLocaleDateString("es-ES")}
                        </div>
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
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay solicitudes pendientes</p>
              <p className="text-sm text-muted-foreground mt-2">
                Comparte el partido para que más jugadores se unan
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}