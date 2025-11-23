"use client"


import { logger } from '@/lib/logger'
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Trash2, Calendar, Users, UserPlus, MessageSquare, Star, TrendingUp, AlertCircle, ArrowLeft } from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"
import { TipoNotificacion, NotificacionDTO, InscripcionAPI, InscripcionEstado } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AuthService } from "@/lib/auth"

const tiposFiltro = [
  { label: "Todas", value: "todas" as const },
  { label: "Sin leer", value: "sin_leer" as const },
  { label: "Partidos", value: "partido" as const },
  { label: "Amistades", value: "amistad" as const },
  { label: "Mensajes", value: "mensaje" as const },
]

export function NotificationsScreen() {
  const router = useRouter()
  const { notificaciones, count, isLoading, marcarComoLeida, marcarTodasLeidas, eliminarNotificacion } = useNotifications()
  const [filtro, setFiltro] = useState<"todas" | "sin_leer" | "partido" | "amistad" | "mensaje">("todas")

  const notificacionesFiltradas = notificaciones.filter(notif => {
    if (filtro === "sin_leer") return !notif.leida
    if (filtro === "partido") return notif.tipo.toString().includes("PARTIDO")
    if (filtro === "amistad") return notif.tipo.toString().includes("AMISTAD")
    if (filtro === "mensaje") return notif.tipo === TipoNotificacion.NUEVO_MENSAJE
    return true
  })

  const getIcono = (tipo: TipoNotificacion) => {
    const iconClass = "w-5 h-5"
    switch (tipo) {
      case TipoNotificacion.INVITACION_PARTIDO:
      case TipoNotificacion.PARTIDO_CANCELADO:
      case TipoNotificacion.PARTIDO_COMPLETADO:
      case TipoNotificacion.CAMBIO_PARTIDO:
      case TipoNotificacion.PARTIDO_PROXIMO:
        return <Calendar className={iconClass} />
      case TipoNotificacion.INSCRIPCION_ACEPTADA:
      case TipoNotificacion.INSCRIPCION_RECHAZADA:
        return <Users className={iconClass} />
      case TipoNotificacion.SOLICITUD_AMISTAD:
      case TipoNotificacion.AMISTAD_ACEPTADA:
        return <UserPlus className={iconClass} />
      case TipoNotificacion.NUEVO_MENSAJE:
        return <MessageSquare className={iconClass} />
      case TipoNotificacion.REVISION_PENDIENTE:
        return <Star className={iconClass} />
      case TipoNotificacion.JUGADOR_ELIMINADO:
        return <AlertCircle className={iconClass} />
      default:
        return <Bell className={iconClass} />
    }
  }

  const getColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case "URGENTE":
        return "border-l-red-500 bg-red-50"
      case "ALTA":
        return "border-l-yellow-500 bg-yellow-50"
      case "NORMAL":
        return "border-l-blue-500 bg-blue-50"
      default:
        return "border-l-gray-300 bg-white"
    }
  }

  const handleClick = async (notif: NotificacionDTO) => {
    if (!notif.leida) {
      await marcarComoLeida(notif.id)
    }

    if (notif.url_accion) {
      router.push(notif.url_accion)
    } else if (notif.entidad_id && notif.entidad_tipo === "PARTIDO") {
      // Verificar si el usuario está inscrito y aceptado
      const user = AuthService.getUser()
      if (user) {
        try {
          const estadoResponse = await InscripcionAPI.getEstado(notif.entidad_id, user.id)
          if (estadoResponse.success && estadoResponse.data?.estado === InscripcionEstado.ACEPTADO) {
            router.push(`/my-matches/${notif.entidad_id}`)
            return
          }
        } catch (err) {
          logger.error("[Notifications] Error verificando inscripción:", err)
        }
      }
      router.push(`/matches/${notif.entidad_id}`)
    } else if (notif.entidad_id && notif.entidad_tipo === "USUARIO") {
      router.push(`/users/${notif.entidad_id}`)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-24 sm:pb-24">
      {/* Header */}
      <div className="pt-12 sm:pt-16 pb-4 sm:pb-6 px-4 sm:px-6 border-b border-gray-100">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
          <button
            onClick={() => router.back()}
            className="p-2 sm:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Notificaciones</h1>
            {count > 0 && (
              <span className="px-2.5 sm:px-3 py-1 bg-red-500 text-white text-xs sm:text-sm font-bold rounded-full">
                {count}
              </span>
            )}
          </div>
        </div>

        {count > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 bg-green-50 hover:bg-green-100 active:bg-green-200 text-green-700 rounded-xl transition-all text-sm sm:text-base font-semibold w-full justify-center touch-manipulation active:scale-95 min-h-[48px]"
          >
            <CheckCheck className="w-5 h-5" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="flex-1 px-4 sm:px-6 overflow-y-auto pb-24 sm:pb-28">
        {/* Filtros */}
        <div className="flex gap-2 mb-5 sm:mb-6 mt-4 sm:mt-5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {tiposFiltro.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFiltro(value)}
              className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl whitespace-nowrap transition-all font-semibold text-sm sm:text-base touch-manipulation min-h-[44px] active:scale-95 ${filtro === value
                ? "bg-orange-500 text-white shadow-lg"
                : "bg-orange-50 text-gray-700 hover:bg-orange-100 active:bg-orange-200"
                }`}
            >
              {label}
              {value === "sin_leer" && count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" variant="green" />
          </div>
        ) : notificacionesFiltradas.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay notificaciones</p>
          </div>
        ) : (
          notificacionesFiltradas.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`mb-3 p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer ${!notif.leida ? "bg-blue-50 border-blue-200" : "bg-white"
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full flex-shrink-0 ${notif.prioridad === "URGENTE" ? "bg-red-100" :
                  notif.prioridad === "ALTA" ? "bg-yellow-100" : "bg-blue-100"
                  }`}>
                  {getIcono(notif.tipo)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {notif.titulo}
                      </h3>
                      {notif.mensaje && (
                        <p className="text-gray-700 text-sm mb-2">
                          {notif.mensaje}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {format(new Date(notif.created_at), "PPp", { locale: es })}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        eliminarNotificacion(notif.id)
                      }}
                      className="ml-2 p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
