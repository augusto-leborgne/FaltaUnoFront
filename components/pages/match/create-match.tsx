"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Clock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AddressAutocomplete } from "@/components/google-maps/address-autocomplete"
import { AuthService } from "@/lib/auth"
import { PartidoAPI, mapFormDataToPartidoDTO, TipoPartido, NivelPartido, API_BASE } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { formatMatchType } from "@/lib/utils"

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
    description?: string
  }>({})

  // ✅ Inicializar con hora actual más cercana (siguiente intervalo de 5 minutos)
  const getInitialTime = () => {
    const now = new Date()
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 5) * 5
    const futureTime = new Date(now.getTime() + (roundedMinutes - minutes + 15) * 60000) // +15 min mínimo

    const hours = futureTime.getHours().toString().padStart(2, '0')
    const mins = (futureTime.getMinutes()).toString().padStart(2, '0')
    return `${hours}:${mins}`
  }

  const [formData, setFormData] = useState<FormData>({
    type: TipoPartido.FUTBOL_5,
    gender: "Mixto",
    date: "",
    time: getInitialTime(),
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
  // PERSISTENCIA DE FORMULARIO
  // ============================================

  // Cargar datos guardados al montar el componente
  useEffect(() => {
    try {
      const saved = localStorage.getItem('createMatchDraft')
      if (saved) {
        const draft = JSON.parse(saved)
        logger.log("[CreateMatch] Recuperando borrador guardado")
        setFormData(draft.formData)
        if (draft.coordinates) {
          setLocationCoordinates(draft.coordinates)
        }
      }
    } catch (error) {
      logger.error("[CreateMatch] Error cargando borrador:", error)
    }
  }, [])

  // Guardar datos cada vez que cambia el formulario
  useEffect(() => {
    // Solo guardar si hay algún dato relevante
    if (formData.location || formData.description || formData.date) {
      try {
        localStorage.setItem('createMatchDraft', JSON.stringify({
          formData,
          coordinates: locationCoordinates
        }))
      } catch (error) {
        logger.error("[CreateMatch] Error guardando borrador:", error)
      }
    }
  }, [formData, locationCoordinates])

  // Limpiar borrador al crear exitosamente
  const clearDraft = () => {
    try {
      localStorage.removeItem('createMatchDraft')
      logger.log("[CreateMatch] Borrador eliminado")
    } catch (error) {
      logger.error("[CreateMatch] Error eliminando borrador:", error)
    }
  }

  // ============================================
  // AUTO-CALCULAR CANTIDAD DE JUGADORES
  // ============================================

  useEffect(() => {
    // Auto-calcular cantidad de jugadores según el tipo de partido
    const playerCounts: Record<string, number> = {
      [TipoPartido.FUTBOL_5]: 10,
      [TipoPartido.FUTBOL_7]: 14,
      [TipoPartido.FUTBOL_8]: 16,
      [TipoPartido.FUTBOL_9]: 18,
      [TipoPartido.FUTBOL_11]: 22,
    }

    const newPlayerCount = playerCounts[formData.type] || 10

    if (formData.totalPlayers !== newPlayerCount) {
      logger.log(`[CreateMatch] Auto-ajustando jugadores: ${formData.type} → ${newPlayerCount} jugadores`)
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
        // ⚡ FIX: Use date-only comparison to avoid timezone offset issues
        const today = new Date().toISOString().split('T')[0]
        if (value < today) return "La fecha no puede ser en el pasado"

        // Máximo 1 año adelante
        const oneYearFromNow = new Date()
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
        const maxDate = oneYearFromNow.toISOString().split('T')[0]
        if (value > maxDate) return "La fecha no puede ser más de 1 año adelante"
        return null

      case "time":
        if (!value) return "Selecciona una hora"
        // Validar que sea hora futura si es hoy
        if (formData.date) {
          const dateTime = new Date(`${formData.date}T${value}`)
          const now = new Date()
          if (dateTime <= now) return "La hora debe ser futura"
        }
        return null

      case "location":
        // Validación manejada por AddressAutocomplete component
        return null

      case "totalPlayers":
        const players = Number(value)
        if (isNaN(players)) return "Ingresa un número válido"
        if (players < 6) return "Mínimo 6 jugadores"
        if (players > 22) return "Máximo 22 jugadores"
        return null

      case "totalPrice":
        const price = Number(value)
        if (isNaN(price)) return "Ingresa un costo válido"
        if (price < 0) return "El costo no puede ser negativo"
        if (price > 100000) return "El costo no puede superar $100,000"
        return null

      case "duration":
        const duration = Number(value)
        if (isNaN(duration)) return "Ingresa una duración válida"
        if (duration < 30) return "Duración mínima: 30 minutos"
        if (duration > 180) return "Duración máxima: 180 minutos"
        return null

      case "description":
        if (!value || value.trim() === "") return "La descripción es obligatoria"
        if (value.trim().length < 10) return "La descripción debe tener al menos 10 caracteres"
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

    // Validar que sea fecha y hora futuras (permitir hoy si la hora es futura)
    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`)
      const now = new Date()

      if (dateTime <= now) {
        return "La fecha y hora deben ser futuras (al menos 15 minutos adelante)"
      }
    } catch {
      return "Fecha u hora inválidas"
    }

    // Ubicación - validación manejada por AddressAutocomplete
    if (!formData.location) {
      return "Debes ingresar una ubicación"
    }

    // Jugadores
    if (formData.totalPlayers < 6 || formData.totalPlayers > 22) {
      return "La cantidad de jugadores debe estar entre 6 y 22"
    }

    // Costo
    if (formData.totalPrice < 0) {
      return "El costo no puede ser negativo"
    }

    // Duración
    if (formData.duration < 30 || formData.duration > 180) {
      return "La duración debe estar entre 30 y 180 minutos"
    }

    // Descripción
    if (!formData.description || formData.description.trim() === "") {
      return "Debes ingresar una descripción"
    }
    if (formData.description.trim().length < 10) {
      return "La descripción debe tener al menos 10 caracteres"
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
      logger.log("[CreateMatch] Iniciando creación de partido...")

      // ✅ Validar si el usuario tiene reviews pendientes
      logger.log("[CreateMatch] Verificando reviews pendientes...")
      const token = AuthService.getToken()
      const pendingReviewsResponse = await fetch(
        `${API_BASE}/api/usuarios/${user.id}/pending-reviews`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (pendingReviewsResponse.ok) {
        const reviewsData = await pendingReviewsResponse.json()
        const pendingReviews = Array.isArray(reviewsData.data) ? reviewsData.data : []

        if (pendingReviews.length > 0) {
          logger.warn("[CreateMatch] Usuario tiene reviews pendientes:", pendingReviews.length)
          setError(`Debes calificar a ${pendingReviews.length} jugador${pendingReviews.length > 1 ? 'es' : ''} antes de crear un partido`)
          setIsLoading(false)
          return
        }
      }

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

      logger.log("[CreateMatch] DTO preparado:", partidoDTO)

      // Llamar a la API
      const response = await PartidoAPI.crear(partidoDTO)

      logger.log("[CreateMatch] Respuesta de la API:", response)

      // El partido puede haber sido creado aunque response.success sea false
      // Verificar si tenemos un ID de partido
      const partidoId = response.data?.id || (response as any)?.id

      if (partidoId) {
        logger.log("[CreateMatch] Partido creado exitosamente con ID:", partidoId)
        setSuccess(true)
        clearDraft() // Limpiar borrador guardado
        logger.log("[CreateMatch] Redirigiendo a match-created con ID:", partidoId)
        setTimeout(() => router.push(`/match-created?matchId=${partidoId}`), 1000)
      } else if (!response.success) {
        throw new Error(response.message || "Error al crear el partido")
      } else {
        logger.warn("[CreateMatch] Partido creado pero sin ID, redirigiendo a my-matches")
        setSuccess(true)
        clearDraft() // Limpiar borrador guardado
        setTimeout(() => router.push("/my-matches"), 1000)
      }

    } catch (err) {
      logger.error("[CreateMatch] Error:", err)
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
    logger.log("[CreateMatch] Ubicación cambiada:", { address, placeDetails })

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
      logger.log("[CreateMatch] Coordenadas establecidas:", { lat, lng })
    } else {
      setLocationCoordinates(null)
      logger.log("[CreateMatch] Sin coordenadas disponibles")
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

  // Fecha máxima: 1 año adelante
  const oneYearFromNow = new Date()
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
  const maxDate = oneYearFromNow.toISOString().split('T')[0]

  // Generar opciones de hora cada 5 minutos
  const generateTimeOptions = () => {
    const options: string[] = []
    const now = new Date()
    const isToday = formData.date === today

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const hourStr = hour.toString().padStart(2, '0')
        const minuteStr = minute.toString().padStart(2, '0')
        const timeStr = `${hourStr}:${minuteStr}`

        // Si es hoy, solo mostrar horas futuras (con al menos 15 minutos de margen)
        if (isToday) {
          const timeDate = new Date(`${formData.date}T${timeStr}`)
          const minTime = new Date(now.getTime() + 15 * 60000) // +15 minutos
          if (timeDate < minTime) continue
        }

        options.push(timeStr)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-white flex flex-col safe-bottom">
      {/* Header */}
      <div className="w-full pt-6 xs:pt-8 sm:pt-10 md:pt-12 pb-3 sm:pb-4 md:pb-5 px-3 sm:px-4 md:px-6 border-b border-gray-100 bg-white safe-top">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 xs:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg xs:rounded-xl transition-colors touch-manipulation min-w-[40px] xs:min-w-[44px] sm:min-w-[48px] min-h-[40px] xs:min-h-[44px] sm:min-h-[48px] flex items-center justify-center active:scale-95 flex-shrink-0"
              disabled={isLoading}
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Crear Partido</h1>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-2 xs:px-3 sm:px-4 py-2 xs:py-3 sm:py-5 pb-16 xs:pb-18 xs:pb-20 sm:pb-22 md:pb-24 overflow-y-auto max-w-2xl mx-auto w-full">
        {/* Success Message */}
        {success && (
          <div className="mb-3 xs:mb-4 sm:mb-5 md:mb-6 p-3 xs:p-4 sm:p-5 bg-primary/10 border-2 border-primary/30 rounded-xl sm:rounded-2xl flex items-start space-x-2 xs:space-x-3">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-primary text-sm sm:text-base font-semibold">¡Partido creado!</p>
              <p className="text-primary/80 text-sm">Redirigiendo...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-5 sm:mb-6 p-4 sm:p-5 bg-red-50 border-2 border-red-200 rounded-xl sm:rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-sm sm:text-base font-semibold">Error</p>
              <p className="text-red-600 text-sm sm:text-base">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700 min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation active:scale-95"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tipo de partido */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Tipo de partido <span className="text-red-500">*</span>
          </label>
          <div className="flex justify-start gap-3">
            {Object.values(TipoPartido).map((type) => {
              const shortLabel = type === TipoPartido.FUTBOL_5 ? 'F5' 
                : type === TipoPartido.FUTBOL_7 ? 'F7'
                : type === TipoPartido.FUTBOL_8 ? 'F8'
                : 'F11'
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleInputChange("type", type)}
                  disabled={isLoading}
                  className={`w-14 h-14 rounded-full text-base font-bold border-2 transition-all touch-manipulation disabled:opacity-50 active:scale-95 flex items-center justify-center shadow-sm hover:shadow-md ${formData.type === type
                    ? "bg-gradient-to-br from-green-500 to-green-600 text-white border-green-600 shadow-lg ring-2 ring-green-200"
                    : "bg-white text-gray-700 border-gray-200 hover:border-green-500 hover:bg-green-50"
                    }`}
                  aria-label={`Tipo ${shortLabel}`}
                >
                  {shortLabel}
                </button>
              )
            })}
          </div>
        </div>

        {/* Género */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Género <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2.5">
            {[{label: "Mixto", icon: "👥"}, {label: "Hombres", icon: "👨"}, {label: "Mujeres", icon: "👩"}].map(({label, icon}) => (
              <button
                key={label}
                type="button"
                onClick={() => handleInputChange("gender", label)}
                disabled={isLoading}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all touch-manipulation disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm hover:shadow-md min-h-[48px] ${formData.gender === label
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-600 shadow-lg ring-2 ring-orange-200"
                  : "bg-white text-gray-700 border-gray-200 hover:border-orange-500 hover:bg-orange-50"
                  }`}
                aria-label={`Género ${label}`}
              >
                <span className="text-lg">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className="grid grid-cols-2 gap-1.5 xs:gap-2 sm:gap-3 mb-1.5 xs:mb-2 sm:mb-3 md:mb-4">
          <div className="w-full min-w-0">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Fecha <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                min={today}
                max={maxDate}
                className={`pl-11 pr-3 h-12 text-sm text-center rounded-xl border-2 w-full ${fieldErrors.date ? 'border-red-500' : 'border-gray-200'} focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 shadow-sm hover:shadow-md transition-shadow`}
                required
                disabled={isLoading}
              />
            </div>
            {fieldErrors.date && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate">{fieldErrors.date}</span>
              </p>
            )}
          </div>
          <div className="w-full min-w-0">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Hora <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <select
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className={`w-full pl-11 pr-8 h-12 rounded-xl border-2 ${fieldErrors.time ? 'border-red-500' : 'border-gray-200'} bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation shadow-sm hover:shadow-md transition-shadow appearance-none`}
                required
                disabled={isLoading}
              >
                <option value="">Seleccionar</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {fieldErrors.time && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate">{fieldErrors.time}</span>
              </p>
            )}
          </div>
        </div>

        {/* Ubicación */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Ubicación <span className="text-red-500">*</span>
          </label>
          <AddressAutocomplete
            value={formData.location}
            onChange={handleLocationChange}
            placeholder="Ej: Polideportivo Norte, Montevideo"
            required
            disabled={isLoading}
            hasError={!!fieldErrors.location}
          />
          {fieldErrors.location && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              {fieldErrors.location}
            </p>
          )}
          {formData.location && !locationCoordinates && !fieldErrors.location && (
            <p className="text-xs text-orange-600 mt-1.5 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              Ubicación aproximada (sin coordenadas exactas)
            </p>
          )}
        </div>

        {/* Costo */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Costo del partido ($UYU) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
            <Input
              type="number"
              min="0"
              max="1000000"
              step="10"
              value={formData.totalPrice}
              onChange={(e) => handleInputChange("totalPrice", e.target.value === "" ? 0 : parseFloat(e.target.value))}
              placeholder="Ingresa 0 si es gratis"
              className={`pl-11 pr-4 h-12 text-sm rounded-xl border-2 w-full ${fieldErrors.totalPrice ? 'border-red-500' : 'border-gray-200'} focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm hover:shadow-md transition-shadow`}
              required
              disabled={isLoading}
            />
          </div>
          {fieldErrors.totalPrice && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              {fieldErrors.totalPrice}
            </p>
          )}
          {formData.totalPrice > 0 && (
            <p className="text-sm text-green-600 mt-2 font-semibold">
              💰 ${pricePerPlayer} por jugador
            </p>
          )}
        </div>

        {/* Duración */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Duración (minutos) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
            <select
              value={formData.duration || 60}
              onChange={(e) => handleInputChange("duration", parseInt(e.target.value))}
              className={`w-full pl-11 pr-8 h-12 rounded-xl border-2 ${fieldErrors.duration ? 'border-red-500' : 'border-gray-200'} bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation shadow-sm hover:shadow-md transition-shadow appearance-none`}
              disabled={isLoading}
            >
              <option value={60}>60 minutos</option>
              <option value={90}>90 minutos</option>
              <option value={120}>120 minutos</option>
              <option value={150}>150 minutos</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {fieldErrors.duration && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              {fieldErrors.duration}
            </p>
          )}
        </div>

        {/* Descripción */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Descripción <span className="text-red-500">*</span>
          </label>
          <Textarea
            placeholder="Describe la modalidad del partido (ej: 2 tiempos de 30 min), detalles de la cancha (ubicación exacta, superficie, vestuarios, estacionamiento, etc.)"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className={`min-h-[120px] py-3 px-4 rounded-xl resize-none text-sm border-2 w-full ${fieldErrors.description ? 'border-red-500' : 'border-gray-200'} focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm hover:shadow-md transition-shadow`}
            rows={5}
            disabled={isLoading}
            maxLength={500}
            required
          />
          {fieldErrors.description && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              {fieldErrors.description}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1.5 font-medium">
            {formData.description.length}/500 caracteres
          </p>

          {/* Disclaimer sobre reservas */}
          <div className="mt-4 p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-xl shadow-sm">
            <p className="text-xs text-orange-900 flex items-start leading-relaxed">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                <strong className="font-bold">Importante:</strong> Falta Uno no gestiona reservas de canchas. Es responsabilidad del organizador coordinar y pagar la reserva de la cancha.
              </span>
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pb-4">
          <Button
            type="submit"
            disabled={
              isLoading ||
              success ||
              !formData.date ||
              !formData.time ||
              !formData.location
            }
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 text-white h-14 text-base font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl touch-manipulation active:scale-[0.98] ring-2 ring-green-200 hover:ring-green-300"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="sm" variant="white" className="mr-2" />
                Creando partido...
              </span>
            ) : success ? (
              <span className="flex items-center justify-center">
                ✓ Partido creado
              </span>
            ) : (
              "⚽ Crear Partido"
            )}
          </Button>
          <p className="text-center text-sm text-gray-500 mt-3 px-4">
            Tu partido será visible para otros jugadores
          </p>
        </div>
      </form>

      <BottomNavigation />
    </div>
  )
}