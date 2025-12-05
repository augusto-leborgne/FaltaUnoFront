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
      <div className="pt-8 xs:pt-10 sm:pt-12 md:pt-16 pb-3 xs:pb-4 sm:pb-6 px-3 xs:px-4 sm:px-6 border-b border-gray-100 safe-top">
        <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4">
          <button
            onClick={handleBack}
            className="p-2 xs:p-2.5 -ml-2 touch-manipulation hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
            disabled={isLoading}
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
          <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Crear Partido</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-6 pb-24 xs:pb-28 sm:pb-32 overflow-y-auto max-w-2xl mx-auto w-full">
        {/* Success Message */}
        {success && (
          <div className="mb-4 xs:mb-5 sm:mb-6 p-3 xs:p-4 sm:p-5 bg-primary/10 border-2 border-primary/30 rounded-xl sm:rounded-2xl flex items-start space-x-2 xs:space-x-3">
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
        <div className="mb-4 xs:mb-5 sm:mb-6">
          <label className="block font-sans text-xs xs:text-sm sm:text-base md:text-sm font-semibold text-gray-900 mb-2 xs:mb-3 sm:mb-4 md:mb-3">
            Tipo de partido <span className="text-red-500">*</span>
          </label>
          <div className="flex justify-center gap-2 xs:gap-3 sm:gap-4">
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
                  className={`font-sans w-12 h-12 xs:w-13 xs:h-13 sm:w-14 sm:h-14 md:w-13 md:h-13 rounded-full text-sm xs:text-base sm:text-lg md:text-base font-bold border-2 transition-all touch-manipulation disabled:opacity-50 active:scale-95 flex items-center justify-center min-w-[48px] min-h-[48px] ${formData.type === type
                    ? "bg-green-600 text-white border-green-600 shadow-lg"
                    : "bg-white text-gray-700 border-gray-300 hover:border-green-600 hover:text-green-600 active:bg-gray-50"
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
        <div className="mb-4 xs:mb-5 sm:mb-6">
          <label className="block font-sans text-xs xs:text-sm sm:text-base md:text-sm font-semibold text-gray-900 mb-2 xs:mb-3 sm:mb-4 md:mb-3">
            Género <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 xs:gap-2.5 sm:gap-3">
            {[{label: "Mixto", icon: "👥"}, {label: "Hombres", icon: "👨"}, {label: "Mujeres", icon: "👩"}].map(({label, icon}) => (
              <button
                key={label}
                type="button"
                onClick={() => handleInputChange("gender", label)}
                disabled={isLoading}
                className={`font-sans flex-1 px-1.5 xs:px-2 sm:px-3 md:px-2 py-2 rounded-lg xs:rounded-xl text-xs xs:text-sm sm:text-base md:text-sm font-semibold border-2 transition-all touch-manipulation disabled:opacity-50 min-h-[48px] active:scale-95 flex flex-col items-center justify-center gap-0.5 ${formData.gender === label
                  ? "bg-orange-500 text-white border-orange-600 shadow-lg"
                  : "bg-white text-gray-700 border-gray-300 hover:border-orange-500 hover:text-orange-600 active:bg-gray-50"
                  }`}
                aria-label={`Género ${label}`}
              >
                <span className="text-sm xs:text-base sm:text-lg">{icon}</span>
                <span className="text-[10px] xs:text-[11px] sm:text-xs leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className="grid grid-cols-2 gap-2 xs:gap-3 sm:gap-4 mb-4 xs:mb-5 sm:mb-6">
          <div className="w-full min-w-0">
            <label className="block font-sans text-xs xs:text-sm sm:text-base md:text-sm font-semibold text-gray-900 mb-1.5 xs:mb-2 sm:mb-3 md:mb-2">
              Fecha <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange("date", e.target.value)}
              min={today}
              max={maxDate}
              className={`font-sans px-3 xs:px-4 min-h-[48px] text-sm xs:text-base rounded-lg xs:rounded-xl border-2 w-full ${fieldErrors.date ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:opacity-50`}
              required
              disabled={isLoading}
              placeholder="dd/mm/yyyy"
            />
            {!fieldErrors.date && !formData.date && (
              <p className="font-sans text-[10px] xs:text-xs text-gray-500 mt-1">Formato: dd/mm/yyyy</p>
            )}
            {fieldErrors.date && (
              <p className="font-sans text-[10px] xs:text-xs sm:text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 xs:w-3.5 xs:h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate">{fieldErrors.date}</span>
              </p>
            )}
          </div>
          <div className="w-full min-w-0">
            <label className="block font-sans text-xs xs:text-sm sm:text-base md:text-sm font-semibold text-gray-900 mb-1.5 xs:mb-2 sm:mb-3 md:mb-2">
              Hora <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Clock className="absolute left-2 xs:left-3 sm:left-4 w-4 h-4 xs:w-5 xs:h-5 text-gray-400 pointer-events-none z-10" />
              <select
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className={`font-sans w-full pl-9 xs:pl-10 sm:pl-12 pr-3 xs:pr-4 min-h-[48px] rounded-lg xs:rounded-xl border-2 ${fieldErrors.time ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 text-sm xs:text-base font-medium focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center`}
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
            </div>
            {fieldErrors.time && (
              <p className="font-sans text-[10px] xs:text-xs sm:text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 xs:w-3.5 xs:h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate">{fieldErrors.time}</span>
              </p>
            )}
          </div>
        </div>

        {/* Ubicación */}
        <div className="mb-5 sm:mb-6">
          <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
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
            <p className="text-xs sm:text-sm text-red-600 mt-2 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              {fieldErrors.location}
            </p>
          )}
          {formData.location && !locationCoordinates && !fieldErrors.location && (
            <p className="text-xs sm:text-sm text-orange-600 mt-2 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              Ubicación aproximada (sin coordenadas exactas)
            </p>
          )}
        </div>

        {/* Costo */}
        <div className="mb-5 sm:mb-6">
          <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
            Costo del partido ($UYU) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              type="number"
              min="0"
              max="1000000"
              step="10"
              value={formData.totalPrice}
              onChange={(e) => handleInputChange("totalPrice", e.target.value === "" ? 0 : parseFloat(e.target.value))}
              placeholder="Ingresa 0 si es gratis"
              className={`pl-11 sm:pl-12 min-h-[52px] text-base rounded-xl border-2 w-full ${fieldErrors.totalPrice ? 'border-red-500' : 'border-gray-300'}`}
              required
              disabled={isLoading}
            />
          </div>
          {fieldErrors.totalPrice && (
            <p className="text-xs sm:text-sm text-red-600 mt-1.5 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              {fieldErrors.totalPrice}
            </p>
          )}
          {formData.totalPrice > 0 && (
            <p className="text-sm sm:text-base text-gray-600 mt-2 font-semibold">
              ${pricePerPlayer} por jugador
            </p>
          )}
        </div>

        {/* Duración */}
        <div className="mb-5 sm:mb-6">
          <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
            Duración (minutos)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
            <select
              value={formData.duration || 60}
              onChange={(e) => handleInputChange("duration", parseInt(e.target.value))}
              className={`w-full pl-11 sm:pl-12 pr-4 min-h-[52px] rounded-xl border-2 ${fieldErrors.duration ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 text-base font-medium focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`}
              disabled={isLoading}
            >
              <option value={60}>60 minutos</option>
              <option value={90}>90 minutos</option>
              <option value={120}>120 minutos</option>
              <option value={150}>150 minutos</option>
            </select>
          </div>
          {fieldErrors.duration && (
            <p className="text-xs sm:text-sm text-red-600 mt-1.5 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              {fieldErrors.duration}
            </p>
          )}
        </div>

        {/* Descripción */}
        <div className="mb-6 sm:mb-8">
          <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
            Descripción <span className="text-red-500">*</span>
          </label>
          <Textarea
            placeholder="Describe la modalidad del partido (ej: 2 tiempos de 30 min), detalles de la cancha (ubicación exacta, superficie, vestuarios, estacionamiento, etc.)"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className={`min-h-[120px] py-3 sm:py-4 px-4 rounded-xl sm:rounded-2xl resize-none text-base border-2 w-full ${fieldErrors.description ? 'border-red-500' : 'border-gray-300'}`}
            rows={4}
            disabled={isLoading}
            maxLength={500}
            required
          />
          {fieldErrors.description && (
            <p className="text-xs sm:text-sm text-red-600 mt-1.5 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              {fieldErrors.description}
            </p>
          )}
          <p className="text-xs sm:text-sm text-gray-500 mt-1.5 font-medium">
            {formData.description.length}/500 caracteres
          </p>

          {/* Disclaimer sobre reservas */}
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
            <p className="text-xs sm:text-sm text-orange-800 flex items-start leading-relaxed">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                <strong className="font-semibold">Importante:</strong> Falta Uno no gestiona reservas de canchas. Es responsabilidad del organizador coordinar y pagar la reserva de la cancha.
              </span>
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pb-6 sm:pb-8">
          <Button
            type="submit"
            disabled={
              isLoading ||
              success ||
              !formData.date ||
              !formData.time ||
              !formData.location
            }
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white min-h-[56px] text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl touch-manipulation active:scale-[0.98]"
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
              "Crear Partido"
            )}
          </Button>
          <p className="text-center text-sm sm:text-base text-gray-500 mt-3 sm:mt-4 px-4">
            Tu partido será visible para otros jugadores
          </p>
        </div>
      </form>

      <BottomNavigation />
    </div>
  )
}