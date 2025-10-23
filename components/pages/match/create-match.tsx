"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Clock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AddressAutocomplete } from "@/components/google-maps/address-autocomplete"
import { AuthService } from "@/lib/auth"
import { PartidoAPI, mapFormDataToPartidoDTO, TipoPartido, NivelPartido } from "@/lib/api"

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
  const [success, setSuccess] = useState(false)
  
  // ✅ NUEVO: Errores por campo para validación en tiempo real
  const [fieldErrors, setFieldErrors] = useState<{
    date?: string
    time?: string
    location?: string
    totalPlayers?: string
    totalPrice?: string
    duration?: string
  }>({})

  const [formData, setFormData] = useState<FormData>({
    type: TipoPartido.FUTBOL_5,
    gender: "Mixto",
    date: "",
    time: "",
    location: "",
    totalPlayers: 10,
    totalPrice: 0,
    description: "",
    duration: 60,
  })

  const [locationCoordinates, setLocationCoordinates] = useState<{
    lat: number
    lng: number
  } | null>(null)

  // ============================================
  // AUTO-CALCULAR CANTIDAD DE JUGADORES
  // ============================================
  
  useEffect(() => {
    // Auto-calcular cantidad de jugadores según el tipo de partido
    const playerCounts: Record<string, number> = {
      [TipoPartido.FUTBOL_5]: 10,
      [TipoPartido.FUTBOL_7]: 14,
      [TipoPartido.FUTBOL_11]: 22,
    }
    
    const newPlayerCount = playerCounts[formData.type] || 10
    
    if (formData.totalPlayers !== newPlayerCount) {
      console.log(`[CreateMatch] Auto-ajustando jugadores: ${formData.type} → ${newPlayerCount} jugadores`)
      setFormData((prev) => ({ ...prev, totalPlayers: newPlayerCount }))
      
      // Limpiar error de validación si existe
      setFieldErrors((prev) => ({
        ...prev,
        totalPlayers: undefined
      }))
    }
  }, [formData.type])

  // ============================================
  // VALIDACIÓN
  // ============================================

  // ✅ NUEVO: Validación individual de campos
  const validateField = (field: keyof FormData, value: any): string | null => {
    switch (field) {
      case "date":
        if (!value) return "Selecciona una fecha"
        const selectedDate = new Date(value + "T00:00:00")
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (selectedDate < today) return "La fecha no puede ser en el pasado"
        return null

      case "time":
        if (!value) return "Selecciona una hora"
        if (formData.date) {
          const dateTime = new Date(`${formData.date}T${value}`)
          const now = new Date()
          if (dateTime <= now) return "La fecha y hora deben ser futuras"
        }
        return null

      case "location":
        if (!value || value.trim().length < 3) return "Ingresa una ubicación válida (mín. 3 caracteres)"
        return null

      case "totalPlayers":
        const players = Number(value)
        if (isNaN(players)) return "Ingresa un número válido"
        if (players < 6) return "Mínimo 6 jugadores"
        if (players > 22) return "Máximo 22 jugadores"
        return null

      case "totalPrice":
        const price = Number(value)
        if (isNaN(price)) return "Ingresa un precio válido"
        if (price < 0) return "El precio no puede ser negativo"
        return null

      case "duration":
        const duration = Number(value)
        if (isNaN(duration)) return "Ingresa una duración válida"
        if (duration < 30) return "Duración mínima: 30 minutos"
        if (duration > 180) return "Duración máxima: 180 minutos"
        return null

      default:
        return null
    }
  }

  const validateForm = (): string | null => {
    // Fecha
    if (!formData.date) {
      return "Debes seleccionar una fecha"
    }

    // Hora
    if (!formData.time) {
      return "Debes seleccionar una hora"
    }

    // Validar que sea fecha y hora futuras
    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`)
      const now = new Date()

      if (dateTime <= now) {
        return "La fecha y hora deben ser futuras"
      }
    } catch {
      return "Fecha u hora inválidas"
    }

    // Ubicación
    if (!formData.location || formData.location.trim().length < 3) {
      return "Debes ingresar una ubicación válida"
    }

    // Jugadores
    if (formData.totalPlayers < 6 || formData.totalPlayers > 22) {
      return "La cantidad de jugadores debe estar entre 6 y 22"
    }

    // Precio
    if (formData.totalPrice < 0) {
      return "El precio no puede ser negativo"
    }

    // Duración
    if (formData.duration < 30 || formData.duration > 180) {
      return "La duración debe estar entre 30 y 180 minutos"
    }

    return null
  }

  // ============================================
  // HANDLERS
  // ============================================

  const handleBack = () => {
    if (isLoading) return
    router.back()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar formulario
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    // Validar autenticación
    if (!AuthService.isLoggedIn()) {
      router.push("/login")
      return
    }

    const user = AuthService.getUser()
    if (!user?.id) {
      setError("Usuario no encontrado. Por favor inicia sesión nuevamente.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("[CreateMatch] Iniciando creación de partido...")

      // Mapear datos del formulario al DTO
      const partidoDTO = mapFormDataToPartidoDTO({
        type: formData.type,
        gender: formData.gender,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        totalPlayers: formData.totalPlayers,
        totalPrice: formData.totalPrice,
        description: formData.description,
        duration: formData.duration,
        locationCoordinates,
        organizadorId: user.id
      })

      console.log("[CreateMatch] DTO preparado:", partidoDTO)

      // Llamar a la API
      const response = await PartidoAPI.crear(partidoDTO)

      if (!response.success) {
        throw new Error(response.message || "Error al crear el partido")
      }

      console.log("[CreateMatch] Partido creado exitosamente:", response.data)

      setSuccess(true)

      // Redirigir a la pantalla de éxito para invitar amigos
      const partidoId = response.data.id
      if (partidoId) {
        setTimeout(() => router.push(`/match-created?matchId=${partidoId}`), 1000)
      } else {
        setTimeout(() => router.push("/my-matches"), 1000)
      }

    } catch (err) {
      console.error("[CreateMatch] Error:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al crear el partido"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // ✅ Validar campo en tiempo real
    const fieldError = validateField(field, value)
    setFieldErrors((prev) => ({
      ...prev,
      [field]: fieldError || undefined
    }))
    
    if (error) setError("")
  }

  const handleLocationChange = (address: string, placeDetails?: PlaceResult | null) => {
    console.log("[CreateMatch] Ubicación cambiada:", { address, placeDetails })
    
    setFormData((prev) => ({ ...prev, location: address }))
    
    // ✅ Validar ubicación en tiempo real
    const locationError = validateField("location", address)
    setFieldErrors((prev) => ({
      ...prev,
      location: locationError || undefined
    }))

    if (placeDetails?.geometry?.location) {
      const loc: any = placeDetails.geometry.location
      const lat = typeof loc.lat === "function" ? loc.lat() : Number(loc.lat)
      const lng = typeof loc.lng === "function" ? loc.lng() : Number(loc.lng)

      setLocationCoordinates({ lat, lng })
      console.log("[CreateMatch] Coordenadas establecidas:", { lat, lng })
    } else {
      setLocationCoordinates(null)
      console.log("[CreateMatch] Sin coordenadas disponibles")
    }
  }

  // ============================================
  // CÁLCULOS
  // ============================================

  const pricePerPlayer = formData.totalPlayers > 0 
    ? (formData.totalPrice / formData.totalPlayers).toFixed(0)
    : "0"

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0]

  // Generar opciones de hora cada 5 minutos
  const generateTimeOptions = () => {
    const options: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const hourStr = hour.toString().padStart(2, '0')
        const minuteStr = minute.toString().padStart(2, '0')
        options.push(`${hourStr}:${minuteStr}`)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleBack} 
            className="p-2 -ml-2 touch-manipulation hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Crear Partido</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 pb-32 overflow-y-auto">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-green-600 text-sm font-medium">¡Partido creado!</p>
              <p className="text-green-600 text-sm">Redirigiendo...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-sm font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button 
              type="button"
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tipo de partido */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Tipo de partido <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3 flex-wrap">
            {Object.values(TipoPartido).map((type) => (
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
                onChange={(e) => handleInputChange("date", e.target.value)}
                min={today}
                className={`pl-10 py-3 rounded-xl ${fieldErrors.date ? 'border-red-500' : 'border-gray-300'}`}
                required
                disabled={isLoading}
              />
            </div>
            {fieldErrors.date && (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {fieldErrors.date}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Hora <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <select
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${fieldErrors.time ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
                required
                disabled={isLoading}
              >
                <option value="">Seleccionar hora</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.time && (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {fieldErrors.time}
              </p>
            )}
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
                disabled={isLoading}
              />
            </div>
          </div>
          {fieldErrors.location && (
            <p className="text-xs text-red-600 mt-1 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {fieldErrors.location}
            </p>
          )}
          {formData.location && !locationCoordinates && !fieldErrors.location && (
            <p className="text-xs text-orange-600 mt-2 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Ubicación aproximada (sin coordenadas exactas)
            </p>
          )}
          {formData.location && locationCoordinates && (
            <p className="text-xs text-green-600 mt-2 flex items-center">
              ✓ Ubicación con coordenadas precisas
            </p>
          )}
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
              value={formData.totalPrice === 0 ? "" : formData.totalPrice}
              onChange={(e) => handleInputChange("totalPrice", e.target.value === "" ? 0 : parseFloat(e.target.value))}
              placeholder="0"
              className={`pl-10 py-3 rounded-xl ${fieldErrors.totalPrice ? 'border-red-500' : 'border-gray-300'}`}
              required
              disabled={isLoading}
            />
          </div>
          {fieldErrors.totalPrice && (
            <p className="text-xs text-red-600 mt-1 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {fieldErrors.totalPrice}
            </p>
          )}
          {formData.totalPrice > 0 && (
            <p className="text-sm text-gray-600 mt-2 font-medium">
              ${pricePerPlayer} por jugador
            </p>
          )}
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
              value={formData.duration === 0 ? "" : formData.duration}
              onChange={(e) => handleInputChange("duration", e.target.value === "" ? 60 : parseInt(e.target.value))}
              placeholder="60"
              className={`pl-10 py-3 rounded-xl ${fieldErrors.duration ? 'border-red-500' : 'border-gray-300'}`}
              disabled={isLoading}
            />
          </div>
          {fieldErrors.duration ? (
            <p className="text-xs text-red-600 mt-1 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {fieldErrors.duration}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Entre 30 y 180 minutos (default: 60)</p>
          )}
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
            disabled={
              isLoading || 
              success || 
              !formData.date ||
              !formData.time ||
              !formData.location
            }
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Creando partido...
              </span>
            ) : success ? (
              <span className="flex items-center justify-center">
                ✓ Partido creado
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