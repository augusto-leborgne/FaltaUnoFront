"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Calendar, TrendingUp, UserCheck, Trash2, Shield, ShieldOff, AlertCircle, CheckCircle, X, Eye, Mail, Phone, MapPin, Clock } from "lucide-react"
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
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "matches">("stats")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Estados para modales de detalles
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Partido | null>(null)

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
      } catch (error) {
        logger.error("[AdminDashboard] Error cargando datos:", error)
        // Set empty arrays on error to prevent crashes
        setUsuarios([])
        setPartidos([])
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [user])

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario permanentemente? Esta acción NO se puede deshacer.")) {
      return
    }

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
    } catch (error) {
      logger.error("[AdminDashboard] Error eliminando usuario:", error)
      setError("Error al eliminar usuario: " + (error instanceof Error ? error.message : "Error desconocido"))
      setTimeout(() => setError(null), 5000)
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
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/home")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Panel de Administración</h1>
                <p className="text-sm text-gray-600">Gestión de usuarios y partidos</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-xs font-semibold text-red-600">ADMIN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-4">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 flex-1">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "stats"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <TrendingUp className="mb-1 inline h-4 w-4" /> Estadísticas
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "users"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="mb-1 inline h-4 w-4" /> Usuarios ({usuarios.length})
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "matches"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="mb-1 inline h-4 w-4" /> Partidos ({partidos.length})
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
              <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
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
                                size="sm"
                                className="ring-2 ring-white shadow-sm"
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
                                  onClick={() => handleDeleteUser(usuario.id)}
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
            )}

            {/* Partidos */}
            {activeTab === "matches" && (
              <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
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
                                  size="xs"
                                />
                                <span className="text-sm text-gray-600">
                                  {partido.organizador.nombre} {partido.organizador.apellido}
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
            )}
          </>
        )}
      </div>

      {/* Modal de Detalles de Usuario */}
      {selectedUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="max-w-2xl w-full bg-white rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  userId={selectedUser.id}
                  photo={selectedUser.foto_perfil || null}
                  name={selectedUser.nombre}
                  size="md"
                  className="ring-4 ring-white/30"
                />
                <div className="text-white">
                  <h2 className="text-xl font-bold">
                    {selectedUser.nombre} {selectedUser.apellido}
                  </h2>
                  <p className="text-sm text-blue-100">
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
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Email</span>
                  </div>
                  <p className="text-gray-900 pl-6">{selectedUser.email}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Celular</span>
                  </div>
                  <p className="text-gray-900 pl-6">{selectedUser.celular || "-"}</p>
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
              <div className="pt-4 border-t flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null)
                    handleToggleRole(selectedUser.id, selectedUser.rol || "USER")
                  }}
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
                      handleDeleteUser(selectedUser.id)
                    }}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedMatch(null)}
        >
          <div 
            className="max-w-2xl w-full bg-white rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedMatch.tipo_partido}
                </h2>
                <p className="text-sm text-orange-100">
                  ID: {selectedMatch.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Fecha</span>
                  </div>
                  <p className="text-gray-900 pl-6">{selectedMatch.fecha}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Hora</span>
                  </div>
                  <p className="text-gray-900 pl-6">{selectedMatch.hora}</p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Ubicación</span>
                  </div>
                  <p className="text-gray-900 pl-6">{selectedMatch.nombre_ubicacion}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Jugadores</span>
                  </div>
                  <p className="text-gray-900 pl-6">
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
                        size="xs"
                      />
                      <span className="text-gray-900">
                        {selectedMatch.organizador.nombre} {selectedMatch.organizador.apellido}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="pt-4 border-t flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMatch(null)}
                >
                  Cerrar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setSelectedMatch(null)
                    handleDeleteMatch(selectedMatch.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Partido
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
