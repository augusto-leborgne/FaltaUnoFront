/// <reference types="google.maps" />
"use client"

import React, { useEffect, useRef, useState } from "react"
import { googleMapsLoader } from "@/lib/google-maps-loader"
import { MapPin, X, Loader2 } from "lucide-react"
import { logger } from "@/lib/logger"

type Props = {
  value?: string
  onChange: (
    location: string,
    bounds?: google.maps.LatLngBounds | null,
    center?: { lat: number; lng: number } | null
  ) => void
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
}

export function LocalitySearch({
  value = "",
  onChange,
  placeholder = "Buscar barrio, ciudad o departamento...",
  disabled = false,
  hasError = false,
}: Props) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [isLoadingMaps, setIsLoadingMaps] = useState(true)
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isSelectingRef = useRef(false)

  // Sincronizar valor externo
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Cargar Google Maps
  useEffect(() => {
    let mounted = true

    const loadMaps = async () => {
      try {
        logger.log("[LocalitySearch] Iniciando carga de Google Maps...")
        
        await googleMapsLoader.load({ 
          libraries: ["places"],
          forceRetry: false 
        })
        
        if (!mounted) return

        if (window.google?.maps?.places) {
          logger.log("[LocalitySearch] Places API detectada")
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
          setIsLoadingMaps(false)
        } else {
          logger.error("[LocalitySearch] Places API NO disponible")
          setMapsError("Places API no disponible")
          setIsLoadingMaps(false)
        }
      } catch (error) {
        logger.error("[LocalitySearch] Error cargando Google Maps:", error)
        if (mounted) {
          setMapsError("Error al cargar Google Maps")
          setIsLoadingMaps(false)
        }
      }
    }

    loadMaps()

    return () => {
      mounted = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Buscar predicciones - Solo localidades (barrios, ciudades, departamentos)
  const fetchPredictions = async (input: string) => {
    if (!window.google?.maps?.importLibrary || !input.trim()) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    try {
      const { AutocompleteSuggestion } = await window.google.maps.importLibrary("places") as any
      
      // Solo localidades: barrios (sublocality), ciudades (locality), departamentos (administrative_area_level_1)
      const request: any = {
        input: input.trim(),
        includedPrimaryTypes: ['sublocality', 'locality', 'administrative_area_level_1'],
        includedRegionCodes: ['uy'], // Uruguay
        sessionToken: sessionTokenRef.current,
      }

      const response: any = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
      
      logger.log('[LocalitySearch] Response:', response)
      
      if (response?.suggestions && response.suggestions.length > 0) {
        // Convertir a formato compatible con AutocompletePrediction
        const predictions: any[] = response.suggestions.map((suggestion: any) => {
          const placePred = suggestion.placePrediction
          const mainText = placePred?.structuredFormat?.mainText?.text || placePred?.text?.text || ''
          const secondaryText = placePred?.structuredFormat?.secondaryText?.text || ''
          
          return {
            description: placePred?.text?.text || '',
            place_id: placePred?.placeId || '',
            matched_substrings: placePred?.text?.matches || [],
            structured_formatting: {
              main_text: mainText,
              main_text_matched_substrings: placePred?.structuredFormat?.mainText?.matches || [],
              secondary_text: secondaryText,
            },
            terms: [],
            types: placePred?.types || [],
          }
        })
        
        logger.log('[LocalitySearch] Predictions:', predictions)
        setSuggestions(predictions)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
      }
      
      setIsSearching(false)
    } catch (error) {
      logger.error("[LocalitySearch] Error buscando predicciones:", error)
      setSuggestions([])
      setIsSearching(false)
    }
  }

  // Debounce para búsqueda
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (newValue.trim().length < 2) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(newValue)
    }, 300)
  }

  // Seleccionar sugerencia
  const handleSelectSuggestion = async (prediction: google.maps.places.AutocompletePrediction) => {
    isSelectingRef.current = true
    setQuery(prediction.description || "")
    setSuggestions([])
    setShowSuggestions(false)

    try {
      // Obtener detalles del lugar para bounds
      const { Place } = await window.google.maps.importLibrary("places") as any
      const place = new Place({
        id: prediction.place_id,
      })

      await place.fetchFields({
        fields: ['viewport', 'location']
      })

      const bounds = place.viewport
      const center = place.location ? { lat: place.location.lat(), lng: place.location.lng() } : null

      // Crear nuevo session token para la próxima búsqueda
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()

      onChange(prediction.description || "", bounds, center)
    } catch (error) {
      logger.error("[LocalitySearch] Error obteniendo detalles:", error)
      onChange(prediction.description || "", null, null)
    }

    isSelectingRef.current = false
  }

  // Limpiar búsqueda
  const handleClear = () => {
    setQuery("")
    setSuggestions([])
    setShowSuggestions(false)
    onChange("", null, null)
    inputRef.current?.focus()
  }

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Mostrar loading
  if (isLoadingMaps) {
    return (
      <div className="w-full px-3 xs:px-4 py-2.5 xs:py-3 rounded-lg xs:rounded-xl border-2 border-gray-200 bg-gray-50 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-xs xs:text-sm text-gray-500">Cargando búsqueda...</span>
      </div>
    )
  }

  // Mostrar error
  if (mapsError) {
    return (
      <div className="w-full px-3 xs:px-4 py-2.5 xs:py-3 rounded-lg xs:rounded-xl border-2 border-red-200 bg-red-50 flex items-center gap-2">
        <span className="text-xs xs:text-sm text-red-600">{mapsError}</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 xs:left-4 top-1/2 -translate-y-1/2 w-4 xs:w-5 h-4 xs:h-5 text-gray-400 pointer-events-none z-10" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true)
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 xs:pl-11 pr-10 xs:pr-11 py-2.5 xs:py-3 rounded-lg xs:rounded-xl border-2 ${
            hasError ? 'border-red-500' : 'border-gray-200'
          } focus:border-green-500 focus:ring-2 focus:ring-green-200 text-xs xs:text-sm transition-all disabled:bg-gray-50 disabled:cursor-not-allowed`}
        />

        {isSearching && (
          <Loader2 className="absolute right-2 xs:right-2.5 top-1/2 -translate-y-1/2 w-4 xs:w-4.5 h-4 xs:h-4.5 animate-spin text-gray-400" />
        )}

        {query && !isSearching && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 xs:right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 touch-manipulation active:scale-95"
          >
            <X className="w-4 xs:w-4.5 h-4 xs:h-4.5" />
          </button>
        )}
      </div>

      {/* Sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg xs:rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-3 xs:px-4 py-2.5 xs:py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-start gap-2 border-b last:border-b-0 border-gray-100"
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs xs:text-sm text-gray-900 font-medium truncate">
                  {suggestion.structured_formatting?.main_text || suggestion.description}
                </p>
                {suggestion.structured_formatting?.secondary_text && (
                  <p className="text-[10px] xs:text-xs text-gray-500 truncate">
                    {suggestion.structured_formatting.secondary_text}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
