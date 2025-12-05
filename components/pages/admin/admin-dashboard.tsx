"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Users, Calendar, TrendingUp, UserCheck, Trash2, Shield, ShieldOff, AlertCircle, CheckCircle, X, Eye, Mail, Phone, MapPin, Clock, Flag, ChevronDown, ChevronUp, LayoutList, Grid3x3 } from "lucide-react"
import { API_URL } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { Usuario } from "@/lib/api"
import { formatMatchType } from "@/lib/utils"

interface AdminStats {
  totalUsuarios: number
  usuariosActivos: number
  registrosRecientes: number
  usuariosEliminados: number
  usuariosBaneados: number
  totalPartidos: number
  partidosHoy: number
  partidosEstaSemana: number
  partidosEsteMes: number
  reportesPendientes: number
  reportesResueltos: number
  reportesTotal: number
  tasaCrecimientoSemanal: number
}

interface Partido {
  id: string
  tipo_partido: string
  fecha: string
  hora: string
  nombre_ubicacion: string
  cantidad_jugadores: number
  jugadores_actuales?: number
  estado?: string
  genero?: string
  precio_total?: number
  duracion?: number
  descripcion?: string
  organizador?: {
    id: string
    nombre: string
    apellido: string
    foto_perfil?: string
    deleted_at?: string
  }
}

interface Report {
  id: number
  reporter: {
    id: string
    nombre: string
    apellido: string
    email: string
  }
  reportedUser: {
    id: string
    nombre: string
    apellido: string
    email: string
    bannedAt?: string
  }
  reason: string
  description: string
  status: string
  createdAt: string
  resolvedAt?: string
  resolvedBy?: {
    id: string
    nombre: string
    apellido: string
  }
  action?: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "matches" | "reports">("stats")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Estados para modales de detalles
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Partido | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  // Estados para panel de reportes
  const [reportFilter, setReportFilter] = useState<"all" | "pending" | "resolved">("pending")
  const [groupedView, setGroupedView] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showDismissModal, setShowDismissModal] = useState(false)
  const [reportToDismiss, setReportToDismiss] = useState<Report | null>(null)
  const [dismissAction, setDismissAction] = useState<"no_action" | "warn_reporter">("no_action")
  const [dismissNotes, setDismissNotes] = useState("")

  // Estados para modal de baneo
  const [showBanModal, setShowBanModal] = useState(false)
  const [userToBan, setUserToBan] = useState<Usuario | null>(null)
  const [banReason, setBanReason] = useState("")
  const [banDuration, setBanDuration] = useState<number | null>(7) // 7 días por defecto
  const [banType, setBanType] = useState<"temporary" | "permanent">("temporary")

  // Estados para filtros de usuarios
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "user">("all")
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "inactive" | "banned" | "deleted">("all")

  // Estados para filtros de partidos
  const [matchSearchQuery, setMatchSearchQuery] = useState("")
  const [matchTypeFilter, setMatchTypeFilter] = useState<"all" | "FUTBOL_5" | "FUTBOL_7" | "FUTBOL_8" | "FUTBOL_9" | "FUTBOL_11">("all")
  const [matchStatusFilter, setMatchStatusFilter] = useState<"all" | "DISPONIBLE" | "CONFIRMADO" | "CANCELADO" | "COMPLETADO">("all")

  // Estados para sorting de partidos
  const [matchSortField, setMatchSortField] = useState<"tipo" | "fecha" | "ubicacion" | "organizador" | null>(null)
  const [matchSortDirection, setMatchSortDirection] = useState<"asc" | "desc">("asc")

  // Helper para hacer fetch autenticado
  const authenticatedFetch = async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = AuthService.getToken()
    if (!token) throw new Error("No hay token de autenticación")

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      // Intentar parsear el mensaje de error del backend
      try {
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`
        throw new Error(errorMessage)
      } catch (parseError) {
        // Si falla el parseo, usar mensaje genérico
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    }

    const json = await response.json()
    // Backend wraps responses in ApiResponse { success, data, message }
    // Extract the data field if it exists, otherwise return the whole response
    return (json.data !== undefined ? json.data : json) as T
  }

  // Verificar que el usuario sea admin
  useEffect(() => {
    if (!authLoading && (!user || user.rol !== "ADMIN")) {
      logger.warn("[AdminDashboard] Usuario no autorizado, redirigiendo...")
      router.push("/home")
    }
  }, [user, authLoading, router])

  // Cargar datos del admin
  useEffect(() => {
    if (!user || user.rol !== "ADMIN") return

    const loadData = async () => {
      try {
        setLoadingData(true)

        // Cargar stats
        const statsResponse = await authenticatedFetch<AdminStats>(`${API_URL}/admin/stats`)
        setStats(statsResponse)

        // Cargar usuarios
        const usuariosResponse = await authenticatedFetch<Usuario[]>(`${API_URL}/admin/usuarios`)
        setUsuarios(Array.isArray(usuariosResponse) ? usuariosResponse : [])

        // Cargar partidos
        const partidosResponse = await authenticatedFetch<Partido[]>(`${API_URL}/admin/partidos`)
        setPartidos(Array.isArray(partidosResponse) ? partidosResponse : [])

        // Cargar reportes
        const reportsResponse = await authenticatedFetch<Report[]>(`${API_URL}/admin/reports`)
        setReports(Array.isArray(reportsResponse) ? reportsResponse : [])
      } catch (error) {
        logger.error("[AdminDashboard] Error cargando datos:", error)
        // Set empty arrays on error to prevent crashes
        setUsuarios([])
        setPartidos([])
        setReports([])
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [user])

  // Funciones de filtrado para usuarios
  const filteredUsuarios = usuarios.filter(usuario => {
    // Filtro de búsqueda por nombre, email o celular
    if (userSearchQuery) {
      const query = userSearchQuery.toLowerCase()
      const matchesSearch =
        usuario.nombre?.toLowerCase().includes(query) ||
        usuario.apellido?.toLowerCase().includes(query) ||
        usuario.email?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Filtro por rol
    if (userRoleFilter !== "all") {
      if (userRoleFilter === "admin" && usuario.rol !== "ADMIN") return false
      if (userRoleFilter === "user" && usuario.rol === "ADMIN") return false
    }

    // Filtro por estado
    if (userStatusFilter !== "all") {
      const isDeleted = !!(usuario.deleted_at || usuario.deletedAt)
      const isBanned = !!usuario.bannedAt
      const isActive = usuario.lastActivityAt &&
        new Date(usuario.lastActivityAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000

      if (userStatusFilter === "deleted" && !isDeleted) return false
      if (userStatusFilter === "banned" && !isBanned) return false
      if (userStatusFilter === "active" && (!isActive || isDeleted || isBanned)) return false
      if (userStatusFilter === "inactive" && (isActive || isDeleted || isBanned)) return false
    }

    return true
  })

  // Funciones de filtrado y sorting para partidos
  const filteredPartidos = partidos
    .filter(partido => {
      // Filtro de búsqueda por ubicación u organizador
      if (matchSearchQuery) {
        const query = matchSearchQuery.toLowerCase()
        const matchesSearch =
          partido.nombre_ubicacion?.toLowerCase().includes(query) ||
          partido.organizador?.nombre?.toLowerCase().includes(query) ||
          partido.organizador?.apellido?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Filtro por tipo
      if (matchTypeFilter !== "all" && partido.tipo_partido !== matchTypeFilter) {
        return false
      }

      // Filtro por estado
      if (matchStatusFilter !== "all" && partido.estado !== matchStatusFilter) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      if (!matchSortField) return 0

      const direction = matchSortDirection === "asc" ? 1 : -1

      switch (matchSortField) {
        case "tipo":
          return direction * a.tipo_partido.localeCompare(b.tipo_partido)

        case "fecha":
          const dateA = new Date(`${a.fecha} ${a.hora}`)
          const dateB = new Date(`${b.fecha} ${b.hora}`)
          return direction * (dateA.getTime() - dateB.getTime())

        case "ubicacion":
          return direction * a.nombre_ubicacion.localeCompare(b.nombre_ubicacion)

        case "organizador":
          const orgA = `${a.organizador?.nombre || ''} ${a.organizador?.apellido || ''}`.trim()
          const orgB = `${b.organizador?.nombre || ''} ${b.organizador?.apellido || ''}`.trim()
          return direction * orgA.localeCompare(orgB)

        default:
          return 0
      }
    })

  // Función para manejar click en columna sorteable
  const handleMatchSort = (field: "tipo" | "fecha" | "ubicacion" | "organizador") => {
    if (matchSortField === field) {
      // Si ya está ordenado por este campo, cambiar dirección
      setMatchSortDirection(matchSortDirection === "asc" ? "desc" : "asc")
    } else {
      // Si es un campo nuevo, ordenar ascendente
      setMatchSortField(field)
      setMatchSortDirection("asc")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      setError(null)
      await authenticatedFetch(`${API_URL}/admin/usuarios/${userId}`, {
        method: "DELETE",
      })

      // Actualizar lista
      setUsuarios((prev) => prev.filter((u) => u.id !== userId))

      // Actualizar stats
      if (stats) {
        setStats({ ...stats, totalUsuarios: stats.totalUsuarios - 1 })
      }

      setSuccessMessage("Usuario eliminado correctamente")
      setTimeout(() => setSuccessMessage(null), 3000)

      // Cerrar modal
      setShowDeleteModal(false)
      setUserToDelete(null)
      setDeleteConfirmText("")
    } catch (error) {
      logger.error("[AdminDashboard] Error eliminando usuario:", error)
      setError("Error al eliminar usuario: " + (error instanceof Error ? error.message : "Error desconocido"))
      setTimeout(() => setError(null), 5000)
    }
  }

  const openDeleteModal = (userId: string) => {
    setUserToDelete(userId)
    setDeleteConfirmText("")
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setUserToDelete(null)
    setDeleteConfirmText("")
  }

  const confirmDelete = () => {
    if (deleteConfirmText === "ELIMINAR" && userToDelete) {
      handleDeleteUser(userToDelete)
    }
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN"

    if (!confirm(`¿Cambiar rol a ${newRole}?`)) {
      return
    }

    try {
      setError(null)
      await authenticatedFetch(`${API_URL}/admin/usuarios/${userId}/rol`, {
        method: "PUT",
        body: JSON.stringify({ rol: newRole }),
      })

      // Actualizar lista
      setUsuarios((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, rol: newRole } : u))
      )

      setSuccessMessage(`Rol cambiado a ${newRole} correctamente`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      logger.error("[AdminDashboard] Error cambiando rol:", error)
      setError("Error al cambiar rol: " + (error instanceof Error ? error.message : "Error desconocido"))
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("¿Estás seguro de eliminar este partido?")) {
      return
    }

    try {
      setError(null)
      await authenticatedFetch(`${API_URL}/admin/partidos/${matchId}`, {
        method: "DELETE",
      })

      // Actualizar lista
      setPartidos((prev) => prev.filter((p) => p.id !== matchId))

      // Actualizar stats
      if (stats) {
        setStats({ ...stats, totalPartidos: stats.totalPartidos - 1 })
      }

      setSuccessMessage("Partido eliminado correctamente")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      logger.error("[AdminDashboard] Error eliminando partido:", error)
      setError("Error al eliminar partido: " + (error instanceof Error ? error.message : "Error desconocido"))
      setTimeout(() => setError(null), 5000)
    }
  }

  const openBanModal = (user: Usuario) => {
    setUserToBan(user)
    setBanReason("")
    setBanDuration(7)
    setBanType("temporary")
    setShowBanModal(true)
  }

  const closeBanModal = () => {
    setShowBanModal(false)
    setUserToBan(null)
    setBanReason("")
    setBanDuration(7)
    setBanType("temporary")
  }

  const handleBanUser = async () => {
    if (!userToBan || !banReason.trim()) {
      setError("Debes proporcionar una razón para el baneo")
      setTimeout(() => setError(null), 3000)
      return
    }

    try {
      setError(null)
      await authenticatedFetch(`${API_URL}/admin/usuarios/${userToBan.id}/ban`, {
        method: "PUT",
        body: JSON.stringify({
          reason: banReason,
          durationDays: banType === "permanent" ? null : banDuration
        }),
      })

      // Actualizar lista de usuarios
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === userToBan.id ? { ...u, bannedAt: new Date().toISOString() } : u
        )
      )

      setSuccessMessage(`Usuario baneado ${banType === "permanent" ? "permanentemente" : `por ${banDuration} días`}`)
      setTimeout(() => setSuccessMessage(null), 3000)
      closeBanModal()
      // Recargar datos para reflejar el baneo
      if (user && user.rol === "ADMIN") {
        window.location.reload()
      }
    } catch (error) {
      logger.error("[AdminDashboard] Error baneando usuario:", error)
      setError("Error al banear usuario: " + (error instanceof Error ? error.message : "Error desconocido"))
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleResolveReport = async (reportId: number, action: string) => {
    try {
      setError(null)
      await authenticatedFetch(`${API_URL}/admin/reports/${reportId}/resolve`, {
        method: "PUT",
        body: JSON.stringify({ action }),
      })

      // Actualizar lista de reportes
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: "RESOLVED", resolvedAt: new Date().toISOString(), action }
            : r
        )
      )

      setSuccessMessage("Reporte resuelto correctamente")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      logger.error("[AdminDashboard] Error resolviendo reporte:", error)
      setError("Error al resolver reporte: " + (error instanceof Error ? error.message : "Error desconocido"))
      setTimeout(() => setError(null), 5000)
    }
  }

  const openDismissModal = (report: Report) => {
    setReportToDismiss(report)
    setDismissAction("no_action")
    setDismissNotes("")
    setShowDismissModal(true)
  }

  const closeDismissModal = () => {
    setShowDismissModal(false)
    setReportToDismiss(null)
    setDismissAction("no_action")
    setDismissNotes("")
  }

  const handleDismissReport = async () => {
    if (!reportToDismiss) return

    try {
      setError(null)

      // Si se decidió advertir al reportador, primero advertir
      if (dismissAction === "warn_reporter") {
        const warnReason = dismissNotes || "Reporte falso o malintencionado"
        // Aquí podrías implementar un endpoint para advertir/sancionar al reportador
        // Por ahora solo lo registramos en las notas
      }

      await authenticatedFetch(`${API_URL}/admin/reports/${reportToDismiss.id}/dismiss`, {
        method: "PUT",
        body: JSON.stringify({
          notes: dismissAction === "warn_reporter"
            ? `[REPORTADOR ADVERTIDO] ${dismissNotes}`
            : dismissNotes || "Reporte desestimado"
        }),
      })

      // Actualizar lista de reportes
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportToDismiss.id
            ? { ...r, status: "DISMISSED", resolvedAt: new Date().toISOString() }
            : r
        )
      )

      setSuccessMessage(
        dismissAction === "warn_reporter"
          ? "Reporte desestimado y reportador advertido"
          : "Reporte desestimado correctamente"
      )
      setTimeout(() => setSuccessMessage(null), 3000)
      closeDismissModal()
    } catch (error) {
      logger.error("[AdminDashboard] Error desestimando reporte:", error)
      setError("Error al desestimar reporte: " + (error instanceof Error ? error.message : "Error desconocido"))
      setTimeout(() => setError(null), 5000)
    }
  }

  const toggleGroup = (userId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedGroups(newExpanded)
  }

  // Agrupar reportes por usuario reportado
  const getGroupedReports = () => {
    const filtered = reports.filter(r => {
      if (reportFilter === "pending") return r.status === "PENDING"
      if (reportFilter === "resolved") return r.status === "RESOLVED" || r.status === "DISMISSED"
      return true
    })

    const grouped = new Map<string, Report[]>()
    filtered.forEach(report => {
      const userId = report.reportedUser.id
      if (!grouped.has(userId)) {
        grouped.set(userId, [])
      }
      grouped.get(userId)!.push(report)
    })

    return Array.from(grouped.entries())
      .map(([userId, userReports]) => ({
        user: userReports[0].reportedUser,
        reports: userReports.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        totalReports: userReports.length,
        pendingReports: userReports.filter(r => r.status === "PENDING").length,
      }))
      .sort((a, b) => b.pendingReports - a.pendingReports || b.totalReports - a.totalReports)
  }

  const getFilteredReports = () => {
    return reports.filter(r => {
      if (reportFilter === "pending") return r.status === "PENDING"
      if (reportFilter === "resolved") return r.status === "RESOLVED" || r.status === "DISMISSED"
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user.rol !== "ADMIN") {
    return null // El useEffect redirigirá
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-18 xs:pb-20 sm:pb-22 md:pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/home")}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold truncate">Panel de Administración</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate hidden sm:block">Gestión de usuarios y partidos</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-red-100 px-2 sm:px-3 py-1 shrink-0">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
              <span className="text-xs font-semibold text-red-600">ADMIN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mx-auto max-w-6xl px-4 pt-3 sm:pt-4">
          <div className="flex items-start sm:items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-red-800 flex-1 break-words">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mx-auto max-w-6xl px-4 pt-3 sm:pt-4">
          <div className="flex items-start sm:items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 sm:p-4">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-green-800 flex-1 break-words">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-3 sm:pt-4">
        <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${activeTab === "stats"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            <TrendingUp className="mb-1 inline h-3 w-3 sm:h-4 sm:w-4" />
            <span className="ml-1">Stats</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${activeTab === "users"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            <Users className="mb-1 inline h-3 w-3 sm:h-4 sm:w-4" />
            <span className="ml-1">Usuarios ({usuarios.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${activeTab === "matches"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            <Calendar className="mb-1 inline h-3 w-3 sm:h-4 sm:w-4" />
            <span className="ml-1">Partidos ({partidos.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${activeTab === "reports"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            <Flag className="mb-1 inline h-3 w-3 sm:h-4 sm:w-4" />
            <span className="ml-1">Reportes ({reports.filter(r => r.status === 'PENDING').length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {loadingData ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Estadísticas */}
            {activeTab === "stats" && stats && (
              <div className="space-y-4 xs:space-y-3 xs:space-y-4 sm:space-y-5 sm:space-y-6">
                {/* Estadísticas principales */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Usuarios</h3>
                  <div className="grid gap-2 xs:gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Usuarios</p>
                          <p className="text-3xl font-bold text-blue-600">{stats.totalUsuarios}</p>
                        </div>
                        <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Usuarios Activos</p>
                          <p className="text-3xl font-bold text-green-600">{stats.usuariosActivos}</p>
                          <p className="text-xs text-gray-500 mt-1">Últimos 30 días</p>
                        </div>
                        <UserCheck className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Nuevos (7d)</p>
                          <p className="text-3xl font-bold text-purple-600">{stats.registrosRecientes}</p>
                          {stats.tasaCrecimientoSemanal > 0 && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {stats.tasaCrecimientoSemanal.toFixed(1)}% vs promedio
                            </p>
                          )}
                        </div>
                        <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-purple-500" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Baneados</p>
                          <p className="text-3xl font-bold text-red-600">{stats.usuariosBaneados}</p>
                          <p className="text-xs text-gray-500 mt-1">{stats.usuariosEliminados} eliminados</p>
                        </div>
                        <ShieldOff className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas de partidos */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Partidos</h3>
                  <div className="grid gap-2 xs:gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Partidos</p>
                          <p className="text-3xl font-bold text-orange-600">{stats.totalPartidos}</p>
                        </div>
                        <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Hoy</p>
                          <p className="text-3xl font-bold text-red-600">{stats.partidosHoy}</p>
                        </div>
                        <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Esta Semana</p>
                          <p className="text-3xl font-bold text-blue-600">{stats.partidosEstaSemana}</p>
                        </div>
                        <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Este Mes</p>
                          <p className="text-3xl font-bold text-green-600">{stats.partidosEsteMes}</p>
                        </div>
                        <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas de reportes */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Reportes y Moderación</h3>
                  <div className="grid gap-2 xs:gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Reportes Pendientes</p>
                          <p className="text-3xl font-bold text-orange-600">{stats.reportesPendientes}</p>
                        </div>
                        <Flag className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Reportes Resueltos</p>
                          <p className="text-3xl font-bold text-green-600">{stats.reportesResueltos}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Reportes</p>
                          <p className="text-3xl font-bold text-gray-600">{stats.reportesTotal}</p>
                          {stats.reportesTotal > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.round((stats.reportesResueltos / stats.reportesTotal) * 100)}% resueltos
                            </p>
                          )}
                        </div>
                        <Flag className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Usuarios */}
            {activeTab === "users" && (
              <>
                {/* Filtros de Usuarios */}
                <div className="bg-white rounded-lg border p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Filtros</h3>
                  <div className="grid gap-2 xs:gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Búsqueda */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Buscar
                      </label>
                      <Input
                        type="text"
                        placeholder="Nombre, email o celular..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Filtro por Rol */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Rol
                      </label>
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value as any)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">Todos</option>
                        <option value="admin">Administradores</option>
                        <option value="user">Usuarios</option>
                      </select>
                    </div>

                    {/* Filtro por Estado */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value as any)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">Todos</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                        <option value="banned">Baneados</option>
                        <option value="deleted">Eliminados</option>
                      </select>
                    </div>
                  </div>

                  {/* Contador de resultados */}
                  <div className="mt-3 text-xs text-gray-600">
                    Mostrando {filteredUsuarios.length} de {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Vista Desktop - Tabla */}
                <div className="hidden md:block overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Usuario
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Rol
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredUsuarios.map((usuario) => (
                          <tr
                            key={usuario.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/users/${usuario.id}`)}
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <UserAvatar
                                  userId={usuario.id}
                                  photo={usuario.foto_perfil || null}
                                  name={usuario.nombre}
                                  className="h-7 w-7 ring-1 ring-white shadow-sm"
                                />
                                <span className="font-medium text-sm">
                                  {usuario.nombre} {usuario.apellido}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">
                              {usuario.email}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">
                              {usuario.email || "-"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${usuario.rol === "ADMIN"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                                  }`}
                              >
                                {usuario.rol === "ADMIN" ? (
                                  <Shield className="h-3 w-3" />
                                ) : (
                                  <Users className="h-3 w-3" />
                                )}
                                {usuario.rol || "USER"}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {usuario.deleted_at || usuario.deletedAt ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
                                  Eliminado
                                </span>
                              ) : usuario.bannedAt ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700">
                                  Baneado
                                </span>
                              ) : usuario.lastActivityAt &&
                                new Date(usuario.lastActivityAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000 ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
                                  Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600">
                                  Inactivo
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/users/${usuario.id}`)}
                                  title="Ver perfil"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleRole(usuario.id, usuario.rol || "USER")}
                                  title={
                                    usuario.rol === "ADMIN"
                                      ? "Quitar permisos de admin"
                                      : "Hacer administrador"
                                  }
                                >
                                  {usuario.rol === "ADMIN" ? (
                                    <ShieldOff className="h-4 w-4" />
                                  ) : (
                                    <Shield className="h-4 w-4" />
                                  )}
                                </Button>
                                {!usuario.deleted_at && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => openDeleteModal(usuario.id)}
                                    title="Eliminar permanentemente"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vista Móvil - Cards */}
                <div className="md:hidden space-y-2">
                  {filteredUsuarios.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="bg-white rounded-lg border shadow-sm p-3 active:bg-gray-50 transition-colors"
                      onClick={() => router.push(`/users/${usuario.id}`)}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <UserAvatar
                          userId={usuario.id}
                          photo={usuario.foto_perfil || null}
                          name={usuario.nombre}
                          className="h-10 w-10 ring-1 ring-white shadow-sm shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {usuario.nombre} {usuario.apellido}
                          </h3>
                          <p className="text-xs text-gray-600 truncate">{usuario.email}</p>
                          <p className="text-xs text-gray-500">
                            {(usuario as any).cedulaVerificada ? (
                              <span className="text-green-600 font-medium">✓ Cédula verificada</span>
                            ) : (
                              <span className="text-orange-600">Cédula sin verificar</span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${usuario.rol === "ADMIN"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {usuario.rol === "ADMIN" ? (
                              <Shield className="h-3 w-3" />
                            ) : (
                              <Users className="h-3 w-3" />
                            )}
                            {usuario.rol || "USER"}
                          </span>
                          {usuario.deleted_at || usuario.deletedAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
                              Eliminado
                            </span>
                          ) : usuario.bannedAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700">
                              Baneado
                            </span>
                          ) : usuario.lastActivityAt &&
                            new Date(usuario.lastActivityAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000 ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/users/${usuario.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRole(usuario.id, usuario.rol || "USER")}
                          className="flex-1"
                        >
                          {usuario.rol === "ADMIN" ? (
                            <>
                              <ShieldOff className="h-3 w-3 mr-1" />
                              Quitar
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          )}
                        </Button>
                        {!usuario.deleted_at && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteModal(usuario.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Partidos */}
            {activeTab === "matches" && (
              <>
                {/* Filtros de Partidos */}
                <div className="bg-white rounded-lg border p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Filtros</h3>
                  <div className="grid gap-2 xs:gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Búsqueda */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Buscar
                      </label>
                      <Input
                        type="text"
                        placeholder="Ubicación u organizador..."
                        value={matchSearchQuery}
                        onChange={(e) => setMatchSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Filtro por Tipo */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tipo de Partido
                      </label>
                      <select
                        value={matchTypeFilter}
                        onChange={(e) => setMatchTypeFilter(e.target.value as any)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">Todos</option>
                        <option value="FUTBOL_5">Fútbol 5</option>
                        <option value="FUTBOL_7">Fútbol 7</option>
                        <option value="FUTBOL_8">Fútbol 8</option>
                        <option value="FUTBOL_9">Fútbol 9</option>
                        <option value="FUTBOL_11">Fútbol 11</option>
                      </select>
                    </div>

                    {/* Filtro por Estado */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <select
                        value={matchStatusFilter}
                        onChange={(e) => setMatchStatusFilter(e.target.value as any)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">Todos</option>
                        <option value="DISPONIBLE">Disponible</option>
                        <option value="CONFIRMADO">Confirmado</option>
                        <option value="CANCELADO">Cancelado</option>
                        <option value="COMPLETADO">Completado</option>
                      </select>
                    </div>
                  </div>

                  {/* Contador de resultados */}
                  <div className="mt-3 text-xs text-gray-600">
                    Mostrando {filteredPartidos.length} de {partidos.length} partido{partidos.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Vista Desktop - Tabla */}
                <div className="hidden md:block overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleMatchSort("tipo")}
                          >
                            <div className="flex items-center gap-1">
                              Tipo
                              {matchSortField === "tipo" && (
                                matchSortDirection === "asc" ?
                                  <ChevronUp className="w-4 h-4" /> :
                                  <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleMatchSort("fecha")}
                          >
                            <div className="flex items-center gap-1">
                              Fecha/Hora
                              {matchSortField === "fecha" && (
                                matchSortDirection === "asc" ?
                                  <ChevronUp className="w-4 h-4" /> :
                                  <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleMatchSort("ubicacion")}
                          >
                            <div className="flex items-center gap-1">
                              Ubicación
                              {matchSortField === "ubicacion" && (
                                matchSortDirection === "asc" ?
                                  <ChevronUp className="w-4 h-4" /> :
                                  <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleMatchSort("organizador")}
                          >
                            <div className="flex items-center gap-1">
                              Organizador
                              {matchSortField === "organizador" && (
                                matchSortDirection === "asc" ?
                                  <ChevronUp className="w-4 h-4" /> :
                                  <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Jugadores
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredPartidos.map((partido) => (
                          <tr
                            key={partido.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/matches/${partido.id}?fromAdmin=true`)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{formatMatchType(partido.tipo_partido)}</span>
                                <div className="flex gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${partido.estado === 'DISPONIBLE' ? 'bg-green-100 text-green-800' :
                                    partido.estado === 'CONFIRMADO' ? 'bg-blue-100 text-blue-800' :
                                      partido.estado === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                                        partido.estado === 'COMPLETADO' ? 'bg-purple-100 text-purple-800' :
                                          'bg-gray-100 text-gray-800'
                                    }`}>
                                    {partido.estado}
                                  </span>
                                  {partido.genero && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                                      {partido.genero}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <div className="flex flex-col gap-0.5">
                                <span>{partido.fecha}</span>
                                <span className="text-xs text-gray-500">{partido.hora} · {partido.duracion || 90} min</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <div className="flex flex-col gap-0.5">
                                <span className="line-clamp-1">{partido.nombre_ubicacion}</span>
                                {(partido.precio_total && partido.precio_total > 0) && (
                                  <span className="text-xs font-semibold text-green-600">${partido.precio_total}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {partido.organizador ? (
                                <div className="flex items-center gap-2">
                                  <UserAvatar
                                    userId={partido.organizador.id}
                                    photo={partido.organizador.foto_perfil || null}
                                    name={partido.organizador.nombre}
                                    className="h-6 w-6"
                                    isDeleted={!!partido.organizador.deleted_at}
                                  />
                                  <span className="text-sm text-gray-600">
                                    {partido.organizador.nombre} {partido.organizador.apellido}
                                    {partido.organizador.deleted_at && (
                                      <span className="ml-2 text-xs text-red-500">(eliminado)</span>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-600">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {partido.jugadores_actuales || 0} / {partido.cantidad_jugadores}
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/matches/${partido.id}?fromAdmin=true`)}
                                  title="Ver partido"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteMatch(partido.id)}
                                  title="Eliminar partido"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vista Móvil - Cards */}
                <div className="md:hidden space-y-3">
                  {filteredPartidos.map((partido) => (
                    <div
                      key={partido.id}
                      className="bg-white rounded-lg border shadow-sm p-4 active:bg-gray-50 transition-colors"
                      onClick={() => router.push(`/matches/${partido.id}?fromAdmin=true`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm text-blue-600 mb-2">
                            {formatMatchType(partido.tipo_partido)}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${partido.estado === 'DISPONIBLE' ? 'bg-green-100 text-green-800' :
                              partido.estado === 'CONFIRMADO' ? 'bg-blue-100 text-blue-800' :
                                partido.estado === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                                  partido.estado === 'COMPLETADO' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                              }`}>
                              {partido.estado}
                            </span>
                            {partido.genero && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                                {partido.genero}
                              </span>
                            )}
                            {(partido.precio_total && partido.precio_total > 0) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                ${partido.precio_total}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {partido.fecha} · {partido.hora}
                            <span className="ml-2">⏱️ {partido.duracion || 90} min</span>
                          </p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-xs font-semibold text-gray-700">
                            {partido.jugadores_actuales || 0}/{partido.cantidad_jugadores}
                          </p>
                          <p className="text-xs text-gray-500">jugadores</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <p className="text-sm text-gray-600 flex items-start gap-2">
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{partido.nombre_ubicacion}</span>
                        </p>
                        {partido.organizador && (
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-gray-400 shrink-0" />
                            <UserAvatar
                              userId={partido.organizador.id}
                              photo={partido.organizador.foto_perfil || null}
                              name={partido.organizador.nombre}
                              className="h-5 w-5"
                              isDeleted={!!partido.organizador.deleted_at}
                            />
                            <span className="text-xs text-gray-600 truncate">
                              {partido.organizador.nombre} {partido.organizador.apellido}
                              {partido.organizador.deleted_at && (
                                <span className="ml-1 text-red-500">(eliminado)</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/matches/${partido.id}?fromAdmin=true`)}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver Partido
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMatch(partido.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <>
                {/* Controles y filtros */}
                <div className="bg-white rounded-lg border p-4 mb-4 space-y-4">
                  {/* Filtros de estado */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${reportFilter === 'pending'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      onClick={() => setReportFilter('pending')}
                    >
                      Pendientes ({reports.filter(r => r.status === 'PENDING').length})
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${reportFilter === 'resolved'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      onClick={() => setReportFilter('resolved')}
                    >
                      Resueltos ({reports.filter(r => r.status === 'RESOLVED' || r.status === 'DISMISSED').length})
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${reportFilter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      onClick={() => setReportFilter('all')}
                    >
                      Todos ({reports.length})
                    </button>
                  </div>

                  {/* Vista agrupada / lista */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Vista:</span>
                    <div className="flex gap-2">
                      <button
                        className={`p-2 rounded-lg transition-colors ${groupedView
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        onClick={() => setGroupedView(true)}
                        title="Agrupar por usuario"
                      >
                        <Users className="h-4 w-4" />
                      </button>
                      <button
                        className={`p-2 rounded-lg transition-colors ${!groupedView
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        onClick={() => setGroupedView(false)}
                        title="Ver lista"
                      >
                        <LayoutList className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de reportes */}
                {reports.length === 0 ? (
                  <div className="bg-white rounded-lg border p-8 text-center">
                    <Flag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No hay reportes</p>
                  </div>
                ) : groupedView ? (
                  /* Vista agrupada por usuario */
                  <div className="space-y-3">
                    {getGroupedReports().map(({ user, reports: userReports, totalReports, pendingReports }) => (
                      <div
                        key={user.id}
                        className="bg-white rounded-lg border shadow-sm overflow-hidden"
                      >
                        {/* Header del grupo */}
                        <div
                          className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => toggleGroup(user.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <UserAvatar
                                userId={user.id}
                                photo={null}
                                name={user.nombre}
                                className="h-10 w-10 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                  <span className="truncate">
                                    {user.nombre} {user.apellido}
                                  </span>
                                  {user.bannedAt && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded shrink-0">
                                      BANNED
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {totalReports} reporte{totalReports > 1 ? 's' : ''}
                                  {pendingReports > 0 && (
                                    <span className="ml-2 text-orange-600 font-medium">
                                      ({pendingReports} pendiente{pendingReports > 1 ? 's' : ''})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {pendingReports > 0 && (
                                <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                  {pendingReports}
                                </div>
                              )}
                              {expandedGroups.has(user.id) ? (
                                <ChevronUp className="h-5 w-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reportes del grupo (expandible) */}
                        {expandedGroups.has(user.id) && (
                          <div className="divide-y">
                            {userReports.map((report, idx) => (
                              <div key={report.id} className="p-4 bg-white">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${report.status === 'PENDING' ? 'bg-orange-500' :
                                      report.status === 'UNDER_REVIEW' ? 'bg-blue-500' :
                                        report.status === 'RESOLVED' ? 'bg-green-500' :
                                          'bg-gray-400'
                                      }`} />
                                    <div className="min-w-0">
                                      <div className="font-medium text-gray-900 text-sm">
                                        {report.reason.replace(/_/g, ' ')}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Reportado por: {report.reporter.nombre} {report.reporter.apellido} • {new Date(report.createdAt).toLocaleDateString('es-ES')}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${report.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                    report.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                                      report.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {report.status}
                                  </span>
                                </div>

                                <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-2 rounded">
                                  {report.description}
                                </p>

                                {report.status === 'PENDING' && (
                                  <div className="flex gap-2 flex-wrap">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => router.push(`/users/${user.id}`)}
                                      className="text-xs"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      Ver perfil
                                    </Button>
                                    {!user.bannedAt && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          openBanModal(user)
                                          setBanReason(report.reason)
                                        }}
                                        className="text-xs"
                                      >
                                        <ShieldOff className="h-3 w-3 mr-1" />
                                        Banear
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => handleResolveReport(report.id, 'WARNING_SENT')}
                                      className="text-xs bg-yellow-600 hover:bg-yellow-700"
                                    >
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Advertir
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => openDismissModal(report)}
                                      className="text-xs bg-gray-600 hover:bg-gray-700"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Desestimar
                                    </Button>
                                  </div>
                                )}

                                {(report.status === 'RESOLVED' || report.status === 'DISMISSED') && report.resolvedBy && (
                                  <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                                    {report.status === 'RESOLVED' ? 'Resuelto' : 'Desestimado'} por {report.resolvedBy.nombre} {report.resolvedBy.apellido} el {new Date(report.resolvedAt!).toLocaleDateString('es-ES')}
                                    {report.action && ` • Acción: ${report.action}`}
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Acciones rápidas del grupo */}
                            {pendingReports > 0 && !user.bannedAt && (
                              <div className="p-3 bg-gray-50 border-t">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    openBanModal(user)
                                    setBanReason(`Usuario con ${totalReports} reportes`)
                                  }}
                                  className="w-full text-xs"
                                >
                                  <ShieldOff className="h-3 w-3 mr-1" />
                                  Banear usuario ({totalReports} reportes)
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Vista de lista tradicional */
                  <div className="space-y-3">
                    {getFilteredReports().map((report) => (
                      <div
                        key={report.id}
                        className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${report.status === 'PENDING' ? 'bg-orange-500' :
                              report.status === 'UNDER_REVIEW' ? 'bg-blue-500' :
                                report.status === 'RESOLVED' ? 'bg-green-500' :
                                  'bg-gray-400'
                              }`} />
                            <div>
                              <div className="font-medium text-gray-900">
                                {report.reason.replace(/_/g, ' ')}
                              </div>
                              <div className="text-sm text-gray-600">
                                Reportado: <span className="font-medium">{report.reportedUser.nombre} {report.reportedUser.apellido}</span>
                                {report.reportedUser.bannedAt && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">BANNED</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Por: {report.reporter.nombre} {report.reporter.apellido} • {new Date(report.createdAt).toLocaleDateString('es-ES')}
                              </div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${report.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                            report.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                              report.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {report.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 rounded">
                          {report.description}
                        </p>

                        {report.status === 'PENDING' && (
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/users/${report.reportedUser.id}`)}
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver perfil
                            </Button>
                            {!report.reportedUser.bannedAt && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  openBanModal(report.reportedUser as Usuario)
                                  setBanReason(report.reason)
                                }}
                                className="text-xs"
                              >
                                <ShieldOff className="h-3 w-3 mr-1" />
                                Banear usuario
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleResolveReport(report.id, 'WARNING_SENT')}
                              className="text-xs bg-yellow-600 hover:bg-yellow-700"
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Advertir
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openDismissModal(report)}
                              className="text-xs bg-gray-600 hover:bg-gray-700"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Desestimar
                            </Button>
                          </div>
                        )}

                        {(report.status === 'RESOLVED' || report.status === 'DISMISSED') && report.resolvedBy && (
                          <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                            {report.status === 'RESOLVED' ? 'Resuelto' : 'Desestimado'} por {report.resolvedBy.nombre} {report.resolvedBy.apellido} el {new Date(report.resolvedAt!).toLocaleDateString('es-ES')}
                            {report.action && ` • Acción: ${report.action}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal de Detalles de Usuario */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="max-w-full sm:max-w-2xl w-full bg-white sm:rounded-lg shadow-xl overflow-hidden max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <UserAvatar
                  userId={selectedUser.id}
                  photo={selectedUser.foto_perfil || null}
                  name={selectedUser.nombre}
                  className="h-10 w-10 sm:h-12 sm:w-12 ring-4 ring-white/30 shrink-0"
                />
                <div className="text-white min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">
                    {selectedUser.nombre} {selectedUser.apellido}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100">
                    {selectedUser.rol === "ADMIN" ? "Administrador" : "Usuario"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 xs:gap-3 sm:gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Email</span>
                  </div>
                  <p className="text-gray-900 pl-6 break-words text-sm">{selectedUser.email}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Email</span>
                  </div>
                  <p className="text-gray-900 pl-6 text-sm">{selectedUser.email || "-"}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Rol</span>
                  </div>
                  <p className="pl-6">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${selectedUser.rol === "ADMIN"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {selectedUser.rol === "ADMIN" ? (
                        <Shield className="h-3 w-3" />
                      ) : (
                        <Users className="h-3 w-3" />
                      )}
                      {selectedUser.rol || "USER"}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <UserCheck className="h-4 w-4" />
                    <span className="font-medium">Estado</span>
                  </div>
                  <p className="pl-6">
                    {selectedUser.deleted_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        Eliminado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Activo
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="pt-4 border-t flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null)
                    handleToggleRole(selectedUser.id, selectedUser.rol || "USER")
                  }}
                  className="w-full sm:w-auto"
                >
                  {selectedUser.rol === "ADMIN" ? (
                    <>
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Quitar Admin
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Hacer Admin
                    </>
                  )}
                </Button>
                {!selectedUser.deleted_at && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedUser(null)
                      openDeleteModal(selectedUser.id)
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Usuario
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Partido */}
      {selectedMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setSelectedMatch(null)}
        >
          <div
            className="max-w-full sm:max-w-2xl w-full bg-white sm:rounded-lg shadow-xl overflow-hidden max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                  {formatMatchType(selectedMatch.tipo_partido)}
                </h2>
                <p className="text-xs sm:text-sm text-orange-100 truncate">
                  ID: {selectedMatch.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 xs:gap-3 sm:gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Fecha</span>
                  </div>
                  <p className="text-gray-900 pl-6 text-sm">{selectedMatch.fecha}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Hora</span>
                  </div>
                  <p className="text-gray-900 pl-6 text-sm">{selectedMatch.hora}</p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Ubicación</span>
                  </div>
                  <p className="text-gray-900 pl-6 break-words text-sm">{selectedMatch.nombre_ubicacion}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Jugadores</span>
                  </div>
                  <p className="text-gray-900 pl-6 text-sm">
                    {selectedMatch.jugadores_actuales || 0} / {selectedMatch.cantidad_jugadores}
                  </p>
                </div>

                {selectedMatch.organizador && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <UserCheck className="h-4 w-4" />
                      <span className="font-medium">Organizador</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <UserAvatar
                        userId={selectedMatch.organizador.id}
                        photo={selectedMatch.organizador.foto_perfil || null}
                        name={selectedMatch.organizador.nombre}
                        className="h-6 w-6"
                      />
                      <span className="text-gray-900">
                        {selectedMatch.organizador.nombre} {selectedMatch.organizador.apellido}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="pt-4 border-t flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMatch(null)}
                  className="w-full sm:w-auto"
                >
                  Cerrar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setSelectedMatch(null)
                    handleDeleteMatch(selectedMatch.id)
                  }}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Partido
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="max-w-md w-full bg-white rounded-lg shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Eliminar Usuario Permanentemente
                </h3>
                <p className="text-sm text-gray-500">
                  Esta acción NO se puede deshacer
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="mb-6 space-y-4">
              <p className="text-sm text-gray-700">
                Estás a punto de eliminar este usuario de forma permanente. Se eliminarán:
              </p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 ml-2">
                <li>Todos sus datos personales</li>
                <li>Su historial de partidos</li>
                <li>Sus amistades y solicitudes</li>
                <li>Todos sus comentarios y reseñas</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Para confirmar, escribe <span className="font-bold">ELIMINAR</span> en el campo de abajo:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Escribe ELIMINAR"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeDeleteModal}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteConfirmText !== "ELIMINAR"}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Baneo de Usuario */}
      {showBanModal && userToBan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeBanModal}
        >
          <div
            className="max-w-md w-full bg-white rounded-lg shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldOff className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Banear Usuario
                </h3>
                <p className="text-sm text-gray-500">
                  {userToBan.nombre} {userToBan.apellido}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="mb-6 space-y-4">
              {/* Tipo de baneo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Tipo de baneo
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="banType"
                      value="temporary"
                      checked={banType === "temporary"}
                      onChange={(e) => setBanType(e.target.value as "temporary" | "permanent")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Temporal</div>
                      <div className="text-xs text-gray-600">Banear por un período específico</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="banType"
                      value="permanent"
                      checked={banType === "permanent"}
                      onChange={(e) => setBanType(e.target.value as "temporary" | "permanent")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 text-red-600">Permanente</div>
                      <div className="text-xs text-gray-600">Banear indefinidamente</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Duración (solo si es temporal) */}
              {banType === "temporary" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Duración del baneo
                  </label>
                  <select
                    value={banDuration || 7}
                    onChange={(e) => setBanDuration(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1 día</option>
                    <option value="3">3 días</option>
                    <option value="7">7 días (1 semana)</option>
                    <option value="14">14 días (2 semanas)</option>
                    <option value="30">30 días (1 mes)</option>
                    <option value="90">90 días (3 meses)</option>
                  </select>
                </div>
              )}

              {/* Razón del baneo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Razón del baneo *
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Describe el motivo del baneo..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
                <p className="text-xs text-gray-500">
                  Esta razón será visible para el usuario cuando intente iniciar sesión.
                </p>
              </div>

              {/* Advertencia */}
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-medium mb-1">Esta acción es irreversible:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>El usuario no podrá iniciar sesión</li>
                      <li>Todas sus sesiones activas serán cerradas</li>
                      {banType === "permanent" && <li className="font-bold">El baneo será PERMANENTE</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3">
              <Button
                onClick={closeBanModal}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBanUser}
                variant="destructive"
                className="flex-1"
                disabled={!banReason.trim()}
              >
                <ShieldOff className="h-4 w-4 mr-1" />
                {banType === "permanent" ? "Banear Permanentemente" : `Banear ${banDuration} días`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Desestimar Reporte */}
      {showDismissModal && reportToDismiss && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDismissModal}
        >
          <div
            className="max-w-md w-full bg-white rounded-lg shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Flag className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Desestimar Reporte
                </h3>
                <p className="text-sm text-gray-500">
                  Marcar como falso o sin fundamento
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="mb-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Reporte:</p>
                <p className="text-sm text-gray-900 font-medium">
                  {reportToDismiss.reason.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Reportado: {reportToDismiss.reportedUser.nombre} {reportToDismiss.reportedUser.apellido}
                </p>
                <p className="text-xs text-gray-600">
                  Por: {reportToDismiss.reporter.nombre} {reportToDismiss.reporter.apellido}
                </p>
              </div>

              {/* Acción sobre el reportador */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  ¿Qué hacer con el reportador?
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="dismissAction"
                      value="no_action"
                      checked={dismissAction === "no_action"}
                      onChange={(e) => setDismissAction(e.target.value as "no_action" | "warn_reporter")}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Sin acción</div>
                      <div className="text-xs text-gray-600">Solo desestimar el reporte</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="dismissAction"
                      value="warn_reporter"
                      checked={dismissAction === "warn_reporter"}
                      onChange={(e) => setDismissAction(e.target.value as "no_action" | "warn_reporter")}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        Advertir al reportador
                      </div>
                      <div className="text-xs text-gray-600">
                        Marcar como reporte falso o malintencionado
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Notas {dismissAction === "warn_reporter" && <span className="text-red-600">*</span>}
                </label>
                <textarea
                  value={dismissNotes}
                  onChange={(e) => setDismissNotes(e.target.value)}
                  placeholder={
                    dismissAction === "warn_reporter"
                      ? "Explicar por qué se considera reporte falso..."
                      : "Notas adicionales (opcional)..."
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
              </div>

              {dismissAction === "warn_reporter" && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                    <div className="text-xs text-orange-800">
                      <p className="font-medium mb-1">Se registrará advertencia</p>
                      <p>
                        Esto quedará registrado en el historial del reportador.
                        Si acumula múltiples reportes falsos, podrá ser sancionado.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeDismissModal}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDismissReport}
                disabled={dismissAction === "warn_reporter" && !dismissNotes.trim()}
                className="flex-1 bg-gray-600 hover:bg-gray-700"
              >
                <X className="h-4 w-4 mr-2" />
                Desestimar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
