"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Calendar, TrendingUp, UserCheck, Trash2, Shield, ShieldOff, AlertCircle, CheckCircle, X, Eye, Mail, Phone, MapPin, Clock, Flag } from "lucide-react"
import { API_URL } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { Usuario } from "@/lib/api"

interface AdminStats {
  totalUsuarios: number
  usuariosActivos: number
  registrosRecientes: number
  totalPartidos: number
  partidosHoy: number
}

interface Partido {
  id: string
  tipo_partido: string
  fecha: string
  hora: string
  nombre_ubicacion: string
  cantidad_jugadores: number
  jugadores_actuales?: number
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
      throw new Error(`HTTP error! status: ${response.status}`)
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

  const handleBanUser = async (userId: string, reason: string) => {
    const banReason = prompt("Motivo del baneo:", reason)
    if (!banReason) return

    try {
      setError(null)
      await authenticatedFetch(`${API_URL}/admin/usuarios/${userId}/ban`, {
        method: "POST",
        body: JSON.stringify({ reason: banReason }),
      })

      // Actualizar lista de usuarios
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, bannedAt: new Date().toISOString() } : u
        )
      )

      setSuccessMessage("Usuario baneado correctamente")
      setTimeout(() => setSuccessMessage(null), 3000)
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
    <div className="min-h-screen bg-gray-50 pb-20">
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
            className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === "stats"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <TrendingUp className="mb-1 inline h-3 w-3 sm:h-4 sm:w-4" /> 
            <span className="ml-1">Stats</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === "users"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="mb-1 inline h-3 w-3 sm:h-4 sm:w-4" /> 
            <span className="ml-1">Usuarios ({usuarios.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === "matches"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="mb-1 inline h-3 w-3 sm:h-4 sm:w-4" /> 
            <span className="ml-1">Partidos ({partidos.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === "reports"
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Usuarios</p>
                      <p className="text-3xl font-bold">{stats.totalUsuarios}</p>
                    </div>
                    <Users className="h-10 w-10 text-blue-500" />
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Usuarios Activos</p>
                      <p className="text-3xl font-bold">{stats.usuariosActivos}</p>
                    </div>
                    <UserCheck className="h-10 w-10 text-green-500" />
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Registros (7d)</p>
                      <p className="text-3xl font-bold">{stats.registrosRecientes}</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-purple-500" />
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Partidos</p>
                      <p className="text-3xl font-bold">{stats.totalPartidos}</p>
                    </div>
                    <Calendar className="h-10 w-10 text-orange-500" />
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Partidos Hoy</p>
                      <p className="text-3xl font-bold">{stats.partidosHoy}</p>
                    </div>
                    <Calendar className="h-10 w-10 text-red-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Usuarios */}
            {activeTab === "users" && (
              <>
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
                            Celular
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
                        {usuarios.map((usuario) => (
                          <tr 
                            key={usuario.id} 
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => setSelectedUser(usuario)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  userId={usuario.id}
                                  photo={usuario.foto_perfil || null}
                                  name={usuario.nombre}
                                  className="h-8 w-8 ring-2 ring-white shadow-sm"
                                />
                                <span className="font-medium">
                                  {usuario.nombre} {usuario.apellido}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {usuario.email}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {usuario.celular || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                                  usuario.rol === "ADMIN"
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
                            <td className="px-4 py-3">
                              {usuario.deleted_at ? (
                                <span className="text-xs text-red-600">Eliminado</span>
                              ) : (
                                <span className="text-xs text-green-600">Activo</span>
                              )}
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedUser(usuario)}
                                  title="Ver detalles"
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
                <div className="md:hidden space-y-3">
                  {usuarios.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="bg-white rounded-lg border shadow-sm p-4 active:bg-gray-50 transition-colors"
                      onClick={() => setSelectedUser(usuario)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <UserAvatar
                          userId={usuario.id}
                          photo={usuario.foto_perfil || null}
                          name={usuario.nombre}
                          className="h-12 w-12 ring-2 ring-white shadow-sm shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {usuario.nombre} {usuario.apellido}
                          </h3>
                          <p className="text-xs text-gray-600 truncate">{usuario.email}</p>
                          <p className="text-xs text-gray-500">{usuario.celular || "Sin celular"}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              usuario.rol === "ADMIN"
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
                          {usuario.deleted_at ? (
                            <span className="text-xs text-red-600 font-medium">Eliminado</span>
                          ) : (
                            <span className="text-xs text-green-600 font-medium">Activo</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(usuario)}
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
                {/* Vista Desktop - Tabla */}
                <div className="hidden md:block overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Fecha/Hora
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Ubicación
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                            Organizador
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
                        {partidos.map((partido) => (
                          <tr 
                            key={partido.id} 
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => setSelectedMatch(partido)}
                          >
                            <td className="px-4 py-3">
                              <span className="font-medium">{partido.tipo_partido}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {partido.fecha} {partido.hora}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {partido.nombre_ubicacion}
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
                                  onClick={() => setSelectedMatch(partido)}
                                  title="Ver detalles"
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
                  {partidos.map((partido) => (
                    <div
                      key={partido.id}
                      className="bg-white rounded-lg border shadow-sm p-4 active:bg-gray-50 transition-colors"
                      onClick={() => setSelectedMatch(partido)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-sm text-blue-600">
                            {partido.tipo_partido}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {partido.fecha} {partido.hora}
                          </p>
                        </div>
                        <div className="text-right">
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
                          onClick={() => setSelectedMatch(partido)}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver Detalles
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
                {/* Filtros de reportes */}
                <div className="bg-white rounded-lg border p-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    <button 
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !reports.filter(r => r.status === 'PENDING').length 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      }`}
                      disabled={!reports.filter(r => r.status === 'PENDING').length}
                    >
                      Pendientes ({reports.filter(r => r.status === 'PENDING').length})
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                      Todos ({reports.length})
                    </button>
                  </div>
                </div>

                {/* Lista de reportes */}
                {reports.length === 0 ? (
                  <div className="bg-white rounded-lg border p-8 text-center">
                    <Flag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No hay reportes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              report.status === 'PENDING' ? 'bg-orange-500' :
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
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            report.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
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
                                onClick={() => handleBanUser(report.reportedUser.id, report.reason)}
                                className="text-xs"
                              >
                                <ShieldOff className="h-3 w-3 mr-1" />
                                Banear usuario
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleResolveReport(report.id, 'NO_ACTION')}
                              className="text-xs bg-gray-600 hover:bg-gray-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Desestimar
                            </Button>
                          </div>
                        )}

                        {report.status === 'RESOLVED' && report.resolvedBy && (
                          <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                            Resuelto por {report.resolvedBy.nombre} {report.resolvedBy.apellido} el {new Date(report.resolvedAt!).toLocaleDateString('es-ES')}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <span className="font-medium">Celular</span>
                  </div>
                  <p className="text-gray-900 pl-6 text-sm">{selectedUser.celular || "-"}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Rol</span>
                  </div>
                  <p className="pl-6">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        selectedUser.rol === "ADMIN"
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
                  {selectedMatch.tipo_partido}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  )
}
