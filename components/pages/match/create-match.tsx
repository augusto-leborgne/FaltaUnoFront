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
      <div className="w-full pt-2.5 xs:pt-3 sm:pt-4 md:pt-6 pb-2 xs:pb-2.5 sm:pb-3 md:pb-3.5 px-2.5 xs:px-3 sm:px-4 md:px-5 border-b border-gray-100 bg-white safe-top">
        <div className="flex items-center justify-between gap-2 xs:gap-3">
          <div className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 xs:p-2.5 sm:p-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg xs:rounded-xl transition-colors touch-manipulation min-w-[40px] xs:min-w-[44px] min-h-[40px] xs:min-h-[44px] flex items-center justify-center active:scale-95 flex-shrink-0"
              disabled={isLoading}
              aria-label="Volver"
            >
              <ArrowLeft className="w-4 xs:w-5 sm:w-5.5 md:w-6 h-4 xs:h-5 sm:h-5.5 md:h-6 text-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Crear Partido</h1>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-2.5 xs:px-3 sm:px-4 md:px-5 py-2.5 xs:py-3 sm:py-4 pb-20 xs:pb-22 sm:pb-24 md:pb-28 overflow-y-auto max-w-2xl mx-auto w-full">
        {/* Success Message */}
        {success && (
          <div className="mb-3 xs:mb-4 sm:mb-5 md:mb-6 p-3 xs:p-4 sm:p-5 bg-primary/10 border-2 border-primary/30 rounded-xl sm:rounded-2xl flex items-start gap-2 xs:gap-3">
            <div className="w-5 xs:w-6 h-5 xs:h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 xs:w-3.5 h-3 xs:h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-primary text-xs xs:text-sm sm:text-base font-semibold">¡Partido creado!</p>
              <p className="text-primary/80 text-[11px] xs:text-xs sm:text-sm">Redirigiendo...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 xs:mb-5 sm:mb-6 p-3 xs:p-4 sm:p-5 bg-red-50 border-2 border-red-200 rounded-xl sm:rounded-2xl flex items-start gap-2 xs:gap-3">
            <AlertCircle className="w-4 xs:w-5 h-4 xs:h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-red-600 text-xs xs:text-sm sm:text-base font-semibold">Error</p>
              <p className="text-red-600 text-[11px] xs:text-xs sm:text-sm break-words">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700 min-w-[36px] xs:min-w-[40px] min-h-[36px] xs:min-h-[40px] flex items-center justify-center touch-manipulation active:scale-95 text-base xs:text-lg flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tipo de partido */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm xs:text-sm sm:text-base font-bold text-gray-900 mb-2 xs:mb-2.5">
            ⚽ Tipo de partido <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 xs:gap-3">
            {Object.values(TipoPartido).map((type) => {
              const config = {
                [TipoPartido.FUTBOL_5]: { label: 'Fútbol 5', players: '10 jugadores', emoji: '⚽' },
                [TipoPartido.FUTBOL_7]: { label: 'Fútbol 7', players: '14 jugadores', emoji: '🥅' },
                [TipoPartido.FUTBOL_8]: { label: 'Fútbol 8', players: '16 jugadores', emoji: '🏟️' },
                [TipoPartido.FUTBOL_9]: { label: 'Fútbol 9', players: '18 jugadores', emoji: '⚽' },
                [TipoPartido.FUTBOL_11]: { label: 'Fútbol 11', players: '22 jugadores', emoji: '🏆' },
              }[type]
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleInputChange("type", type)}
                  disabled={isLoading}
                  className={`p-2.5 xs:p-3 sm:p-3.5 md:p-4 rounded-lg xs:rounded-xl sm:rounded-2xl border-2 transition-all touch-manipulation disabled:opacity-50 active:scale-[0.97] text-left min-h-[52px] xs:min-h-[56px] sm:min-h-[64px] ${formData.type === type
                    ? "bg-gradient-to-br from-green-500 to-green-600 text-white border-green-600 shadow-lg"
                    : "bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:shadow-md"
                    }`}
                  aria-label={config.label}
                >
                  <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3">
                    <span className="text-lg xs:text-xl sm:text-2xl md:text-3xl flex-shrink-0">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] xs:text-xs sm:text-sm md:text-base font-bold truncate ${formData.type === type ? 'text-white' : 'text-gray-900'}`}>
                        {config.label}
                      </div>
                      <div className={`text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-medium mt-0.5 truncate ${formData.type === type ? 'text-green-100' : 'text-gray-500'}`}>
                        {config.players}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Género */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm xs:text-sm sm:text-base font-bold text-gray-900 mb-2 xs:mb-2.5">
            👤 Género <span className="text-red-500">*</span>
          </label>
          <div className="p-1 xs:p-1.5 bg-gray-100 rounded-xl xs:rounded-2xl flex gap-1 xs:gap-1.5">
            {[{label: "Mixto", icon: "👥"}, {label: "Hombres", icon: "👨"}, {label: "Mujeres", icon: "👩"}].map(({label, icon}) => (
              <button
                key={label}
                type="button"
                onClick={() => handleInputChange("gender", label)}
                disabled={isLoading}
                className={`flex-1 min-w-0 px-2 xs:px-2.5 sm:px-3 py-2.5 xs:py-3 sm:py-3.5 rounded-lg xs:rounded-xl text-xs xs:text-sm font-bold transition-all touch-manipulation disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5 xs:gap-2 min-h-[44px] xs:min-h-[48px] ${formData.gender === label
                  ? "bg-white text-orange-600 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
                aria-label={`Género ${label}`}
              >
                <span className="text-xs xs:text-sm sm:text-base flex-shrink-0">{icon}</span>
                <span className="text-[9px] xs:text-[10px] sm:text-xs font-bold truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm xs:text-sm sm:text-base font-bold text-gray-900 mb-2 xs:mb-2.5">
            📅 Fecha y hora <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 xs:gap-3">
            <div className="w-full">
              <div className="text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-600 mb-1 xs:mb-1.5 sm:mb-2">Fecha</div>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                min={today}
                max={maxDate}
                className={`px-2.5 xs:px-3 sm:px-4 h-10 xs:h-11 sm:h-12 text-[11px] xs:text-xs sm:text-sm font-medium rounded-lg xs:rounded-xl border-2 w-full ${fieldErrors.date ? 'border-red-500' : 'border-gray-200'} focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 shadow-sm hover:shadow-md transition-all bg-white`}
                required
                disabled={isLoading}
              />
              {fieldErrors.date && (
                <p className="text-[10px] xs:text-xs text-red-600 mt-1 xs:mt-1.5 flex items-center">
                  <AlertCircle className="w-3 xs:w-3.5 h-3 xs:h-3.5 mr-1 flex-shrink-0" />
                  <span className="break-words">{fieldErrors.date}</span>
                </p>
              )}
            </div>
            <div className="w-full">
              <div className="text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-600 mb-1 xs:mb-1.5 sm:mb-2">Hora</div>
              <select
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className={`w-full px-2.5 xs:px-3 sm:px-4 h-10 xs:h-11 sm:h-12 rounded-lg xs:rounded-xl border-2 ${fieldErrors.time ? 'border-red-500' : 'border-gray-200'} bg-white text-gray-900 text-[11px] xs:text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 shadow-sm hover:shadow-md transition-all cursor-pointer`}
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
              {fieldErrors.time && (
                <p className="text-[10px] xs:text-xs text-red-600 mt-1 xs:mt-1.5 flex items-center">
                  <AlertCircle className="w-3 xs:w-3.5 h-3 xs:h-3.5 mr-1 flex-shrink-0" />
                  <span className="break-words">{fieldErrors.time}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm xs:text-sm sm:text-base font-bold text-gray-900 mb-2 xs:mb-2.5">
            📍 Ubicación de la cancha <span className="text-red-500">*</span>
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
            <p className="text-[10px] xs:text-xs text-red-600 mt-1 xs:mt-1.5 flex items-center">
              <AlertCircle className="w-3 xs:w-3.5 h-3 xs:h-3.5 mr-1 flex-shrink-0" />
              <span className="break-words">{fieldErrors.location}</span>
            </p>
          )}
          {formData.location && !locationCoordinates && !fieldErrors.location && (
            <p className="text-[10px] xs:text-xs text-orange-600 mt-1 xs:mt-1.5 flex items-center">
              <AlertCircle className="w-3 xs:w-3.5 h-3 xs:h-3.5 mr-1 flex-shrink-0" />
              <span className="break-words">Ubicación aproximada (sin coordenadas exactas)</span>
            </p>
          )}
        </div>

        {/* Costo */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm xs:text-sm sm:text-base font-bold text-gray-900 mb-2 xs:mb-2.5">
            💰 Costo del partido <span className="text-red-500">*</span>
          </label>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg xs:rounded-xl sm:rounded-2xl p-2.5 xs:p-3 sm:p-4 border-2 border-gray-200">
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 mb-2 xs:mb-2.5 sm:mb-3">
              <span className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-700 flex-shrink-0">$</span>
              <Input
                type="number"
                min="0"
                max="1000000"
                step="10"
                value={formData.totalPrice}
                onChange={(e) => handleInputChange("totalPrice", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                placeholder="0"
                className={`flex-1 px-2.5 xs:px-3 sm:px-4 h-10 xs:h-11 sm:h-12 text-sm xs:text-base sm:text-lg font-bold rounded-lg xs:rounded-xl border-2 ${fieldErrors.totalPrice ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm bg-white`}
                required
                disabled={isLoading}
              />
              <span className="text-[10px] xs:text-xs sm:text-sm font-bold text-gray-500 flex-shrink-0">UYU</span>
            </div>
            {fieldErrors.totalPrice && (
              <p className="text-[10px] xs:text-xs text-red-600 mb-2 xs:mb-3 flex items-center">
                <AlertCircle className="w-3 xs:w-3.5 h-3 xs:h-3.5 mr-1 flex-shrink-0" />
                <span className="break-words">{fieldErrors.totalPrice}</span>
              </p>
            )}
            {formData.totalPrice > 0 ? (
              <div className="bg-green-500 text-white rounded-lg xs:rounded-xl p-2 xs:p-2.5 sm:p-3 text-center">
                <p className="text-[9px] xs:text-[10px] sm:text-xs font-semibold mb-0.5">Costo por jugador</p>
                <p className="text-lg xs:text-xl sm:text-2xl font-bold">${pricePerPlayer}</p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg xs:rounded-xl p-2 xs:p-2.5 sm:p-3 text-center">
                <p className="text-[11px] xs:text-xs sm:text-sm font-bold">🎉 Partido Gratuito</p>
              </div>
            )}
          </div>
        </div>

        {/* Duración */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm xs:text-sm sm:text-base font-bold text-gray-900 mb-2 xs:mb-2.5">
            ⏱️ Duración del partido <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5 xs:gap-2">
            {[60, 90, 120, 150].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleInputChange("duration", mins)}
                disabled={isLoading}
                className={`py-3 xs:py-3.5 rounded-lg xs:rounded-xl border-2 transition-all touch-manipulation disabled:opacity-50 active:scale-95 min-h-[48px] ${formData.duration === mins
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 shadow-lg font-bold"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:shadow-md font-medium"
                  }`}
              >
                <div className="text-xs xs:text-sm sm:text-base font-bold">{mins}&apos;</div>
              </button>
            ))}
          </div>
          {fieldErrors.duration && (
            <p className="text-[10px] xs:text-xs text-red-600 mt-1 xs:mt-1.5 flex items-center">
              <AlertCircle className="w-3 xs:w-3.5 h-3 xs:h-3.5 mr-1 flex-shrink-0" />
              <span className="break-words">{fieldErrors.duration}</span>
            </p>
          )}
        </div>

        {/* Descripción */}
        <div className="mb-5 xs:mb-6">
          <label className="block text-sm xs:text-sm sm:text-base font-bold text-gray-900 mb-2 xs:mb-2.5">
            📝 Descripción del partido <span className="text-red-500">*</span>
          </label>
          <Textarea
            placeholder="Describe la modalidad (ej: 2 tiempos de 30 min), superficie (césped, sintético), servicios (vestuarios, estacionamiento), nivel requerido, etc."
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className={`min-h-[120px] xs:min-h-[140px] py-3 xs:py-4 px-3 xs:px-4 rounded-xl xs:rounded-2xl resize-none text-sm xs:text-sm border-2 w-full ${fieldErrors.description ? 'border-red-500' : 'border-gray-200'} focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm hover:shadow-md transition-all bg-white font-medium leading-relaxed`}
            rows={5}
            disabled={isLoading}
            maxLength={500}
            required
          />
          {fieldErrors.description && (
            <p className="text-[10px] xs:text-xs text-red-600 mt-1 xs:mt-1.5 flex items-center">
              <AlertCircle className="w-3 xs:w-3.5 h-3 xs:h-3.5 mr-1 flex-shrink-0" />
              <span className="break-words">{fieldErrors.description}</span>
            </p>
          )}
          <div className="flex items-center justify-between mt-1.5 xs:mt-2 gap-2">
            <p className="text-[10px] xs:text-xs text-gray-500 font-medium">
              {formData.description.length}/500 caracteres
            </p>
            <p className="text-[10px] xs:text-xs text-gray-400">
              Mín. 10 caracteres
            </p>
          </div>

          {/* Disclaimer sobre reservas */}
          <div className="mt-2.5 xs:mt-3 sm:mt-4 p-2.5 xs:p-3 sm:p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-orange-200 rounded-lg xs:rounded-xl sm:rounded-2xl shadow-sm">
            <div className="flex items-start gap-2 xs:gap-2.5 sm:gap-3">
              <div className="w-6 xs:w-7 sm:w-8 h-6 xs:h-7 sm:h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-3.5 xs:w-4 sm:w-5 h-3.5 xs:h-4 sm:h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] xs:text-xs sm:text-sm font-bold text-orange-900 mb-0.5 xs:mb-1">⚠️ Importante</p>
                <p className="text-[10px] xs:text-[11px] sm:text-xs text-orange-800 leading-relaxed">
                  Falta Uno no gestiona reservas de canchas. Es tu responsabilidad como organizador coordinar y pagar la reserva.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pb-3 xs:pb-4 pt-2 xs:pt-3">
          <Button
            type="submit"
            disabled={
              isLoading ||
              success ||
              !formData.date ||
              !formData.time ||
              !formData.location
            }
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white h-11 xs:h-12 sm:h-14 text-sm xs:text-base sm:text-lg font-bold rounded-lg xs:rounded-xl sm:rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl touch-manipulation active:scale-[0.97] border-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="sm" variant="white" className="mr-2" />
                <span className="text-xs xs:text-sm sm:text-base">Creando...</span>
              </span>
            ) : success ? (
              <span className="flex items-center justify-center">
                <svg className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-xs xs:text-sm sm:text-base">¡Partido creado!</span>
              </span>
            ) : (
              <span>Crear Partido</span>
            )}
          </Button>
        </div>
      </form>

      <BottomNavigation />
    </div>
  )
}