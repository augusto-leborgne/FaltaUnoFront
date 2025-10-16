"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Clock, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"

interface Partido {
  id: string
  tipo_partido: string
  nivel: string
  fecha: string
  hora: string
  nombre_ubicacion: string
  estado: string
  precio_por_jugador: number
  jugadores_actuales: number
  max_jugadores: number
  capitanId?: string
}

export function MyMatchesScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Creados")
  const [createdMatches, setCreatedMatches] = useState<Partido[]>([])
  const [joinedMatches, setJoinedMatches] = useState<Partido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    try {
      setLoading(true)
      const token = AuthService.getToken()
      const user = AuthService.getUser()
      
      if (!token || !user?.id) {
        router.push("/login")
        return
      }

      // Cargar partidos del usuario
      const response = await fetch(`/api/partidos/usuario/${user.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        const partidos = result.data || []
        
        // Separar en creados vs inscritos
        const created = partidos.filter((p: Partido) => p.capitanId === user.id)
        const joined = partidos.filter((p: Partido) => p.capitanId !== user.id)
        
        setCreatedMatches(created)
        setJoinedMatches(joined)
      }
    } catch (error) {
      console.error("Error cargando partidos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMatch = () => {
    router.push("/create-match")
  }

  const handleMatchClick = (match: Partido) => {
    const user = AuthService.getUser()
    
    if (activeTab === "Creados" && match.capitanId === user?.id) {
      // Si es creador, ir a gestión
      router.push(`/my-matches/${match.id}`)
    } else {
      // Si es participante, ir a detalle
      router.push(`/matches/${match.id}`)
    }
  }

  const formatMatchType = (type: string) => {
    return type.replace("FUTBOL_", "Fútbol ").replace("_", " ")
  }

  const formatLevel = (level: string) => {
    const levelMap: { [key: string]: string } = {
      PRINCIPIANTE: "Principiante",
      INTERMEDIO: "Intermedio",
      AVANZADO: "Avanzado",
      PROFESIONAL: "Profesional"
    }
    return levelMap[level] || level
  }

  const formatDate = (dateString: string, timeString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return `Hoy ${timeString}`
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Mañana ${timeString}`
    } else {
      return `${date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "short",
      })} ${timeString}`
    }
  }

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "CONFIRMADO":
        return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>
      case "CANCELADO":
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
      case "COMPLETADO":
        return <Badge className="bg-blue-100 text-blue-800">Completado</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-12 pb-4 px-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Mis Partidos</h1>
          <Button
            onClick={handleCreateMatch}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 min-h-[40px] min-w-[40px] touch-manipulation"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 px-6">
        <div className="flex bg-orange-50 rounded-2xl p-1 mb-6 mt-4">
          {["Creados", "Inscriptos"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4 pb-24">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <>
              {activeTab === "Creados" &&
                (createdMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No has creado partidos aún</p>
                    <Button
                      onClick={handleCreateMatch}
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Crear Partido
                    </Button>
                  </div>
                ) : (
                  createdMatches.map((match) => {
                    const spotsLeft = match.max_jugadores - match.jugadores_actuales
                    return (
                      <div
                        key={match.id}
                        onClick={() => handleMatchClick(match)}
                        className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all touch-manipulation active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex gap-2">
                            <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                              {formatMatchType(match.tipo_partido)}
                            </Badge>
                            <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                              {formatLevel(match.nivel)}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            {getStatusBadge(match.estado)}
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Quedan {spotsLeft}
                            </Badge>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {formatDate(match.fecha, match.hora)}
                          </h3>
                          <div className="flex items-center text-gray-600 text-sm space-x-4 mb-2">
                            <div className="flex items-center space-x-1">
                              <span>${match.precio_por_jugador} / jugador</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>90 min</span>
                            </div>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{match.nombre_ubicacion}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-600">
                              {match.jugadores_actuales}/{match.max_jugadores} jugadores
                            </span>
                          </div>
                          <span className="text-sm text-primary font-medium">Gestionar</span>
                        </div>
                      </div>
                    )
                  })
                ))}

              {activeTab === "Inscriptos" &&
                (joinedMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No tienes partidos inscriptos</p>
                    <Button
                      onClick={() => router.push("/matches")}
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Buscar Partidos
                    </Button>
                  </div>
                ) : (
                  joinedMatches.map((match) => {
                    const spotsLeft = match.max_jugadores - match.jugadores_actuales
                    
                    return (
                      <div
                        key={match.id}
                        onClick={() => handleMatchClick(match)}
                        className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all touch-manipulation active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex gap-2">
                            <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                              {formatMatchType(match.tipo_partido)}
                            </Badge>
                            <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                              {formatLevel(match.nivel)}
                            </Badge>
                            {getStatusBadge(match.estado)}
                          </div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Quedan {spotsLeft}
                          </Badge>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {formatDate(match.fecha, match.hora)}
                          </h3>
                          <div className="flex items-center text-gray-600 text-sm space-x-4 mb-2">
                            <span>${match.precio_por_jugador} / jugador</span>
                            <span>90 min</span>
                          </div>
                          <p className="text-gray-600">{match.nombre_ubicacion}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-600">
                              {match.jugadores_actuales}/{match.max_jugadores} jugadores
                            </span>
                          </div>
                          <span className="text-sm text-primary font-medium">Ver detalles</span>
                        </div>
                      </div>
                    )
                  })
                ))}
            </>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}