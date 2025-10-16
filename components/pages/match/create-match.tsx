"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { ArrowLeft, MapPin, Calendar, Users, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import { AddressAutocomplete } from "@/components/google-maps/address-autocomplete"
import { AuthService } from "@/lib/auth"
import type { google } from "google-maps"

export function CreateMatchScreen() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    type: "FUTBOL_5",
    gender: "Mixto",
    date: "",
    time: "",
    location: "",
    totalPlayers: 10,
    totalPrice: 800,
    description: "",
    duration: 90,
  })

  const [locationCoordinates, setLocationCoordinates] = useState<{
    lat: number
    lng: number
  } | null>(null)

  const handleBack = () => router.back()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const token = AuthService.getToken()
      const user = AuthService.getUser()
      
      if (!token || !user?.id) {
        router.push("/login")
        return
      }

      const matchData = {
        tipoPartido: formData.type,
        genero: formData.gender,
        fecha: formData.date,
        hora: formData.time,
        duracionMinutos: formData.duration,
        nombreUbicacion: formData.location,
        direccionUbicacion: formData.location,
        latitud: locationCoordinates?.lat || null,
        longitud: locationCoordinates?.lng || null,
        cantidadJugadores: formData.totalPlayers,
        precioTotal: formData.totalPrice,
        descripcion: formData.description,
        organizadorId: user.id,
      }

      const response = await fetch("/api/partidos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(matchData)
      })

      if (!response.ok) {
        throw new Error("Error al crear el partido")
      }

      const result = await response.json()
      
      // Redirigir a pantalla de éxito
      router.push(`/match-created?id=${result.id}`)
    } catch (error) {
      console.error("Error creando partido:", error)
      setError("Error al crear el partido. Intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleLocationChange = (address: string, placeDetails?: google.maps.places.PlaceResult | null) => {
    setFormData((prev) => ({ ...prev, location: address }))

    if (placeDetails?.geometry?.location) {
      let coordinates: { lat: number; lng: number }

      if (typeof placeDetails.geometry.location.lat === "function") {
        coordinates = {
          lat: placeDetails.geometry.location.lat(),
          lng: placeDetails.geometry.location.lng(),
        }
      } else {
        coordinates = {
          lat: placeDetails.geometry.location.lat,
          lng: placeDetails.geometry.location.lng,
        }
      }

      setLocationCoordinates(coordinates)
    }
  }

  const pricePerPlayer = formData.totalPrice / formData.totalPlayers

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2 touch-manipulation">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Crear Partido</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Tipo de partido */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">Tipo de partido</label>
          <div className="flex gap-3 flex-wrap">
            {["FUTBOL_5", "FUTBOL_7", "FUTBOL_8", "FUTBOL_9", "FUTBOL_11"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleInputChange("type", type)}
                disabled={isLoading}
                className={`px-4 py-3 rounded-full text-sm font-medium border transition-colors touch-manipulation disabled:opacity-50 ${
                  formData.type === type
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {type.replace("FUTBOL_", "F")}
              </button>
            ))}
          </div>
        </div>

        {/* Género */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">Género</label>
          <div className="flex gap-3">
            {["Mixto", "Hombres", "Mujeres"].map((gender) => (
              <button
                key={gender}
                type="button"
                onClick={() => handleInputChange("gender", gender)}
                disabled={isLoading}
                className={`px-4 py-3 rounded-full text-sm font-medium border transition-colors touch-manipulation disabled:opacity-50 ${
                  formData.gender === gender
                    ? "bg-orange-200 text-gray-900 border-orange-200"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Fecha</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="pl-10 py-3 rounded-xl border-gray-300"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Hora</label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => handleInputChange("time", e.target.value)}
              className="py-3 rounded-xl border-gray-300"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Ubicación */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Ubicación</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            <div className="pl-10">
              <AddressAutocomplete
                value={formData.location}
                onChange={handleLocationChange}
                placeholder="Ej: Polideportivo Norte, Montevideo"
                required
              />
            </div>
          </div>
        </div>

        {/* Jugadores */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Cantidad de jugadores</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="number"
              min="6"
              max="22"
              value={formData.totalPlayers}
              onChange={(e) => handleInputChange("totalPlayers", Number.parseInt(e.target.value))}
              className="pl-10 py-3 rounded-xl border-gray-300"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Precio */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Precio total ($UYU)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="number"
              min="0"
              step="1"
              value={formData.totalPrice}
              onChange={(e) => handleInputChange("totalPrice", Number.parseFloat(e.target.value))}
              className="pl-10 py-3 rounded-xl border-gray-300"
              required
              disabled={isLoading}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">${pricePerPlayer.toFixed(2)} por jugador</p>
        </div>

        {/* Descripción */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-900 mb-2">Descripción (opcional)</label>
          <Textarea
            placeholder="Ej: Partido rápido en pista cubierta. Trae camiseta oscura y puntualidad."
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="py-3 rounded-xl border-gray-300 resize-none"
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <div className="pb-24">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50"
          >
            {isLoading ? "Creando partido..." : "Crear Partido"}
          </Button>
          <p className="text-center text-sm text-gray-500 mt-3">
            Tu partido será visible para otros jugadores
          </p>
        </div>
      </form>

      <BottomNavigation />
    </div>
  )
}