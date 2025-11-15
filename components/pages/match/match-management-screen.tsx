"use client"


import { logger } from '@/lib/logger'
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
  XCircle,
  MapPin,
  Users,
  DollarSign,
  MessageCircle,
  Share,
  UserMinus,
  Clock,
  AlertTriangle,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/lib/auth"
import { CompressedMap } from "@/components/google-maps/compressed-map"
import { GoogleMapsModal } from "@/components/google-maps/google-maps-modal"
import { formatMatchType } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useWebSocket } from "@/hooks/use-websocket"
import { 
  PartidoAPI, 
  InscripcionAPI, 
  PartidoDTO, 
  InscripcionDTO,
  PartidoEstado,
  InscripcionEstado
} from '@/lib/api'

interface MatchManagementScreenProps {
  matchId: string
}

export function MatchManagementScreen({ matchId }: MatchManagementScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  // Estados
  const [match, setMatch] = useState<PartidoDTO | null>(null)
  const [solicitudes, setSolicitudes] = useState<InscripcionDTO[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showMapModal, setShowMapModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  
  const [editData, setEditData] = useState({
    fecha: "",
    hora: "",
    nombreUbicacion: "",
    cantidadJugadores: 10,
    precioTotal: 0,
    descripcion: "",
  })

  const currentUser = AuthService.getUser()
  const isMatchOrganizer = currentUser?.id === match?.organizadorId

  // 🔥 WebSocket: Actualizaciones en tiempo real
  useWebSocket({
    partidoId: matchId,
    enabled: !!match, // Solo conectar cuando el partido esté cargado
    onEvent: (event) => {
      logger.log('[MatchManagement] 📡 WebSocket event:', event.type, event)
      
      switch (event.type) {
        case 'PARTIDO_UPDATED':
          // Actualizar datos del partido
          if (event.partido) {
            setMatch(event.partido)
            toast({
              title: "Partido actualizado",
              description: "El partido ha sido modificado",
            })
          }
          break
          
        case 'INSCRIPCION_CREATED':
          // Nueva solicitud de inscripción
          if (isMatchOrganizer && event.inscripcion) {
            setSolicitudes(prev => [...prev, event.inscripcion])
            toast({
              title: "Nueva solicitud",
              description: "Un jugador quiere unirse al partido",
            })
          }
          // Recargar para actualizar contador de jugadores
          loadMatchData()
          break
          
        case 'INSCRIPCION_STATUS_CHANGED':
          // Inscripción aceptada/rechazada
          if (event.inscripcion) {
            setSolicitudes(prev => 
              prev.filter(s => s.id !== event.inscripcion.id)
            )
          }
          // Recargar para actualizar contador
          loadMatchData()
          toast({
            title: event.newStatus === 'ACEPTADO' ? "Solicitud aceptada" : "Solicitud rechazada",
            description: `La solicitud ha sido ${event.newStatus?.toLowerCase()}`,
          })
          break
          
        case 'INSCRIPCION_CANCELLED':
          // Un jugador canceló su inscripción
          loadMatchData()
          toast({
            title: "Inscripción cancelada",
            description: "Un jugador ha abandonado el partido",
            variant: "destructive",
          })
          break
          
        case 'PARTIDO_CANCELLED':
          // Partido cancelado
          if (match) {
            setMatch({ ...match, estado: 'CANCELADO' as PartidoEstado })
          }
          toast({
            title: "Partido cancelado",
            description: event.reason || "El partido ha sido cancelado",
            variant: "destructive",
          })
          break
          
        case 'PARTIDO_COMPLETED':
          // Partido completado
          if (match) {
            setMatch({ ...match, estado: 'COMPLETADO' as PartidoEstado })
          }
          toast({
            title: "Partido completado",
            description: "El partido ha finalizado",
          })
          break
      }
    }
  })

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    loadMatchData()
  }, [matchId])

  useEffect(() => {
    // Redirigir si no es organizador
    if (!loading && !isMatchOrganizer && match) {
      toast({
        title: "Acceso denegado",
        description: "Solo el organizador puede gestionar este partido",
        variant: "destructive",
      })
      router.push(`/matches/${matchId}`)
    }
  }, [isMatchOrganizer, loading, match])

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================

  const loadMatchData = async () => {
    try {
      setLoading(true)
      setError("")

      // Validar autenticación
      if (!AuthService.isLoggedIn()) {
        router.push("/login")
        return
      }

      // Cargar partido
      const matchResponse = await PartidoAPI.get(matchId)
      
      if (!matchResponse.success || !matchResponse.data) {
        throw new Error(matchResponse.message || "Error al cargar el partido")
      }

      const matchData = matchResponse.data
      setMatch(matchData)
      
      // Inicializar datos de edición
      setEditData({
        fecha: matchData.fecha,
        hora: matchData.hora,
        nombreUbicacion: matchData.nombreUbicacion || "",
        cantidadJugadores: matchData.cantidadJugadores || 10,
        precioTotal: matchData.precioTotal || 0,
        descripcion: matchData.descripcion || "",
      })

      // ✅ SOLO cargar solicitudes si el usuario es el organizador
      const currentUser = AuthService.getUser()
      const isOrganizer = currentUser?.id === matchData.organizadorId
      
      if (isOrganizer) {
        try {
          logger.log("[MatchManagement] Usuario es organizador, cargando solicitudes...")
          const solicitudesResponse = await InscripcionAPI.getPendientes(matchId)
          if (solicitudesResponse.success && solicitudesResponse.data) {
            setSolicitudes(solicitudesResponse.data)
            logger.log("[MatchManagement] ✅ Solicitudes cargadas:", solicitudesResponse.data.length)
          }
        } catch (err) {
          logger.warn("[MatchManagement] Error cargando solicitudes:", err)
          // No es crítico, continuar
        }
      } else {
        logger.log("[MatchManagement] Usuario NO es organizador, omitiendo carga de solicitudes")
      }

    } catch (err) {
      logger.error("[MatchManagement] Error cargando datos:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al cargar datos"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // HANDLERS - EDICIÓN
  // ============================================

  const handleSave = async () => {
    if (!match) return

    // Validaciones
    if (!editData.fecha || !editData.hora) {
      toast({
        title: "Error",
        description: "Fecha y hora son obligatorias",
        variant: "destructive",
      })
      return
    }

    if (!editData.nombreUbicacion || editData.nombreUbicacion.trim().length < 3) {
      toast({
        title: "Error",
        description: "La ubicación debe tener al menos 3 caracteres",
        variant: "destructive",
      })
      return
    }

    if (editData.cantidadJugadores < (match.jugadoresActuales || 0)) {
      toast({
        title: "Error",
        description: `No puedes reducir la cantidad de jugadores por debajo de ${match.jugadoresActuales || 0} (actuales inscriptos)`,
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    setError("")

    try {
      // Pasar el partido actual para que se mezcle con los cambios
      const response = await PartidoAPI.actualizar(matchId, editData, match)

      if (!response.success) {
        throw new Error(response.message || "Error al actualizar")
      }

      toast({
        title: "¡Partido actualizado!",
        description: "Los cambios se han guardado correctamente",
      })

      setIsEditing(false)
      await loadMatchData()

    } catch (err) {
      logger.error("[MatchManagement] Error guardando:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al guardar cambios"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Restaurar datos originales
    if (match) {
      setEditData({
        fecha: match.fecha,
        hora: match.hora,
        nombreUbicacion: match.nombreUbicacion || "",
        cantidadJugadores: match.cantidadJugadores || 10,
        precioTotal: match.precioTotal || 0,
        descripcion: match.descripcion || "",
      })
    }
    setIsEditing(false)
  }

  // ============================================
  // HANDLERS - SOLICITUDES
  // ============================================

  const handleAcceptRequest = async (inscripcionId: string) => {
    if (!match) return

    // Validar que haya espacio
    if ((match.jugadoresActuales || 0) >= (match.cantidadJugadores || 10)) {
      toast({
        title: "Partido completo",
        description: "No hay más espacio disponible",
        variant: "destructive",
      })
      return
    }

    try {
      // 🎯 ACTUALIZACIÓN OPTIMISTA: Mover solicitud a jugadores inmediatamente
      const solicitud = solicitudes.find(s => s.id === inscripcionId)
      if (solicitud) {
        // Remover de solicitudes
        setSolicitudes(prev => prev.filter(s => s.id !== inscripcionId))
        
        // Actualizar contador de jugadores inmediatamente
        setMatch(prev => prev ? {
          ...prev,
          jugadoresActuales: (prev.jugadoresActuales || 0) + 1
        } : null)
      }

      const response = await InscripcionAPI.aceptar(inscripcionId)

      if (!response.success) {
        throw new Error(response.message || "Error al aceptar")
      }

      // Recargar datos completos del servidor para confirmar
      await loadMatchData()

      toast({
        title: "¡Solicitud aceptada!",
        description: "El jugador se ha unido al partido",
      })

    } catch (err) {
      logger.error("[MatchManagement] Error aceptando:", err)
      
      // ✅ REVERTIR cambio optimista en caso de error
      await loadMatchData()
      
      // ✅ MEJORADO: Mensajes de error más específicos
      let errorMessage = "Error al aceptar solicitud"
      
      if (err instanceof Error) {
        if (err.message.includes("500")) {
          errorMessage = "Error del servidor. Por favor intenta nuevamente en unos segundos."
        } else if (err.message.includes("Network") || err.message.includes("network")) {
          errorMessage = "Error de conexión. Verifica tu internet."
        } else if (err.message.includes("timeout")) {
          errorMessage = "La solicitud tardó demasiado. Intenta nuevamente."
        } else {
          errorMessage = err.message
        }
      }
      
      toast({
        title: "Error al aceptar",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleRejectRequest = async (inscripcionId: string) => {
    try {
      await InscripcionAPI.rechazar(inscripcionId)

      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada",
      })

      await loadMatchData()

    } catch (err) {
      logger.error("[MatchManagement] Error rechazando:", err)
      
      // ✅ MEJORADO: Mensajes de error más específicos
      let errorMessage = "Error al rechazar solicitud"
      
      if (err instanceof Error) {
        if (err.message.includes("500")) {
          errorMessage = "Error del servidor. Por favor intenta nuevamente en unos segundos."
        } else if (err.message.includes("Network") || err.message.includes("network")) {
          errorMessage = "Error de conexión. Verifica tu internet."
        } else if (err.message.includes("timeout")) {
          errorMessage = "La solicitud tardó demasiado. Intenta nuevamente."
        } else {
          errorMessage = err.message
        }
      }
      
      toast({
        title: "Error al rechazar",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // ============================================
  // HANDLERS - CONFIRMACIÓN DE PARTIDO
  // ============================================

  const handleConfirmarPartido = async () => {
    if (!match) return

    if (match.estado !== PartidoEstado.DISPONIBLE) {
      toast({
        title: "No se puede confirmar",
        description: "Solo se pueden confirmar partidos pendientes",
        variant: "destructive",
      })
      return
    }

    // Confirmar acción
    if (!confirm("¿Estás seguro de que quieres confirmar el partido? Una vez confirmado, no podrás cancelarlo.")) {
      return
    }

    try {
      const response = await PartidoAPI.confirmar(matchId)

      if (!response.success) {
        throw new Error(response.message || "Error al confirmar")
      }

      toast({
        title: "¡Partido confirmado!",
        description: "El partido ha sido confirmado. Se notificó a todos los inscriptos.",
      })

      await loadMatchData()

    } catch (err) {
      logger.error("[MatchManagement] Error confirmando:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al confirmar partido"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // ============================================
  // HANDLERS - JUGADORES
  // ============================================

  const handleRemovePlayer = async (jugadorId: string) => {
    if (!match) return

    if (match.estado !== PartidoEstado.DISPONIBLE) {
      toast({
        title: "No se puede remover",
        description: "No se pueden remover jugadores de un partido confirmado",
        variant: "destructive",
      })
      return
    }

    // Confirmar acción
    if (!confirm("¿Estás seguro de que quieres remover a este jugador?")) {
      return
    }

    try {
      await PartidoAPI.removerJugador(matchId, jugadorId)

      toast({
        title: "Jugador removido",
        description: "El jugador ha sido removido del partido",
      })

      await loadMatchData()

    } catch (err) {
      logger.error("[MatchManagement] Error removiendo:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al remover jugador"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // ============================================
  // HANDLERS - NAVEGACIÓN
  // ============================================

  const handleBack = () => {
    router.back()
  }

  const handleEnterGroupChat = () => {
    router.push(`/matches/${matchId}/chat`)
  }

  const handleShareMatch = async () => {
    if (!match) return

    const shareData = {
      title: `Partido ${match.tipoPartido} - ${match.fecha}`,
      text: `¡Únete a nuestro partido de ${match.tipoPartido}!`,
      url: `${window.location.origin}/matches/${matchId}`,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        toast({
          title: "¡Partido compartido!",
          description: "El enlace se ha compartido exitosamente",
        })
      } catch (err) {
        // Fallback a clipboard si se cancela
        if (err instanceof Error && err.name !== 'AbortError') {
          copyToClipboard(shareData.url)
        }
      }
    } else {
      copyToClipboard(shareData.url)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Enlace copiado",
        description: "El enlace se ha copiado al portapapeles",
      })
    } catch (err) {
      logger.error("[MatchManagement] Error copiando:", err)
    }
  }

  const handleCancelMatch = async () => {
    if (!match) return
    
    if (!confirm("¿Estás seguro de que quieres cancelar el partido? Esta acción no se puede deshacer.")) {
      return
    }
    
    try {
      const response = await PartidoAPI.cancelar(matchId)
      
      if (response.success) {
        toast({
          title: "Partido cancelado",
          description: "El partido ha sido cancelado exitosamente",
        })
        // Recargar datos
        await loadMatchData()
      } else {
        toast({
          title: "Error",
          description: response.message || "Error al cancelar el partido",
          variant: "destructive",
        })
      }
    } catch (err) {
      logger.error("[MatchManagement] Error cancelando partido:", err)
      toast({
        title: "Error",
        description: "Error al cancelar el partido",
        variant: "destructive",
      })
    }
  }

  const handlePlayerClick = (playerId: string) => {
    router.push(`/users/${playerId}`)
  }

  // ============================================
  // HELPERS
  // ============================================

  const getStatusBadge = () => {
    if (!match) return null

    const statusMap: Record<PartidoEstado, { label: string; className: string }> = {
      [PartidoEstado.CONFIRMADO]: { 
        label: "Confirmado", 
        className: "bg-green-100 text-green-800" 
      },
      [PartidoEstado.CANCELADO]: { 
        label: "Cancelado", 
        className: "bg-red-100 text-red-800" 
      },
      [PartidoEstado.COMPLETADO]: { 
        label: "Completado", 
        className: "bg-blue-100 text-blue-800" 
      },
      [PartidoEstado.DISPONIBLE]: { 
        label: "Disponible", 
        className: "bg-green-100 text-green-800" 
      },
    }

    const status = statusMap[match.estado as PartidoEstado] || statusMap[PartidoEstado.DISPONIBLE]

    return (
      <Badge className={`${status.className} hover:${status.className}`}>
        {status.label}
      </Badge>
    )
  }

  // ============================================
  // RENDER - LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="xl" variant="green" text="Cargando partido..." />
      </div>
    )
  }

  // ============================================
  // RENDER - ERROR
  // ============================================

  if (error || !match || !isMatchOrganizer) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="text-center mb-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error || "Acceso denegado"}
          </h2>
          <p className="text-gray-600">
            {error ? "Por favor intenta nuevamente" : "Solo el organizador puede ver esta página"}
          </p>
        </div>
        <Button onClick={() => router.back()} variant="outline">
          Volver
        </Button>
      </div>
    )
  }

  // ============================================
  // CÁLCULOS
  // ============================================

  const canRemovePlayers = match.estado === PartidoEstado.DISPONIBLE
  const canEdit = match.estado === PartidoEstado.DISPONIBLE
  const canCancel = match.estado === PartidoEstado.DISPONIBLE
  const canConfirm = match.estado === PartidoEstado.DISPONIBLE
  const spotsLeft = (match.cantidadJugadores || 10) - (match.jugadoresActuales || 0)
  const partidoLleno = spotsLeft === 0

  // ============================================
  // RENDER - MAIN
  // ============================================

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleBack} 
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Gestionar Partido</h1>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleShareMatch}
              variant="outline"
              size="sm"
              className="bg-gray-50 border-gray-200"
            >
              <Share className="w-4 h-4" />
            </Button>
            {!isEditing && match.estado === PartidoEstado.DISPONIBLE && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="bg-orange-50 border-orange-200"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto pb-24">
        {/* Alerta de partido listo para confirmar */}
        {match.estado === PartidoEstado.DISPONIBLE && partidoLleno && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center space-x-3">
            <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-800 font-medium">¡Partido completo!</p>
              <p className="text-green-600 text-sm">
                Todos los cupos están llenos. Confirma el partido para que se concrete.
              </p>
            </div>
            <Button
              onClick={handleConfirmarPartido}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Confirmar
            </Button>
          </div>
        )}

        {/* Match Details */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 mb-6">
          {/* Header con badges */}
          <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100 text-xs sm:text-sm">
                {formatMatchType(match.tipoPartido)}
              </Badge>
              <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100 text-xs sm:text-sm">
                {match.genero}
              </Badge>
              {getStatusBadge()}
            </div>
          </div>

          {/* Alertas de estado */}
          {match.estado === PartidoEstado.CONFIRMADO && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 mb-4 flex items-start sm:items-center space-x-2 sm:space-x-3">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-green-800 font-medium text-sm sm:text-base">Partido confirmado</p>
                <p className="text-green-600 text-xs sm:text-sm">
                  El partido está confirmado y se concretará en la fecha/hora programada
                </p>
              </div>
            </div>
          )}

          {match.estado === PartidoEstado.COMPLETADO && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 flex items-start sm:items-center space-x-2 sm:space-x-3">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-blue-800 font-medium text-sm sm:text-base">Partido completado</p>
                <p className="text-blue-600 text-xs sm:text-sm">
                  Este partido ya finalizó. ¡Gracias por participar!
                </p>
              </div>
            </div>
          )}

          {match.estado === PartidoEstado.CANCELADO && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 mb-4 flex items-start sm:items-center space-x-2 sm:space-x-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-red-800 font-medium">Partido cancelado</p>
                <p className="text-red-600 text-sm">
                  El partido fue cancelado (no se llenaron los cupos o no fue confirmado a tiempo)
                </p>
              </div>
            </div>
          )}

          {match.estado === PartidoEstado.DISPONIBLE && spotsLeft > 0 && !partidoLleno && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center space-x-3">
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-yellow-800 font-medium">Esperando confirmación</p>
                <p className="text-yellow-600 text-sm">
                  El partido se cancelará automáticamente si no se llena y confirma antes de la fecha/hora
                </p>
              </div>
            </div>
          )}

          {match.estado === PartidoEstado.DISPONIBLE && partidoLleno && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 sm:p-4 mb-4 flex items-start sm:items-center space-x-2 sm:space-x-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-orange-800 font-medium text-sm sm:text-base">⚠️ Acción requerida</p>
                <p className="text-orange-600 text-xs sm:text-sm">
                  Los cupos están llenos. Debes confirmar el partido o se cancelará automáticamente al llegar la fecha/hora.
                </p>
              </div>
            </div>
          )}

          {/* Formulario de edición o vista */}
          {isEditing ? (
            <div className="space-y-3 sm:space-y-4">
              {/* Título de sección en modo edición */}
              <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Editar partido</h3>
                <span className="text-xs text-gray-500">* Requeridos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={editData.fecha || ''}
                    onChange={(e) => {
                      setEditData({ ...editData, fecha: e.target.value })
                    }}
                    className="rounded-lg sm:rounded-xl text-sm sm:text-base h-10 sm:h-auto"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">
                    Hora <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    value={editData.hora ? editData.hora.substring(0, 5) : ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditData({ ...editData, hora: '' })
                        return
                      }
                      
                      const newTime = `${e.target.value}:00`
                      const selectedDate = editData.fecha
                      const today = new Date().toISOString().split('T')[0]
                      
                      // Si es hoy, validar que la hora sea futura
                      if (selectedDate === today) {
                        const now = new Date()
                        const [hours, minutes] = e.target.value.split(':')
                        const selectedDateTime = new Date()
                        selectedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                        
                        if (selectedDateTime <= now) {
                          toast({
                            title: "Hora inválida",
                            description: "La hora debe ser futura para partidos de hoy",
                            variant: "destructive"
                          })
                          return
                        }
                      }
                      setEditData({ ...editData, hora: newTime })
                    }}
                    className="rounded-lg sm:rounded-xl text-sm sm:text-base h-10 sm:h-auto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">
                  Ubicación <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editData.nombreUbicacion}
                  onChange={(e) => setEditData({ ...editData, nombreUbicacion: e.target.value })}
                  className="rounded-lg sm:rounded-xl text-sm sm:text-base h-10 sm:h-auto"
                  placeholder="Nombre de la cancha o complejo"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">
                    Jugadores <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={editData.cantidadJugadores}
                    onChange={(e) => setEditData({ ...editData, cantidadJugadores: parseInt(e.target.value) || 0 })}
                    className="rounded-lg sm:rounded-xl text-sm sm:text-base h-10 sm:h-auto"
                    min={match.jugadoresActuales}
                    max={22}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo: {match.jugadoresActuales} (actuales inscriptos)
                  </p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">
                    Costo total <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={editData.precioTotal}
                    onChange={(e) => setEditData({ ...editData, precioTotal: parseFloat(e.target.value) || 0 })}
                    className="rounded-lg sm:rounded-xl text-sm sm:text-base h-10 sm:h-auto"
                    min={0}
                    step={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">
                  Descripción
                </label>
                <Textarea
                  value={editData.descripcion}
                  onChange={(e) => setEditData({ ...editData, descripcion: e.target.value })}
                  className="rounded-lg sm:rounded-xl resize-none text-sm sm:text-base"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editData.descripcion.length}/500 caracteres
                </p>
              </div>

              {/* Botones de guardar/cancelar al final del formulario */}
              <div className="flex gap-2 sm:gap-3 pt-3 border-t border-gray-100">
                <Button 
                  onClick={handleCancelEdit}
                  variant="outline"
                  disabled={isSaving}
                  className="flex-1 text-sm sm:text-base py-2.5 sm:py-3"
                >
                  <X className="w-4 h-4 mr-1 sm:mr-2" />
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm sm:text-base py-2.5 sm:py-3"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1 sm:mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                {match.fecha} {match.hora.substring(0, 5)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{match.nombreUbicacion}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>${match.precioPorJugador} / jugador</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>
                    {match.jugadoresActuales}/{match.cantidadJugadores} jugadores
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>{match.duracionMinutos} min</span>
                </div>
              </div>
              {match.descripcion && (
                <p className="text-gray-700 text-xs sm:text-sm bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 whitespace-pre-wrap">
                  {match.descripcion}
                </p>
              )}
            </div>
          )}

          {!isEditing && (
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleEnterGroupChat}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat grupal
              </Button>
              <Button
                onClick={() => setShowCancelModal(true)}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 py-3 rounded-xl"
              >
                Cancelar partido
              </Button>
            </div>
          )}
        </div>

        {/* Map */}
        {!isEditing && match.latitud && match.longitud && match.nombreUbicacion && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ubicación</h3>
            <div onClick={() => setShowMapModal(true)} className="cursor-pointer">
              <CompressedMap
                location={match.nombreUbicacion}
                lat={match.latitud}
                lng={match.longitud}
                disableModal
              />
            </div>
          </div>
        )}

        {/* Organizador Section */}
        {!isEditing && match.organizador && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Organizador</h3>
            <div
              onClick={() => match.organizador?.id && handlePlayerClick(match.organizador.id)}
              className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Avatar className="w-12 h-12">
                {match.organizador?.foto_perfil ? (
                  <AvatarImage src={`data:image/jpeg;base64,${match.organizador.foto_perfil}`} />
                ) : (
                  <AvatarFallback className="bg-orange-100">
                    {match.organizador?.nombre?.[0] ?? ""}
                    {match.organizador?.apellido?.[0] ?? ""}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <span className="font-semibold text-gray-900 block">
                  {match.organizador?.nombre} {match.organizador?.apellido}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Registered Players */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Jugadores inscriptos ({match.jugadores?.length || 0})
          </h3>

          {match.jugadores && match.jugadores.length > 0 ? (
            <div className="space-y-3">
              {match.jugadores
                .filter((player) => player.id !== match.organizadorId)
                .map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div
                    className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <Avatar className="w-12 h-12">
                      {player.foto_perfil ? (
                        <AvatarImage src={`data:image/jpeg;base64,${player.foto_perfil}`} />
                      ) : (
                        <AvatarFallback className="bg-gray-200">
                          {player.nombre?.[0] ?? ""}{player.apellido?.[0] ?? ""}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {player.nombre} {player.apellido}
                      </div>
                      <div className="text-sm text-gray-600">
                        {player.posicion && `${player.posicion} • `}
                        {player.rating && `⭐ ${player.rating}`}
                      </div>
                    </div>
                  </div>
                  {canRemovePlayers && player.id !== currentUser?.id && (
                    <Button
                      onClick={() => handleRemovePlayer(player.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 p-2"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No hay jugadores inscriptos aún</p>
            </div>
          )}
        </div>

        {/* Pending Requests */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Solicitudes pendientes ({solicitudes.length})
          </h3>

          {solicitudes.length > 0 ? (
            <div className="space-y-3">
              {solicitudes.map((solicitud) => {
                const usuario = solicitud.usuario
                if (!usuario) return null

                return (
                  <div 
                    key={solicitud.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div
                      className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                      onClick={() => handlePlayerClick(usuario.id)}
                    >
                      <Avatar className="w-12 h-12">
                        {usuario.foto_perfil ? (
                          <AvatarImage src={`data:image/jpeg;base64,${usuario.foto_perfil}`} />
                        ) : (
                          <AvatarFallback className="bg-gray-200">
                            {usuario.nombre?.[0] ?? ""}{usuario.apellido?.[0] ?? ""}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {usuario.nombre} {usuario.apellido}
                        </div>
                        <div className="text-sm text-gray-600">
                          {usuario.posicion && `${usuario.posicion} • `}
                          {usuario.rating && `⭐ ${usuario.rating}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(solicitud.createdAt).toLocaleDateString("es-ES")}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleAcceptRequest(solicitud.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white p-2"
                        disabled={spotsLeft === 0}
                        title={spotsLeft === 0 ? "No hay más espacio" : "Aceptar"}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleRejectRequest(solicitud.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 p-2"
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
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No hay solicitudes pendientes</p>
              <p className="text-sm text-gray-400">
                Comparte el partido para que más jugadores se unan
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de mapa expandido */}
      {showMapModal && match && match.latitud && match.longitud && (
        <GoogleMapsModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          location={match.nombreUbicacion || ''}
          lat={Number(match.latitud)}
          lng={Number(match.longitud)}
        />
      )}

      {/* Modal cancelar partido */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Cancelar partido?</h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer. Todos los jugadores inscriptos serán notificados de la cancelación.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCancelModal(false)}
                variant="outline"
                className="flex-1"
                disabled={isCancelling}
              >
                No, mantener
              </Button>
              <Button
                onClick={async () => {
                  setIsCancelling(true)
                  await handleCancelMatch()
                  setIsCancelling(false)
                  setShowCancelModal(false)
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelando..." : "Sí, cancelar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
