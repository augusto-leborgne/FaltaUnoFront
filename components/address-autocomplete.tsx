"use client"

import type React from "react"
import type { google } from "google-maps"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, MapPin, CheckCircle } from "lucide-react"

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string, placeDetails?: google.maps.places.PlaceResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Ingresa una dirección",
  className = "",
  disabled = false,
  required = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallbackMode, setFallbackMode] = useState(false)
  const [apiStatus, setApiStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        setError("Google Maps API key not configured")
        setFallbackMode(true)
        setApiStatus("error")
        return
      }

      if (typeof window !== "undefined" && !window.google) {
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly&callback=initMap`
        script.async = true
        script.defer = true

        window.initMap = () => {
          console.log("[v0] Google Maps API loaded via callback")
          setTimeout(() => {
            setIsLoaded(true)
            setApiStatus("success")
            initializeAutocomplete()
          }, 100)
        }

        script.onload = () => {
          console.log("[v0] Google Maps script loaded")
        }

        script.onerror = (e) => {
          console.error("[v0] Error loading Google Maps API:", e)
          setError("Error loading Google Maps API. Please check your API key and network connection.")
          setFallbackMode(true)
          setApiStatus("error")
        }

        document.head.appendChild(script)
      } else if (window.google) {
        setIsLoaded(true)
        setApiStatus("success")
        initializeAutocomplete()
      }
    }

    const initializeAutocomplete = () => {
      if (inputRef.current && window.google && !autocompleteRef.current) {
        try {
          if (!window.google.maps) {
            throw new Error("Google Maps API not available")
          }

          if (!window.google.maps.places) {
            throw new Error("Places API not available - please enable Places API in Google Cloud Console")
          }

          if (!window.google.maps.places.Autocomplete) {
            throw new Error("Places Autocomplete service not available")
          }

          console.log("[v0] Initializing Places Autocomplete")

          autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ["address"],
            componentRestrictions: { country: "uy" },
            fields: ["formatted_address", "geometry", "name", "place_id", "address_components"],
          })

          geocoderRef.current = new window.google.maps.Geocoder()

          autocompleteRef.current.addListener("place_changed", () => {
            try {
              const place = autocompleteRef.current?.getPlace()
              console.log("[v0] Place selected:", place?.formatted_address)
              console.log("[v0] Place geometry:", place?.geometry)
              console.log("[v0] Place location:", place?.geometry?.location)
              if (place && place.formatted_address) {
                onChange(place.formatted_address, place)
                setError(null)
                setApiStatus("success")
              } else {
                console.log("[v0] Place selected but no formatted_address available")
              }
            } catch (err) {
              console.error("[v0] Error getting place details:", err)
              setError("Error retrieving place details. Using manual input.")
              setFallbackMode(true)
            }
          })

          setError(null)
          setFallbackMode(false)
          setApiStatus("success")
          console.log("[v0] Places Autocomplete initialized successfully")
        } catch (err) {
          console.error("[v0] Places API initialization error:", err)
          const errorMessage = err instanceof Error ? err.message : "Unknown error"

          if (errorMessage.includes("Places API")) {
            setError(
              "Places API not enabled. Please enable 'Places API' in Google Cloud Console and ensure it's associated with your API key.",
            )
          } else {
            setError(`Google Maps initialization error: ${errorMessage}`)
          }

          setFallbackMode(true)
          setApiStatus("error")
        }
      }
    }

    loadGoogleMaps()

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
      if (window.initMap) {
        delete window.initMap
      }
    }
  }, [onChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
  }

  const handleInputBlur = () => {
    console.log("[v0] Input blur - fallbackMode:", fallbackMode, "value:", value)
    if (value && geocoderRef.current && value.length > 10) {
      console.log("[v0] Attempting geocoding for:", value)
      geocoderRef.current.geocode(
        {
          address: value,
          componentRestrictions: { country: "UY" },
        },
        (results, status) => {
          console.log("[v0] Geocoding status:", status)
          console.log("[v0] Geocoding results:", results)
          if (status === "OK" && results && results[0]) {
            console.log("[v0] Geocoding successful:", results[0])
            const location = results[0].geometry.location
            const mockPlaceResult: google.maps.places.PlaceResult = {
              formatted_address: results[0].formatted_address,
              geometry: {
                location: location,
                viewport: results[0].geometry.viewport,
              },
              place_id: results[0].place_id,
              name: results[0].formatted_address,
            }
            onChange(results[0].formatted_address || value, mockPlaceResult)
          } else {
            console.log("[v0] Geocoding failed:", status)
          }
        },
      )
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={fallbackMode ? "Ingresa dirección manualmente" : placeholder}
          className={className}
          disabled={disabled}
          required={required}
        />
        {apiStatus === "success" && !fallbackMode && (
          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
        {fallbackMode && (
          <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Configuración de Google Maps requerida:</strong>
            <br />
            <strong>Paso 1:</strong> Ve a{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Google Cloud Console → Credenciales
            </a>
            <br />
            <strong>Paso 2:</strong> Edita tu clave API y en "Restricciones de API" selecciona "Restringir clave"
            <br />
            <strong>Paso 3:</strong> Habilita estas APIs:
            <br />• Maps JavaScript API ✓
            <br />• Places API ✓
            <br />• Geocoding API ✓
            <br />
            <strong>Paso 4:</strong> Guarda y espera 5 minutos para que los cambios surtan efecto
            <br />
            <em className="text-muted-foreground">
              Actualmente usando entrada manual con geocodificación como respaldo.
            </em>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

declare global {
  interface Window {
    google: typeof google
    initMap?: () => void
  }
}
