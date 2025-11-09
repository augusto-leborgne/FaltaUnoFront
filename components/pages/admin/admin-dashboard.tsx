"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Calendar, TrendingUp, UserCheck, Trash2, Shield, ShieldOff } from "lucide-react"
import { API_URL } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { logger } from "@/lib/logger"
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
      await authenticatedFetch(`${API_URL}/admin/usuarios/${userId}`, {
        method: "DELETE",
      })

      // Actualizar lista
      setUsuarios((prev) => prev.filter((u) => u.id !== userId))
      
      // Actualizar stats
      if (stats) {
        setStats({ ...stats, totalUsuarios: stats.totalUsuarios - 1 })
      }
    } catch (error) {
      logger.error("[AdminDashboard] Error eliminando usuario:", error)
      alert("Error al eliminar usuario")
    }
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN"
    
    if (!confirm(`¿Cambiar rol a ${newRole}?`)) {
      return
    }

    try {
      await authenticatedFetch(`${API_URL}/admin/usuarios/${userId}/rol`, {
        method: "PUT",
        body: JSON.stringify({ rol: newRole }),
      })

      // Actualizar lista
      setUsuarios((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, rol: newRole } : u))
      )
    } catch (error) {
      logger.error("[AdminDashboard] Error cambiando rol:", error)
      alert("Error al cambiar rol")
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("¿Estás seguro de eliminar este partido?")) {
      return
    }

    try {
      await authenticatedFetch(`${API_URL}/admin/partidos/${matchId}`, {
        method: "DELETE",
      })

      // Actualizar lista
      setPartidos((prev) => prev.filter((p) => p.id !== matchId))
      
      // Actualizar stats
      if (stats) {
        setStats({ ...stats, totalPartidos: stats.totalPartidos - 1 })
      }
    } catch (error) {
      logger.error("[AdminDashboard] Error eliminando partido:", error)
      alert("Error al eliminar partido")
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
                        <tr key={usuario.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200">
                                {usuario.foto_perfil && (
                                  <img
                                    src={usuario.foto_perfil}
                                    alt={usuario.nombre}
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </div>
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
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
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
                        <tr key={partido.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-medium">{partido.tipo_partido}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {partido.fecha} {partido.hora}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {partido.nombre_ubicacion}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {partido.organizador
                              ? `${partido.organizador.nombre} ${partido.organizador.apellido}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {partido.jugadores_actuales || 0} / {partido.cantidad_jugadores}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteMatch(partido.id)}
                              title="Eliminar partido"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
    </div>
  )
}
