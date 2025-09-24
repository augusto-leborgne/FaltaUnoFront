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
          setTimeout(() => {
            setIsLoaded(true)
            setApiStatus("success")
            initializeAutocomplete()
          }, 100)
        }

        script.onerror = (e) => {
          console.error("Error loading Google Maps API:", e)
          setError("Error loading Google Maps API. Usando entrada manual como respaldo.")
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
          autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ["address"],
            componentRestrictions: { country: "uy" },
            fields: ["formatted_address", "geometry", "name", "place_id", "address_components"],
          })

          geocoderRef.current = new window.google.maps.Geocoder()

          autocompleteRef.current?.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace()
            if (place && place.formatted_address) {
              onChange(place.formatted_address, place)
              setError(null)
              setApiStatus("success")
            }
          })

          setFallbackMode(false)
          setApiStatus("success")
        } catch (err) {
          console.error("Places API initialization error:", err)
          setError("Error inicializando Google Places. Usando entrada manual.")
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
    onChange(e.target.value)
  }

  const handleInputBlur = () => {
    if (value && geocoderRef.current && value.length > 10) {
      geocoderRef.current.geocode(
        { address: value, componentRestrictions: { country: "UY" } },
        (results, status) => {
          if (status === "OK" && results && results[0]) {
            const location = results[0].geometry.location
            const mockPlaceResult: google.maps.places.PlaceResult = {
              formatted_address: results[0].formatted_address,
              geometry: {
                location,
                viewport: results[0].geometry.viewport,
              },
              place_id: results[0].place_id,
              name: results[0].formatted_address,
            }
            onChange(results[0].formatted_address || value, mockPlaceResult)
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
            <strong>Error Google Maps:</strong> {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

declare global {
  interface Window {
    initMap?: () => void
  }
}