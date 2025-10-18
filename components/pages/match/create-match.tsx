"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Clock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AddressAutocomplete } from "@/components/google-maps/address-autocomplete"
import { AuthService } from "@/lib/auth"

// Tipo para google maps places
type PlaceResult = google.maps.places.PlaceResult

interface FormData {
  type: string
  gender: string
  date: string
  time: string
  location: string
  totalPlayers: number
  totalPrice: number
  description: string
  duration: number
}

export function CreateMatchScreen() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState<FormData>({
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

  const validateForm = (): string | null => {
    if (!formData.date) return "Debes seleccionar una fecha"
    if (!formData.time) return "Debes seleccionar una hora"
    if (!formData.location || formData.location.trim().length < 3) {
      return "Debes ingresar una ubicación válida"
    }
    if (formData.totalPlayers < 6 || formData.totalPlayers > 22) {
      return "La cantidad de jugadores debe estar entre 6 y 22"
    }
    if (formData.totalPrice < 0) {
      return "El precio no puede ser negativo"
    }
    
    // Validar que la fecha/hora sea futura
    const now = new Date()
    const matchDateTime = new Date(`${formData.date}T${formData.time}`)
    if (matchDateTime <= now) {
      return "La fecha y hora del partido deben ser futuras"
    }

    return null
  }

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar formulario
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const token = AuthService.getToken()
      const user = AuthService.getUser()
      
      if (!token || !user?.id) {
        router.push("/login")
        return
      }

      // Asegurar formato de hora correcto (HH:mm:ss)
      const horaFormateada = formData.time.includes(':') 
        ? (formData.time.split(':').length === 2 ? `${formData.time}:00` : formData.time)
        : `${formData.time}:00:00`;

      const matchData = {
        tipoPartido: formData.type,
        genero: formData.gender,
        fecha: formData.date,
        hora: horaFormateada,
        duracionMinutos: formData.duration,
        nombreUbicacion: formData.location,
        direccionUbicacion: formData.location,
        latitud: locationCoordinates?.lat || null,
        longitud: locationCoordinates?.lng || null,
        cantidadJugadores: formData.totalPlayers,
        precioTotal: formData.totalPrice,
        descripcion: formData.description || null,
        organizadorId: user.id,
      }

      console.log("[CreateMatch] Enviando datos:", matchData)

      const response = await fetch("/api/partidos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(matchData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Error al crear el partido")
      }

      const result = await response.json()
      console.log("[CreateMatch] Partido creado exitosamente:", result)
      
      // Redirigir a pantalla de éxito o al detalle del partido
      if (result.data?.id) {
        router.push(`/matches/${result.data.id}`)
      } else {
        router.push("/my-matches")
      }
    } catch (error) {
      console.error("Error creando partido:", error)
      setError(error instanceof Error ? error.message : "Error al crear el partido. Intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpiar error cuando el usuario hace cambios
    if (error) setError("")
  }

  const handleLocationChange = (address: string, placeDetails?: PlaceResult | null) => {
    console.log("[CreateMatch] Location changed:", { address, placeDetails })
    
    setFormData((prev) => ({ ...prev, location: address }))

    if (placeDetails?.geometry?.location) {
      let coordinates: { lat: number; lng: number }

      // Manejar tanto funciones como propiedades
      // Usamos una referencia 'any' para permitir llamar a lat()/lng() si son funciones
      const loc: any = placeDetails.geometry.location
      const lat = typeof loc.lat === "function" ? loc.lat() : Number(loc.lat)
      const lng = typeof loc.lng === "function" ? loc.lng() : Number(loc.lng)

      coordinates = { lat, lng }

      console.log("[CreateMatch] Coordinates set:", coordinates)
      setLocationCoordinates(coordinates)
    } else {
      // Si no hay coordenadas, usar null (ubicación aproximada)
      console.log("[CreateMatch] No coordinates available")
      setLocationCoordinates(null)
    }
  }

  const pricePerPlayer = formData.totalPlayers > 0 
    ? (formData.totalPrice / formData.totalPlayers).toFixed(0)
    : "0"

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2 touch-manipulation">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Crear Partido</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 pb-32">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-600 text-sm font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Tipo de partido */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Tipo de partido <span className="text-red-500">*</span>
          </label>
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
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Género <span className="text-red-500">*</span>
          </label>
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
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Fecha <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <Input
                type="date"
                value={formData.date}
                min={today}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="pl-10 py-3 rounded-xl border-gray-300"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Hora <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className="pl-10 py-3 rounded-xl border-gray-300"
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Ubicación <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
            <div className="pl-10">
              <AddressAutocomplete
                value={formData.location}
                onChange={handleLocationChange}
                placeholder="Ej: Polideportivo Norte, Montevideo"
                required
              />
            </div>
          </div>
          {formData.location && !locationCoordinates && (
            <p className="text-xs text-orange-600 mt-2 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Ubicación aproximada (sin coordenadas exactas)
            </p>
          )}
        </div>

        {/* Jugadores */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Cantidad de jugadores <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="number"
              min="6"
              max="22"
              value={formData.totalPlayers}
              onChange={(e) => handleInputChange("totalPlayers", parseInt(e.target.value) || 0)}
              className="pl-10 py-3 rounded-xl border-gray-300"
              required
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Entre 6 y 22 jugadores</p>
        </div>

        {/* Precio */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Precio total ($UYU) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="number"
              min="0"
              step="10"
              value={formData.totalPrice}
              onChange={(e) => handleInputChange("totalPrice", parseFloat(e.target.value) || 0)}
              className="pl-10 py-3 rounded-xl border-gray-300"
              required
              disabled={isLoading}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            ${pricePerPlayer} por jugador
          </p>
        </div>

        {/* Duración */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Duración (minutos)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="number"
              min="30"
              max="180"
              step="15"
              value={formData.duration}
              onChange={(e) => handleInputChange("duration", parseInt(e.target.value) || 90)}
              className="pl-10 py-3 rounded-xl border-gray-300"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Descripción (opcional)
          </label>
          <Textarea
            placeholder="Ej: Partido rápido en pista cubierta. Trae camiseta oscura y puntualidad."
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="py-3 rounded-xl border-gray-300 resize-none"
            rows={3}
            disabled={isLoading}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.description.length}/500 caracteres
          </p>
        </div>

        {/* Submit Button */}
        <div className="pb-8">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Creando partido...
              </span>
            ) : (
              "Crear Partido"
            )}
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