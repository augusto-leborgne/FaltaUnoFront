"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, MapPin, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { AuthService } from "@/lib/auth"

interface SearchResult {
  id: string
  tipo: "usuario" | "partido"
  nombre?: string
  apellido?: string
  tipo_partido?: string
  fecha?: string
  hora?: string
  nombre_ubicacion?: string
  foto_perfil?: string
  posicion?: string
}

export default function SearchPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"todos" | "usuarios" | "partidos">("todos")

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      // Buscar usuarios
      const usersResponse = await fetch(`/api/usuarios?search=${encodeURIComponent(searchQuery)}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      const allResults: SearchResult[] = []

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        const users = usersData.data || []
        users.forEach((u: any) => {
          allResults.push({
            id: u.id,
            tipo: "usuario",
            nombre: u.nombre,
            apellido: u.apellido,
            foto_perfil: u.fotoPerfil,
            posicion: u.posicion
          })
        })
      }

      // Buscar partidos
      const partidosResponse = await fetch(`/api/partidos?search=${encodeURIComponent(searchQuery)}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (partidosResponse.ok) {
        const partidosData = await partidosResponse.json()
        const partidos = partidosData.data || []
        partidos.forEach((p: any) => {
          allResults.push({
            id: p.id,
            tipo: "partido",
            tipo_partido: p.tipo_partido,
            fecha: p.fecha,
            hora: p.hora,
            nombre_ubicacion: p.nombre_ubicacion
          })
        })
      }

      setResults(allResults)
    } catch (error) {
      console.error("Error en búsqueda:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredResults = results.filter(r => {
    if (filter === "todos") return true
    if (filter === "usuarios") return r.tipo === "usuario"
    if (filter === "partidos") return r.tipo === "partido"
    return true
  })

  const handleResultClick = (result: SearchResult) => {
    if (result.tipo === "usuario") {
      router.push(`/users/${result.id}`)
    } else {
      router.push(`/matches/${result.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Buscar</h1>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar usuarios o partidos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-10 bg-gray-50 border-gray-200 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                setResults([])
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {["todos", "usuarios", "partidos"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 py-6 pb-24">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredResults.length === 0 && searchQuery ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron resultados</p>
          </div>
        ) : searchQuery === "" ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Escribe para buscar usuarios o partidos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((result) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {result.tipo === "usuario" ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {result.foto_perfil ? (
                        <img 
                          src={`data:image/jpeg;base64,${result.foto_perfil}`} 
                          className="w-12 h-12 rounded-full object-cover"
                          alt={result.nombre}
                        />
                      ) : (
                        <span className="text-gray-600 font-medium">
                          {result.nombre?.[0]}{result.apellido?.[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {result.nombre} {result.apellido}
                      </p>
                      {result.posicion && (
                        <p className="text-sm text-gray-500">{result.posicion}</p>
                      )}
                      <Badge className="bg-blue-100 text-blue-800 text-xs mt-1">
                        Usuario
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-orange-100 text-gray-800">
                        {result.tipo_partido}
                      </Badge>
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Partido
                      </Badge>
                    </div>
                    <p className="font-medium text-gray-900">
                      {result.fecha} {result.hora}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {result.nombre_ubicacion}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}